"""
gateway.py (router)
--------------------
Runtime Security Gateway — Phase 5 update.

Flow for every tool call:
  1. Look up the tool in the DB
  2. Parse parameters (amount etc.)
  3. Policy check — does any org rule prohibit or restrict this? (NEW in Phase 5)
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

# NEW
from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies.auth import require_admin

from backend.database.db import get_connection
from backend.models.gateway import (
    ApprovalQueueResponse,
    GatewayEvaluateRequest,
    GatewayEvaluateResponse,
    GatewayReviewRequest,
)
from backend.services.policy_checker import check_policies  # ← NEW
from backend.services.risk_engine import calculate_risk

router = APIRouter(prefix="/gateway", tags=["Runtime Gateway"])


def _write_audit_log(cursor, agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by=None):
    cursor.execute("""
        INSERT INTO audit_log (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by))


@router.post("/evaluate", response_model=GatewayEvaluateResponse)
def evaluate(payload: GatewayEvaluateRequest):
    conn = get_connection()
    cursor = conn.cursor()

    # ── 1. Look up tool ──────────────────────────────────────────────────────
    cursor.execute("SELECT * FROM tools WHERE name = ?", (payload.tool_name,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Tool '{payload.tool_name}' not found")

    tool = dict(row)

    # ── 2. Parse parameters ──────────────────────────────────────────────────
    amount = None
    if payload.parameters:
        try:
            params = json.loads(payload.parameters)
            amount = params.get("amount")
        except json.JSONDecodeError:
            conn.close()
            raise HTTPException(status_code=400, detail="parameters must be valid JSON")

    # ── 3. Policy check (NEW — Phase 5) ─────────────────────────────────────
    policy_result = check_policies(
        tool_name=payload.tool_name,
        tool_data_sensitivity=tool.get("data_sensitivity", "low"),
        amount=amount,
    )

    # ── 4. Risk scoring ──────────────────────────────────────────────────────
    assessment = calculate_risk(tool, agent_id=payload.agent_id, amount=amount)
    recommendation = assessment["recommendation"]  # 'approve', 'warn', 'pause', 'block'

    # ── 5. Combine policy verdict + risk recommendation ──────────────────────
    # Build a unified reason string
    risk_reason = "; ".join(assessment["factors"])
    all_reasons = []

    if not policy_result.passed:
        all_reasons.append(f"[POLICY] {policy_result.reason}")

    all_reasons.append(f"[RISK] {risk_reason}")
    combined_reason = " | ".join(all_reasons)

    # Determine final decision — policy can only make things stricter, never looser
    if not policy_result.passed and policy_result.action == "block":
        decision = "blocked"
    elif not policy_result.passed and policy_result.action == "pause":
        # Policy says pause — override approve/warn, but block still wins
        if recommendation == "block":
            decision = "blocked"
        else:
            decision = "paused"
    elif recommendation in ("approve", "warn"):
        decision = "approved"
    elif recommendation == "pause":
        decision = "paused"
    else:  # block
        decision = "blocked"

    # ── 6. Execute decision ──────────────────────────────────────────────────
    queue_id = None

    if decision == "approved":
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason
        )

    elif decision == "paused":
        cursor.execute("""
            INSERT INTO approval_queue (agent_id, tool_name, action, parameters, risk_score, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        """, (
            payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], combined_reason
        ))
        queue_id = cursor.lastrowid
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason
        )

    else:  # blocked
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, combined_reason
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


# ── Approval queue endpoints (unchanged from Phase 4) ────────────────────────

@router.get("/queue", response_model=list[ApprovalQueueResponse])
def get_queue(status: str | None = None):
    conn = get_connection()
    cursor = conn.cursor()

    if status:
        cursor.execute("SELECT * FROM approval_queue WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        cursor.execute("SELECT * FROM approval_queue ORDER BY created_at DESC")

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# NEW
@router.post("/approve/{queue_id}", response_model=ApprovalQueueResponse)
def approve(queue_id: int, payload: GatewayReviewRequest, _: dict = Depends(require_admin)):
    return _resolve(queue_id, "approved", payload)


# NEW
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
    cursor.execute("""
        UPDATE approval_queue
        SET status = ?, reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
    """, (new_status, payload.reviewed_by, now, queue_id))

    _write_audit_log(
        cursor, item["agent_id"], item["tool_name"], item["action"],
        item["parameters"], item["risk_score"], new_status,
        payload.reason or f"Human review: {new_status}", payload.reviewed_by
    )

    conn.commit()
    cursor.execute("SELECT * FROM approval_queue WHERE id = ?", (queue_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)