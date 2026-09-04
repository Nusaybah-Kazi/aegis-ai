from pydantic import BaseModel
from typing import Optional


class AuditLogEntry(BaseModel):
    agent_id: str
    tool_name: str
    action: str
    parameters: Optional[str] = None   # JSON string
    risk_score: Optional[int] = 0
    decision: str                       # 'approved', 'blocked', 'paused'
    reason: Optional[str] = None
    reviewed_by: Optional[str] = None


class AuditLogResponse(AuditLogEntry):
    id: int
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True