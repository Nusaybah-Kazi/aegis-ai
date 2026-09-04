
from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    agent_id: str
    tool_name: str
    action: str
    parameters: str | None = None   # JSON string
    risk_score: int | None = 0
    decision: str                       # 'approved', 'blocked', 'paused'
    reason: str | None = None
    reviewed_by: str | None = None


class AuditLogResponse(AuditLogEntry):
    id: int
    timestamp: str | None = None

    class Config:
        from_attributes = True