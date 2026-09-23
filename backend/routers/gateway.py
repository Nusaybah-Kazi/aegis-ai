"""
gateway.py (router)
--------------------
Runtime Security Gateway — Phase 5 update.

Flow for every tool call:
  1. Look up the tool in the DB
  2. Parse parameters (amount etc.)
  3. Policy check — does any org rule prohibit or restrict this? (Phase 5)
  4. Risk score — how dangerous numerically?
  5. Final decision = strictest of (policy verdict, risk recommendation)
  6. Log to audit trail / approval queue

Decision matrix:
  policy blocked               → blocked  (hard stop, no override)
  policy paused                → paused   (even if risk says approve)
  risk blocked                 → blocked
  risk paused                  → paused
  policy warned / risk warned  → approved (logged with warning in reason)
  all clear                    → approved
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from backend.database.db import get_connection
from backend.dependencies.auth import get_current_user_optional, require_admin
from backend.models.gateway import (
    ApprovalQueueResponse,
    GatewayEvaluateRequest,
    GatewayEvaluateResponse,
    GatewayReviewRequest,
)
from backend.services.groq_client import chat as groq_chat
from backend.services.policy_checker import check_policies
from backend.services.risk_engine import calculate_risk

router = APIRouter(prefix="/gateway", tags=["Runtime Gateway"])

CHAT_TOOL_NAMES = {"internal_ai", "external_ai"}

INTERNAL_SYSTEM_PROMPT = """You are Aegis AI's internal assistant, helping an employee
with general work questions. Be concise and helpful."""


def _complete_chat_request(tool_name: str, parameters_json: str) -> str:
    try:
        params = json.loads(parameters_json) if parameters_json else {}
    except json.JSONDecodeError:
        return "Error: could not read the original message."

    message = params.get("message", "")
    if not message:
        return "Error: original message was empty."

    if tool_name == "internal_ai":
        return groq_chat(system_prompt=INTERNAL_SYSTEM_PROMPT, user_message=message, max_tokens=800)
    else:
        return groq_chat(
            system_prompt="You are an external AI assistant. Answer helpfully and concisely.",
            user_message=message,
            model="llama-3.1-8b-instant",
            max_tokens=800,
        )


def _write_audit_log(cursor, agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by=None, user_id=None):
    cursor.execute("""
        INSERT INTO audit_log (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by, user_id))


@router.post("/evaluate", response_model=GatewayEvaluateResponse)
def evaluate(payload: GatewayEvaluateRequest, current_user: dict = Depends(get_current_user_optional)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tools WHERE name = ?", (payload.tool_name,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Tool '{payload.tool_name}' not found")

    tool = dict(row)

    amount = None
    if payload.parameters:
        try:
            params = json.loads(payload.parameters)
            amount = params.get("amount")
        except json.JSONDecodeError:
            conn.close()
            raise HTTPException(status_code=400, detail="parameters must be valid JSON")

    policy_result = check_policies(
        tool_name=payload.tool_name,
        tool_data_sensitivity=tool.get("data_sensitivity", "low"),
        amount=amount,
    )

    assessment = calculate_risk(tool, agent_id=payload.agent_id, amount=amount)
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
        if recommendation == "block":
            decision = "blocked"
        else:
            decision = "paused"
    elif recommendation in ("approve", "warn"):
        decision = "approved"
    elif recommendation == "pause":
        decision = "paused"
    else:
        decision = "blocked"

    queue_id = None
    user_id = current_user["id"] if current_user else None

    if decision == "approved":
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason,
            user_id=user_id
        )

    elif decision == "paused":
        cursor.execute("""
            INSERT INTO approval_queue (agent_id, tool_name, action, parameters, risk_score, reason, status, user_id)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        """, (
            payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], combined_reason, user_id
        ))
        queue_id = cursor.lastrowid
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason,
            user_id=user_id
        )

    else:
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason,
            user_id=user_id
        )

    conn.commit()
    conn.close()

    return GatewayEvaluateResponse(
        agent_id=payload.agent_id,
        tool_name=payload.tool_name,
        risk_score=assessment["risk_score"],
        risk_level=assessment["risk_level"],
        factors=assessment["factors"],
        decision=decision,
        reason=combined_reason,
        queue_id=queue_id,
    )


# ── Approval queue ────────────────────────────────────────────────────────────

@router.get("/queue")
def get_queue(status: str | None = None):
    """
    Returns approval queue items enriched with the requesting user's
    name and email so the admin UI can show who triggered each request
    without a separate API call.
    """
    conn = get_connection()
    cursor = conn.cursor()

    base_query = """
        SELECT
            aq.*,
            u.name  AS user_name,
            u.email AS user_email
        FROM approval_queue aq
        LEFT JOIN users u ON aq.user_id = u.id
        {where}
        ORDER BY aq.created_at DESC
    """

    if status:
        cursor.execute(base_query.format(where="WHERE aq.status = ?"), (status,))
    else:
        cursor.execute(base_query.format(where=""))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.post("/approve/{queue_id}", response_model=ApprovalQueueResponse)
def approve(queue_id: int, payload: GatewayReviewRequest, _: dict = Depends(require_admin)):
    return _resolve(queue_id, "approved", payload)


@router.post("/deny/{queue_id}", response_model=ApprovalQueueResponse)
def deny(queue_id: int, payload: GatewayReviewRequest, _: dict = Depends(require_admin)):
    return _resolve(queue_id, "denied", payload)


def _resolve(queue_id: int, new_status: str, payload: GatewayReviewRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM approval_queue WHERE id = ?", (queue_id,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Queue item not found")

    item = dict(row)
    if item["status"] != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Queue item already {item['status']}")

    now = datetime.now(timezone.utc).isoformat()

    response_text = None
    if new_status == "approved" and item["tool_name"] in CHAT_TOOL_NAMES:
        response_text = _complete_chat_request(item["tool_name"], item["parameters"])

    cursor.execute("""
        UPDATE approval_queue
        SET status = ?, reviewed_by = ?, reviewed_at = ?, response = ?
        WHERE id = ?
    """, (new_status, payload.reviewed_by, now, response_text, queue_id))

    audit_reason = payload.reason or f"Human review: {new_status}"
    if response_text:
        audit_reason += " | AI response generated."

    _write_audit_log(
        cursor, item["agent_id"], item["tool_name"], item["action"],
        item["parameters"], item["risk_score"], new_status,
        audit_reason, payload.reviewed_by, item.get("user_id")
    )

    conn.commit()
    cursor.execute("SELECT * FROM approval_queue WHERE id = ?", (queue_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)