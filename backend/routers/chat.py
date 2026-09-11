# backend/routers/chat.py
"""
chat.py (router)
------------------
Employee-facing AI chat — two flavors:

  POST /chat/internal  — employee talks to Aegis's own Groq-backed assistant.
                          Safe messages that turn out to be REAL TOOL REQUESTS
                          (e.g. "process a refund of 50000") are routed through
                          the same risk_engine + policy_checker used by the
                          Runtime Gateway, so they can come back approved,
                          paused for human review, or blocked — instead of
                          just being answered as chat.
  POST /chat/external  — employee's prompt is proxied to a selected "external"
                          AI provider (simulated via distinct Groq-hosted
                          models, to avoid other vendors' paid APIs or tight
                          free-tier limits). Pure LLM proxy — never triggers
                          tool actions.
  GET  /chat/history    — employee's own past messages (answered, blocked,
                          or pending admin review)

Every prompt is scanned by sensitivity_scanner.scan_prompt() BEFORE it goes
anywhere:
  - safe        → answered immediately (or routed to tool-call flow, /internal only)
  - unsafe      → blocked, never leaves Aegis
  - borderline  → queued in approval_queue for an admin to review;
                  approving it (in gateway.py) completes the request and
                  the answer appears here on next chat load.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.database.db import get_connection
from backend.dependencies.auth import get_current_user
from backend.services.groq_client import chat as groq_chat
from backend.services.intent_parser import parse_intent
from backend.services.policy_checker import check_policies
from backend.services.risk_engine import calculate_risk
from backend.services.sensitivity_scanner import scan_prompt

router = APIRouter(prefix="/chat", tags=["Employee Chat"])

INTERNAL_SYSTEM_PROMPT = """You are Aegis AI's internal assistant, helping an employee
with general work questions. Be concise and helpful."""


class ChatRequest(BaseModel):
    message: str


class ExternalChatRequest(BaseModel):
    message: str
    provider: str = "gpt-oss-fast"   # 'gpt-oss-fast', 'gpt-oss-reasoning', 'qwen' — all Groq-hosted, no external vendor keys


# All three are confirmed active on Groq's production model list as of Sep 2026.
# llama-3.1-8b-instant and llama-3.3-70b-versatile were deprecated Aug 16, 2026 —
# do not use them.
PROVIDER_MODELS = {
    "gpt-oss-fast": "openai/gpt-oss-20b",
    "gpt-oss-reasoning": "openai/gpt-oss-120b",
    "qwen": "qwen/qwen3.6-27b",
}


def _write_audit_log(cursor, user_id, agent_id, tool_name, action, parameters, risk_score, decision, reason):
    cursor.execute("""
        INSERT INTO audit_log (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (agent_id, tool_name, action, parameters, risk_score, decision, reason, None, user_id))


def _queue_for_approval(cursor, user_id, tool_name, parameters, risk_score, reason):
    cursor.execute("""
        INSERT INTO approval_queue (agent_id, tool_name, action, parameters, risk_score, reason, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    """, ("employee-chat", tool_name, "chat", parameters, risk_score, reason, user_id))
    return cursor.lastrowid


def _call_external_ai(prompt: str, provider: str) -> str:
    """
    Simulates an external AI provider using a distinct Groq-hosted model per
    provider choice. This preserves the security-boundary concept (a separate
    provider call, gated by the scanner) while avoiding other vendors' paid
    APIs or tight free-tier limits. All three model IDs are confirmed active
    on Groq's production model list.
    """
    model_id = PROVIDER_MODELS[provider]
    return groq_chat(
        system_prompt="You are an external AI assistant. Answer helpfully and concisely.",
        user_message=prompt,
        model=model_id,
        max_tokens=800,
    )


def _handle_tool_call(cursor, user_id, tool_name, parameters, message):
    """
    Runs a detected tool-call intent through the same risk_engine +
    policy_checker logic used by /gateway/evaluate, and writes the
    matching audit log / approval_queue entries.

    Returns the dict to send back to the frontend.
    """
    cursor.execute("SELECT * FROM tools WHERE name = ?", (tool_name,))
    row = cursor.fetchone()

    if row is None:
        # Shouldn't happen — intent_parser already validates against the
        # tool catalog — but fail closed just in case.
        params_json = json.dumps({"message": message, "parameters": parameters})
        _write_audit_log(
            cursor, user_id, "employee-chat", tool_name, "chat",
            params_json, 0, "blocked", f"Tool '{tool_name}' not found in catalog"
        )
        return {
            "status": "blocked",
            "reason": f"Tool '{tool_name}' not found in catalog",
        }

    tool = dict(row)
    amount = parameters.get("amount")
    params_json = json.dumps({"message": message, "parameters": parameters})

    policy_result = check_policies(
        tool_name=tool_name,
        tool_data_sensitivity=tool.get("data_sensitivity", "low"),
        amount=amount,
    )
    assessment = calculate_risk(tool, agent_id="employee-chat", amount=amount)
    recommendation = assessment["recommendation"]

    risk_reason = "; ".join(assessment["factors"])
    all_reasons = []
    if not policy_result.passed:
        all_reasons.append(f"[POLICY] {policy_result.reason}")
    all_reasons.append(f"[RISK] {risk_reason}")
    combined_reason = " | ".join(all_reasons)

    if not policy_result.passed and policy_result.action == "block":
        decision = "blocked"
    elif not policy_result.passed and policy_result.action == "pause":
        decision = "blocked" if recommendation == "block" else "paused"
    elif recommendation in ("approve", "warn"):
        decision = "approved"
    elif recommendation == "pause":
        decision = "paused"
    else:
        decision = "blocked"

    if decision == "approved":
        _write_audit_log(
            cursor, user_id, "employee-chat", tool_name, "chat",
            params_json, assessment["risk_score"], decision, combined_reason
        )
        return {
            "status": "answered",
            "answer": f"Your request was approved and processed. ({combined_reason})",
        }

    if decision == "paused":
        queue_id = _queue_for_approval(
            cursor, user_id, tool_name, params_json, assessment["risk_score"], combined_reason
        )
        _write_audit_log(
            cursor, user_id, "employee-chat", tool_name, "chat",
            params_json, assessment["risk_score"], decision, combined_reason
        )
        return {
            "status": "paused",
            "queue_id": queue_id,
            "reason": combined_reason,
        }

    # blocked
    _write_audit_log(
        cursor, user_id, "employee-chat", tool_name, "chat",
        params_json, assessment["risk_score"], decision, combined_reason
    )
    return {
        "status": "blocked",
        "reason": combined_reason,
    }


@router.post("/internal")
def chat_internal(payload: ChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    message = payload.message.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    verdict = scan_prompt(message)
    params_json = json.dumps({"message": message})

    conn = get_connection()
    cursor = conn.cursor()

    if verdict["risk_level"] == "unsafe":
        _write_audit_log(
            cursor, user_id, "employee-chat", "internal_ai", "chat",
            params_json, 80, "blocked", verdict["reason"]
        )
        conn.commit()
        conn.close()
        return {
            "status": "blocked",
            "reason": verdict["reason"],
            "findings": verdict["findings"],
        }

    if verdict["risk_level"] == "borderline":
        queue_id = _queue_for_approval(
            cursor, user_id, "internal_ai", params_json, 50, verdict["reason"]
        )
        _write_audit_log(
            cursor, user_id, "employee-chat", "internal_ai", "chat",
            params_json, 50, "paused", verdict["reason"]
        )
        conn.commit()
        conn.close()
        return {
            "status": "paused",
            "queue_id": queue_id,
            "reason": verdict["reason"],
        }

    # safe — check if this is actually a tool-call request before answering as chat
    intent = parse_intent(message)

    if intent["is_tool_call"]:
        result = _handle_tool_call(
            cursor, user_id, intent["tool_name"], intent["parameters"], message
        )
        conn.commit()
        conn.close()
        return result

    # not a tool call — answer as normal chat
    answer = groq_chat(system_prompt=INTERNAL_SYSTEM_PROMPT, user_message=message, max_tokens=800)

    _write_audit_log(
        cursor, user_id, "employee-chat", "internal_ai", "chat",
        params_json, 5, "approved", "Scanned clean; answered directly."
    )
    conn.commit()
    conn.close()

    return {"status": "answered", "answer": answer}


@router.post("/external")
def chat_external(payload: ExternalChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    message = payload.message.strip()
    provider = payload.provider.lower()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    verdict = scan_prompt(message)
    params_json = json.dumps({"message": message, "provider": provider})

    conn = get_connection()
    cursor = conn.cursor()

    if verdict["risk_level"] == "unsafe":
        _write_audit_log(
            cursor, user_id, "employee-chat", "external_ai", "chat",
            params_json, 90, "blocked", verdict["reason"]
        )
        conn.commit()
        conn.close()
        return {
            "status": "blocked",
            "reason": verdict["reason"],
            "findings": verdict["findings"],
        }

    if verdict["risk_level"] == "borderline":
        queue_id = _queue_for_approval(
            cursor, user_id, "external_ai", params_json, 60, verdict["reason"]
        )
        _write_audit_log(
            cursor, user_id, "employee-chat", "external_ai", "chat",
            params_json, 60, "paused", verdict["reason"]
        )
        conn.commit()
        conn.close()
        return {
            "status": "paused",
            "queue_id": queue_id,
            "reason": verdict["reason"],
        }

    # safe — proxy to the selected provider (all Groq-hosted, no paid vendor keys)
    if provider in PROVIDER_MODELS:
        answer = _call_external_ai(message, provider)
    else:
        conn.close()
        return {
            "status": "unavailable",
            "reason": f"Provider '{provider}' is not recognized.",
        }

    _write_audit_log(
        cursor, user_id, "employee-chat", "external_ai", "chat",
        params_json, 10, "approved", f"Scanned clean; proxied to {provider}."
    )
    conn.commit()
    conn.close()

    return {"status": "answered", "answer": answer, "provider": provider}


@router.get("/history")
def chat_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM audit_log
        WHERE user_id = ? AND tool_name IN ('internal_ai', 'external_ai', 'process_refund', 'query_order', 'send_notification', 'query_faq', 'create_ticket', 'query_inventory', 'update_inventory', 'send_alert')
        ORDER BY timestamp ASC
    """, (user_id,))
    audit_rows = [dict(row) for row in cursor.fetchall()]

    cursor.execute("""
        SELECT * FROM approval_queue
        WHERE user_id = ? AND tool_name IN ('internal_ai', 'external_ai', 'process_refund', 'query_order', 'send_notification', 'query_faq', 'create_ticket', 'query_inventory', 'update_inventory', 'send_alert')
        ORDER BY created_at ASC
    """, (user_id,))
    queue_rows = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {"audit_log": audit_rows, "approval_queue": queue_rows}