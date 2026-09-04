
from pydantic import BaseModel


class ToolBase(BaseModel):
    name: str
    description: str | None = None
    risk_weight: int | None = 0
    requires_approval_above: float | None = None
    data_sensitivity: str | None = "low"


class ToolCreate(ToolBase):
    id: str


class ToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    risk_weight: int | None = None
    requires_approval_above: float | None = None
    data_sensitivity: str | None = None


class ToolResponse(ToolBase):
    id: str
    created_at: str | None = None

    class Config:
        from_attributes = True