
from pydantic import BaseModel


class RiskAssessment(BaseModel):
    agent_id: str
    tool_name: str
    action: str
    parameters: str | None = None    # JSON string


class RiskResponse(BaseModel):
    agent_id: str
    tool_name: str
    risk_score: int
    risk_level: str                     # 'low', 'medium', 'high'
    factors: list[str]                  # reasons contributing to score
    recommendation: str                 # 'approve', 'warn', 'pause', 'block'