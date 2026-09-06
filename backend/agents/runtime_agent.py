"""
runtime_agent.py
------------------
Runtime Agent — the reusable decision logic behind runtime enforcement.

This mirrors the decision flow already used by
backend/routers/gateway.py's POST /gateway/evaluate endpoint:

  1. Look up the tool
  2. Run policy check (policy_checker.check_policies)
  3. Run risk scoring (risk_engine.calculate_risk)
  4. Combine into one final decision — policy can only make things
     stricter, never looser (same rule as the gateway router)

Unlike the gateway ROUTER, this agent does NOT write to the audit log
or approval queue. It only returns the decision. Persisting the
decision (and any resulting queue entry) stays the router's job,
since that's tied to a live HTTP request/response cycle. This keeps
the decision logic reusable — e.g. by the orchestrator, or by
risk_agent/policy_agent-style batch tools later — without duplicating
DB side effects in two places.
"""

from typing import Any

from backend.database.db import get_connection
from backend.services.policy_checker import check_policies
from backend.services.risk_engine import calculate_risk


def _load_tool(tool_name: str) -> dict[str, Any] | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools WHERE name = ?", (tool_name,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def evaluate_tool_call(
    agent_id: str,
    tool_name: str,
    amount: float | None = None,
) -> dict[str, Any]:
    """
    Runs the full runtime enforcement decision for one tool call,
    without persisting anything.

    Args:
        agent_id:  ID of the agent making the call
        tool_name: Name of the tool being called
        amount:    Optional numeric parameter (e.g. refund amount)

    Returns:
        dict with:
          agent_id, tool_name
          risk_score, risk_level, factors
          policy_passed, policy_reason
          decision   — 'approved', 'paused', or 'blocked'
          reason     — combined human-readable explanation

    Raises:
        ValueError if the tool doesn't exist.
    """
    tool = _load_tool(tool_name)
    if tool is None:
        raise ValueError(f"Tool '{tool_name}' not found")

    policy_result = check_policies(
        tool_name=tool_name,
        tool_data_sensitivity=tool.get("data_sensitivity", "low"),
        amount=amount,
    )

    assessment = calculate_risk(tool, agent_id=agent_id, amount=amount)
    recommendation = assessment["recommendation"]

    risk_reason = "; ".join(assessment["factors"])
    all_reasons = []
    if not policy_result.passed:
        all_reasons.append(f"[POLICY] {policy_result.reason}")
    all_reasons.append(f"[RISK] {risk_reason}")
    combined_reason = " | ".join(all_reasons)

    # Same decision matrix as gateway.py's POST /gateway/evaluate
    if not policy_result.passed and policy_result.action == "block":
        decision = "blocked"
    elif not policy_result.passed and policy_result.action == "pause":
        decision = "blocked" if recommendation == "block" else "paused"
    elif recommendation in ("approve", "warn"):
        decision = "approved"
    elif recommendation == "pause":
        decision = "paused"
    else:
        decision = "blocked"

    return {
        "agent_id": agent_id,
        "tool_name": tool_name,
        "risk_score": assessment["risk_score"],
        "risk_level": assessment["risk_level"],
        "factors": assessment["factors"],
        "policy_passed": policy_result.passed,
        "policy_reason": policy_result.reason,
        "decision": decision,
        "reason": combined_reason,
    }


if __name__ == "__main__":
    result = evaluate_tool_call(agent_id="agent-001", tool_name="process_refund", amount=25000)
    print(f"Agent:    {result['agent_id']}")
    print(f"Tool:     {result['tool_name']}")
    print(f"Decision: {result['decision']}")
    print(f"Reason:   {result['reason']}")