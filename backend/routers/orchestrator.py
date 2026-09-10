"""
orchestrator.py (router)
--------------------------
Exposes the Governance Orchestrator as a single HTTP endpoint.

Thin wrapper only — all dispatch logic lives in
backend/agents/orchestrator.py. This router just translates an HTTP
request into a run_task() call and turns ValueError into a 400.
"""

from fastapi import APIRouter, HTTPException

from backend.agents.orchestrator import run_task
from backend.models.orchestrator import OrchestratorRequest, OrchestratorResponse

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


@router.post("/run", response_model=OrchestratorResponse)
def run(payload: OrchestratorRequest):
    params = payload.params or {}
    try:
        output = run_task(payload.task, **params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return output