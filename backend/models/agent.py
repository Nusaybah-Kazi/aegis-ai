from pydantic import BaseModel
from typing import List, Optional


class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    model: Optional[str] = "llama3-8b-8192"
    status: Optional[str] = "active"
    tools: Optional[List[str]] = []
    risk_score: Optional[int] = 0
    owner: Optional[str] = None


class AgentCreate(AgentBase):
    id: str


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tools: Optional[List[str]] = None
    risk_score: Optional[int] = None
    owner: Optional[str] = None


class AgentResponse(AgentBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True