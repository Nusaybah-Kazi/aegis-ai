"""
policy_checker.py
------------------
Policy Engine — evaluates an agent action against all active policies.

Called by the gateway BEFORE the risk engine decision is finalized.
Returns a PolicyCheckResult indicating whether the action passed all
policies, or which policy was violated and what action to take.

Evaluation order:
  1. Load all policies from DB
  2. Filter to policies whose applies_to list includes this tool
  3. For each applicable policy, evaluate its condition:
       - amount_limit : amount param exceeds threshold → trigger
       - permission   : tool is in applies_to (always triggers)
       - data_access  : tool's data_sensitivity is 'high' → trigger
  4. Return the STRICTEST violation found
     (block > pause > warn — so a block always wins over a pause)
"""

import json
from typing import Optional

from backend.database.db import get_connection
from backend.models.policy import PolicyCheckResult

# Severity order — higher index = stricter
_SEVERITY = {"warn": 0, "pause": 1, "block": 2}


def _strictest(a: str, b: str) -> str:
    """Return whichever action is stricter."""
    return a if _SEVERITY.get(a, -1) >= _SEVERITY.get(b, -1) else b


def check_policies(
    tool_name: str,
    tool_data_sensitivity: str,
    amount: Optional[float] = None,
) -> PolicyCheckResult:
    """
    Evaluate all applicable policies for this tool call.

    Args:
        tool_name:              Name of the tool being called (e.g. 'process_refund')
        tool_data_sensitivity:  'low', 'medium', or 'high' — from the tools table
        amount:                 Numeric parameter from the request (e.g. refund amount)
                                None if not applicable.

    Returns:
        PolicyCheckResult with passed=True if no policy triggered,
        or passed=False with the strictest violation details.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies")
    rows = cursor.fetchall()
    conn.close()

    # Convert to list of dicts
    policies = [dict(row) for row in rows]

    worst_action: Optional[str] = None
    worst_policy_id: Optional[str] = None
    worst_policy_name: Optional[str] = None
    worst_reason: Optional[str] = None

    for policy in policies:
        # Parse applies_to — stored as JSON string e.g. '["process_refund"]'
        try:
            applies_to: list[str] = json.loads(policy["applies_to"])
        except (json.JSONDecodeError, TypeError):
            applies_to = []

        # Skip if this policy doesn't cover our tool
        if tool_name not in applies_to:
            continue

        rule_type = policy["rule_type"]
        threshold = policy["threshold"]
        action = policy["action"]
        triggered = False
        reason = ""

        if rule_type == "amount_limit":
            # Triggers when the amount parameter exceeds the threshold
            if amount is not None and threshold is not None and amount > threshold:
                triggered = True
                reason = (
                    f"Policy '{policy['name']}' violated: "
                    f"amount ₹{amount:,.0f} exceeds limit of ₹{threshold:,.0f}"
                )

        elif rule_type == "permission":
            # Always triggers when this tool is called — no condition needed
            triggered = True
            reason = (
                f"Policy '{policy['name']}' violated: "
                f"tool '{tool_name}' requires explicit approval"
            )

        elif rule_type == "data_access":
            # Triggers when the tool handles high-sensitivity data
            if tool_data_sensitivity == "high":
                triggered = True
                reason = (
                    f"Policy '{policy['name']}' violated: "
                    f"tool '{tool_name}' accesses high-sensitivity data"
                )

        if triggered:
            # Keep track of the strictest violation across all policies
            if worst_action is None or _SEVERITY.get(action, 0) > _SEVERITY.get(worst_action, 0):
                worst_action = action
                worst_policy_id = policy["id"]
                worst_policy_name = policy["name"]
                worst_reason = reason

    if worst_action is None:
        # No policy triggered — all clear
        return PolicyCheckResult(passed=True)

    return PolicyCheckResult(
        passed=False,
        action=worst_action,
        violated_policy_id=worst_policy_id,
        violated_policy_name=worst_policy_name,
        reason=worst_reason,
    )