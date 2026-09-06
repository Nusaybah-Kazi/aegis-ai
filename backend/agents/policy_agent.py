"""
policy_agent.py
-----------------
Policy Agent — fleet-wide policy compliance evaluation.

policy_checker.check_policies() evaluates ONE tool call against
applicable policies at gateway/request time (with a specific amount).
This agent instead evaluates STANDING policy exposure: for every agent,
for every tool it has access to, which policies apply — regardless of
any specific transaction.

Since some policies (rule_type='amount_limit') can only trigger with a
real amount, we distinguish:
  - "triggered"   — policies that fire even with no amount context
                     (permission, data_access rule types)
  - "conditional"  — amount_limit policies that COULD trigger depending
                     on the transaction amount, but can't be evaluated
                     without one

This agent does NOT block or change anything — it only reports, same
as discovery_agent and risk_agent.
"""

import json
from typing import Any

from backend.database.db import get_connection
from backend.services.policy_checker import check_policies


def _load_agents() -> list[dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM agents")
    rows = cursor.fetchall()
    conn.close()

    agents = []
    for row in rows:
        agent = dict(row)
        agent["tools"] = json.loads(agent["tools"]) if agent["tools"] else []
        agents.append(agent)
    return agents


def _load_tools_by_name() -> dict[str, dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools")
    rows = cursor.fetchall()
    conn.close()
    return {row["name"]: dict(row) for row in rows}


def _load_policies_applying_to(tool_name: str) -> list[dict[str, Any]]:
    """Returns raw policy rows whose applies_to includes this tool."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies")
    rows = cursor.fetchall()
    conn.close()

    matching = []
    for row in rows:
        policy = dict(row)
        try:
            applies_to = json.loads(policy["applies_to"])
        except (json.JSONDecodeError, TypeError):
            applies_to = []
        if tool_name in applies_to:
            matching.append(policy)
    return matching


def _assess_tool_policy_exposure(tool_name: str, tool_data_sensitivity: str) -> dict[str, Any]:
    """
    Checks standing policy exposure for a single tool (no amount context).
    """
    applicable_policies = _load_policies_applying_to(tool_name)

    if not applicable_policies:
        return {
            "tool_name": tool_name,
            "applicable_policies": [],
            "triggered": [],
            "conditional": [],
        }

    result = check_policies(
        tool_name=tool_name,
        tool_data_sensitivity=tool_data_sensitivity,
        amount=None,
    )

    triggered = []
    conditional = []

    for policy in applicable_policies:
        if policy["rule_type"] == "amount_limit":
            # Can't be evaluated without a real amount — always conditional
            conditional.append({
                "policy_id": policy["id"],
                "policy_name": policy["name"],
                "action": policy["action"],
                "threshold": policy["threshold"],
            })
        else:
            # permission / data_access rule types don't need an amount
            entry = {
                "policy_id": policy["id"],
                "policy_name": policy["name"],
                "action": policy["action"],
            }
            if not result.passed and result.violated_policy_id == policy["id"]:
                triggered.append(entry)
            else:
                # Applicable but didn't come out as the strictest violation
                # (e.g. data_access didn't trigger because sensitivity isn't 'high')
                pass

    return {
        "tool_name": tool_name,
        "applicable_policies": [p["name"] for p in applicable_policies],
        "triggered": triggered,
        "conditional": conditional,
    }


def _assess_agent(agent: dict[str, Any], tools_by_name: dict[str, dict[str, Any]]) -> dict[str, Any]:
    tool_reports = []
    for tool_name in agent["tools"]:
        tool = tools_by_name.get(tool_name)
        if tool is None:
            continue  # already caught by discovery_agent
        tool_reports.append(
            _assess_tool_policy_exposure(tool_name, tool.get("data_sensitivity", "low"))
        )

    has_triggered = any(t["triggered"] for t in tool_reports)
    has_conditional = any(t["conditional"] for t in tool_reports)

    return {
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "tool_reports": tool_reports,
        "has_unconditional_policy_hits": has_triggered,
        "has_conditional_policy_exposure": has_conditional,
    }


def run_policy_evaluation() -> dict[str, Any]:
    """
    Evaluates standing policy exposure for every agent in the inventory.

    Returns:
        dict with:
          agent_count               — how many agents were assessed
          agents_with_unconditional_hits — count of agents with a policy
                                           that fires regardless of amount
          assessments               — per-agent breakdown
          status                    — 'clean' or 'exposure_found'
    """
    agents = _load_agents()
    tools_by_name = _load_tools_by_name()

    assessments = [_assess_agent(agent, tools_by_name) for agent in agents]
    flagged = [a for a in assessments if a["has_unconditional_policy_hits"]]

    return {
        "agent_count": len(agents),
        "agents_with_unconditional_hits": len(flagged),
        "assessments": assessments,
        "status": "exposure_found" if flagged else "clean",
    }


if __name__ == "__main__":
    report = run_policy_evaluation()
    print(f"Agents assessed: {report['agent_count']}")
    print(f"Status:          {report['status']}")

    for a in report["assessments"]:
        marker = "⚠️ " if a["has_unconditional_policy_hits"] else "✅ "
        print(f"\n{marker}{a['agent_name']} ({a['agent_id']})")
        for t in a["tool_reports"]:
            if t["applicable_policies"]:
                print(f"    {t['tool_name']}: policies={t['applicable_policies']}, "
                      f"triggered={[p['policy_name'] for p in t['triggered']]}, "
                      f"conditional={[p['policy_name'] for p in t['conditional']]}")