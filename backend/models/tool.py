from pydantic import BaseModel
from typing import Optional


class ToolBase(BaseModel):
    name: str
    description: Optional[str] = None
    risk_weight: Optional[int] = 0
    requires_approval_above: Optional[float] = None
    data_sensitivity: Optional[str] = "low"


class ToolCreate(ToolBase):
    id: str


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    risk_weight: Optional[int] = None
    requires_approval_above: Optional[float] = None
    data_sensitivity: Optional[str] = None


class ToolResponse(ToolBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True