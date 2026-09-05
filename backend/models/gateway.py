from pydantic import BaseModel


class GatewayEvaluateRequest(BaseModel):
    agent_id: str
    tool_name: str
    action: str
    parameters: str | None = None    # JSON string, e.g. '{"amount": 25000}'


class GatewayEvaluateResponse(BaseModel):
    agent_id: str
    tool_name: str
    risk_score: int
    risk_level: str                  # 'low', 'medium', 'high'
    factors: list[str]
    decision: str                    # 'approved', 'blocked', 'paused'
    reason: str
    queue_id: int | None = None      # set only when decision == 'paused'


class GatewayReviewRequest(BaseModel):
    reviewed_by: str
    reason: str | None = None


class ApprovalQueueResponse(BaseModel):
    id: int
    agent_id: str
    tool_name: str
    action: str
    parameters: str | None = None
    risk_score: int | None = None
    reason: str | None = None
    status: str                      # 'pending', 'approved', 'denied'
    reviewed_by: str | None = None
    created_at: str | None = None
    reviewed_at: str | None = None

    class Config:
        from_attributes = True