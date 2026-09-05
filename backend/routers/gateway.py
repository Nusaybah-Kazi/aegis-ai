"""
gateway.py (router)
--------------------
Runtime Security Gateway — Phase 4.

Every agent tool call is evaluated here BEFORE it executes.
Uses risk_engine.py directly (no policy-table cross-check yet —
that's Phase 5's job). Three possible decisions:

  - approved: risk is low/medium and no threshold exceeded -> logged, allowed to run
  - paused:   risk_engine recommends 'pause' (high risk or threshold exceeded)
              -> written to approval_queue, waits for a human
  - blocked:  risk_engine recommends 'block' (high risk, no threshold override)
              -> logged as blocked, never runs
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from backend.database.db import get_connection
from backend.models.gateway import (
    ApprovalQueueResponse,
    GatewayEvaluateRequest,
    GatewayEvaluateResponse,
    GatewayReviewRequest,
)
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

    assessment = calculate_risk(tool, agent_id=payload.agent_id, amount=amount)
    recommendation = assessment["recommendation"]  # 'approve', 'warn', 'pause', 'block'
    reason = "; ".join(assessment["factors"])

    queue_id = None

    if recommendation in ("approve", "warn"):
        decision = "approved"
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, reason
        )

    elif recommendation == "pause":
        decision = "paused"
        cursor.execute("""
            INSERT INTO approval_queue (agent_id, tool_name, action, parameters, risk_score, reason, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
        """, (
            payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], reason
        ))
        queue_id = cursor.lastrowid
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, reason
        )

    else:  # 'block'
        decision = "blocked"
        _write_audit_log(
            cursor, payload.agent_id, payload.tool_name, payload.action,
            payload.parameters, assessment["risk_score"], decision, reason
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
        reason=reason,
        queue_id=queue_id,
    )


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


@router.post("/approve/{queue_id}", response_model=ApprovalQueueResponse)
def approve(queue_id: int, payload: GatewayReviewRequest):
    return _resolve(queue_id, "approved", payload)


@router.post("/deny/{queue_id}", response_model=ApprovalQueueResponse)
def deny(queue_id: int, payload: GatewayReviewRequest):
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