# backend/routers/chat.py
"""
chat.py (router)
------------------
Employee-facing AI chat — two flavors:

  POST /chat/internal  — employee talks to Aegis's own Groq-backed assistant
  POST /chat/external  — employee's prompt is proxied to a selected "external"
                          AI provider (simulated via distinct Groq-hosted
                          models, to avoid other vendors' paid APIs or tight
                          free-tier limits)
  GET  /chat/history    — employee's own past messages (answered, blocked,
                          or pending admin review)

Every prompt is scanned by sensitivity_scanner.scan_prompt() BEFORE it goes
anywhere:
  - safe        → answered immediately
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

    # safe — answer immediately
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
        WHERE user_id = ? AND tool_name IN ('internal_ai', 'external_ai')
        ORDER BY timestamp ASC
    """, (user_id,))
    audit_rows = [dict(row) for row in cursor.fetchall()]

    cursor.execute("""
        SELECT * FROM approval_queue
        WHERE user_id = ? AND tool_name IN ('internal_ai', 'external_ai')
        ORDER BY created_at ASC
    """, (user_id,))
    queue_rows = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return {"audit_log": audit_rows, "approval_queue": queue_rows}