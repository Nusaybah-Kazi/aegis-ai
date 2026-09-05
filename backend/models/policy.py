"""
policy.py (model)
------------------
Pydantic models for the Policy Engine.

rule_type values:
  'amount_limit'  — triggered when a parameter (e.g. amount) exceeds threshold
  'permission'    — triggered always when the tool is called (no threshold needed)
  'data_access'   — triggered when data_sensitivity of the tool is 'high'

action values:
  'block'  — hard stop, never executes
  'pause'  — paused for human approval
  'warn'   — allowed but flagged in audit log
"""

from typing import Optional
from pydantic import BaseModel


class PolicyBase(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str                    # 'amount_limit', 'permission', 'data_access'
    threshold: Optional[float] = None # used when rule_type = 'amount_limit'
    action: str                       # 'block', 'pause', 'warn'
    applies_to: list[str]             # list of tool names this policy governs


class PolicyCreate(PolicyBase):
    pass


class PolicyResponse(PolicyBase):
    id: str

    class Config:
        from_attributes = True


class PolicyCheckResult(BaseModel):
    """Returned by policy_checker.py to the gateway."""
    passed: bool                          # True = no violation, False = policy triggered
    action: Optional[str] = None          # 'block', 'pause', 'warn' — only set when passed=False
    violated_policy_id: Optional[str] = None
    violated_policy_name: Optional[str] = None
    reason: Optional[str] = None