from typing import Any

from pydantic import BaseModel


class OrchestratorRequest(BaseModel):
    task: str                          # e.g. "run_discovery", "evaluate_tool_call"
    params: dict[str, Any] | None = None  # kwargs passed through to the agent function


class OrchestratorResponse(BaseModel):
    task: str
    timestamp: str
    result: dict[str, Any]