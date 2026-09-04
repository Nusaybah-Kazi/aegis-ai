
from fastapi import APIRouter, HTTPException, Query

from backend.database.db import get_connection
from backend.models.audit_log import AuditLogEntry, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    agent_id: str | None = Query(None),
    decision: str | None = Query(None),
    limit: int = Query(50, le=200)
):
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM audit_log WHERE 1=1"
    params = []

    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    if decision:
        query += " AND decision = ?"
        params.append(decision)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.get("/{log_id}", response_model=AuditLogResponse)
def get_audit_log(log_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_log WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Log entry not found")
    return dict(row)


@router.post("/", response_model=AuditLogResponse, status_code=201)
def create_audit_log(entry: AuditLogEntry):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO audit_log (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.agent_id,
        entry.tool_name,
        entry.action,
        entry.parameters,
        entry.risk_score,
        entry.decision,
        entry.reason,
        entry.reviewed_by
    ))
    conn.commit()

    log_id = cursor.lastrowid
    cursor.execute("SELECT * FROM audit_log WHERE id = ?", (log_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


@router.delete("/clear")
def clear_audit_logs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM audit_log")
    conn.commit()
    conn.close()
    return {"message": "Audit log cleared"}