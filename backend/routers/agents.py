import json

# NEW
from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies.auth import require_admin

from backend.database.db import get_connection
from backend.models.agent import AgentCreate, AgentResponse, AgentUpdate

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("/", response_model=list[AgentResponse])
def get_all_agents():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents")
    rows = cursor.fetchall()
    conn.close()

    agents = []
    for row in rows:
        agent = dict(row)
        agent["tools"] = json.loads(agent["tools"]) if agent["tools"] else []
        agents.append(agent)
    return agents


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = dict(row)
    agent["tools"] = json.loads(agent["tools"]) if agent["tools"] else []
    return agent


# NEW
@router.post("/", response_model=AgentResponse, status_code=201)
def create_agent(agent: AgentCreate, _: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO agents (id, name, description, model, status, tools, risk_score, owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            agent.id,
            agent.name,
            agent.description,
            agent.model,
            agent.status,
            json.dumps(agent.tools),
            agent.risk_score,
            agent.owner
        ))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent.id,))
    row = cursor.fetchone()
    conn.close()

    result = dict(row)
    result["tools"] = json.loads(result["tools"]) if result["tools"] else []
    return result


# NEW
@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, update: AgentUpdate, _: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Agent not found")

    fields = {}
    if update.name is not None:
        fields["name"] = update.name
    if update.description is not None:
        fields["description"] = update.description
    if update.status is not None:
        fields["status"] = update.status
    if update.tools is not None:
        fields["tools"] = json.dumps(update.tools)
    if update.risk_score is not None:
        fields["risk_score"] = update.risk_score
    if update.owner is not None:
        fields["owner"] = update.owner

    if fields:
        fields["updated_at"] = "CURRENT_TIMESTAMP"
        set_clause = ", ".join([f"{k} = ?" for k in fields if k != "updated_at"])
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
        values = [v for k, v in fields.items() if k != "updated_at"]
        values.append(agent_id)
        cursor.execute(f"UPDATE agents SET {set_clause} WHERE id = ?", values)
        conn.commit()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    row = cursor.fetchone()
    conn.close()

    result = dict(row)
    result["tools"] = json.loads(result["tools"]) if result["tools"] else []
    return result


# NEW
@router.delete("/{agent_id}")
def delete_agent(agent_id: str, _: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Agent not found")

    cursor.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
    conn.commit()
    conn.close()
    return {"message": f"Agent {agent_id} deleted"}