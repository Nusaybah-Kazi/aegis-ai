"""
risk.py (router)
------------------
Exposes risk scoring as an API endpoint.
"""

import json

from fastapi import APIRouter, HTTPException

from backend.database.db import get_connection
from backend.models.risk import RiskAssessment, RiskResponse
from backend.services.risk_engine import calculate_risk

router = APIRouter(prefix="/risk", tags=["Risk"])


@router.post("/calculate", response_model=RiskResponse)
def calculate(payload: RiskAssessment):
    db = get_connection()
    row = db.execute(
        "SELECT * FROM tools WHERE name = ?", (payload.tool_name,)
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404, detail=f"Tool '{payload.tool_name}' not found"
        )

    tool = dict(row)

    amount = None
    if payload.parameters:
        try:
            params = json.loads(payload.parameters)
            amount = params.get("amount")
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, detail="parameters must be valid JSON"
            )

    result = calculate_risk(tool, agent_id=payload.agent_id, amount=amount)
    return result