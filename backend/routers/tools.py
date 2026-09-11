# NEW
from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies.auth import require_admin

from backend.database.db import get_connection
from backend.models.tool import ToolCreate, ToolResponse, ToolUpdate
from backend.services.risk_engine import calculate_risk

router = APIRouter(prefix="/tools", tags=["Tools"])


@router.get("/", response_model=list[ToolResponse])
def get_all_tools():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.get("/{tool_id}", response_model=ToolResponse)
def get_tool(tool_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools WHERE id = ?", (tool_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Tool not found")
    return dict(row)


# OLD
@router.post("/", response_model=ToolResponse, status_code=201)
def create_tool(tool: ToolCreate):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO tools (id, name, description, risk_weight, requires_approval_above, data_sensitivity)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            tool.id,
            tool.name,
            tool.description,
            tool.risk_weight,
            tool.requires_approval_above,
            tool.data_sensitivity
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    cursor.execute("SELECT * FROM tools WHERE id = ?", (tool.id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


# NEW
@router.put("/{tool_id}", response_model=ToolResponse)
def update_tool(tool_id: str, update: ToolUpdate, _: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tools WHERE id = ?", (tool_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Tool not found")

    fields = {}
    if update.name is not None:
        fields["name"] = update.name
    if update.description is not None:
        fields["description"] = update.description
    if update.risk_weight is not None:
        fields["risk_weight"] = update.risk_weight
    if update.requires_approval_above is not None:
        fields["requires_approval_above"] = update.requires_approval_above
    if update.data_sensitivity is not None:
        fields["data_sensitivity"] = update.data_sensitivity

    if fields:
        set_clause = ", ".join([f"{k} = ?" for k in fields])
        values = list(fields.values())
        values.append(tool_id)
        cursor.execute(f"UPDATE tools SET {set_clause} WHERE id = ?", values)
        conn.commit()

    cursor.execute("SELECT * FROM tools WHERE id = ?", (tool_id,))
    row = cursor.fetchone()
    updated_tool = dict(row)

    risk_fields = {"risk_weight", "requires_approval_above", "data_sensitivity"}
    if fields and risk_fields.intersection(fields.keys()):
        assessment = calculate_risk(updated_tool, agent_id="system")
        cursor.execute("""
            INSERT INTO audit_log (agent_id, tool_name, action, parameters, risk_score, decision, reason, reviewed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "system",
            updated_tool["name"],
            "permission_change",
            None,
            assessment["risk_score"],
            "risk_recalculated",
            "; ".join(assessment["factors"]),
            None
        ))
        conn.commit()

    conn.close()
    return updated_tool


# NEW
@router.delete("/{tool_id}")
def delete_tool(tool_id: str, _: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tools WHERE id = ?", (tool_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Tool not found")

    cursor.execute("DELETE FROM tools WHERE id = ?", (tool_id,))
    conn.commit()
    conn.close()
    return {"message": f"Tool {tool_id} deleted"}