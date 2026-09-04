
from pydantic import BaseModel


class AgentBase(BaseModel):
    name: str
    description: str | None = None
    model: str | None = "llama3-8b-8192"
    status: str | None = "active"
    tools: list[str] | None = []
    risk_score: int | None = 0
    owner: str | None = None


class AgentCreate(AgentBase):
    id: str


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    tools: list[str] | None = None
    risk_score: int | None = None
    owner: str | None = None


class AgentResponse(AgentBase):
    id: str
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        from_attributes = True