"""
risk_agent.py
--------------
Risk Agent — continuous risk reassessment across the whole agent fleet.

Unlike risk_engine.calculate_risk(), which scores ONE tool call at
request time (with an optional amount), this agent periodically
re-evaluates every agent's overall risk EXPOSURE based on the tools
it currently has access to — independent of any single transaction.

For each agent:
  1. Look up every tool it references.
  2. Run calculate_risk() on each tool with no amount (we're assessing
     access/exposure, not a specific transaction).
  3. Take the MAX resulting score across its tools — an agent is only
     as safe as its most dangerous tool.
  4. Compare that computed score against the agent's stored risk_score
     in the DB. Flag drift if they don't match.

This agent does NOT write the recalculated score back to the DB.
Like discovery_agent, it only reports — updating risk_score is a
separate, explicit decision (e.g. via the existing PUT /agents/{id}
endpoint), not something this agent silently does on its own.
"""

from typing import Any

from backend.database.db import get_connection
from backend.services.risk_engine import calculate_risk


def _load_agents() -> list[dict[str, Any]]:
    import json
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


def _assess_agent(agent: dict[str, Any], tools_by_name: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """
    Computes the current risk exposure for a single agent based on
    the tools it has access to right now.
    """
    tool_scores: list[dict[str, Any]] = []
    missing_tools: list[str] = []

    for tool_name in agent["tools"]:
        tool = tools_by_name.get(tool_name)
        if tool is None:
            # Already caught by discovery_agent, but guard here too
            missing_tools.append(tool_name)
            continue

        assessment = calculate_risk(tool, agent_id=agent["id"])
        tool_scores.append({
            "tool_name": tool_name,
            "risk_score": assessment["risk_score"],
            "risk_level": assessment["risk_level"],
        })

    computed_score = max((t["risk_score"] for t in tool_scores), default=0)
    stored_score = agent.get("risk_score", 0)
    drift = computed_score != stored_score

    return {
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "stored_risk_score": stored_score,
        "computed_risk_score": computed_score,
        "drift": drift,
        "tool_scores": tool_scores,
        "missing_tools": missing_tools,
    }


def run_risk_reassessment() -> dict[str, Any]:
    """
    Reassesses risk exposure for every agent in the inventory.

    Returns:
        dict with:
          agent_count      — how many agents were assessed
          drift_found      — how many agents have stale risk_score values
          assessments      — per-agent breakdown (see _assess_agent)
          status           — 'clean' or 'drift_found'
    """
    agents = _load_agents()
    tools_by_name = _load_tools_by_name()

    assessments = [_assess_agent(agent, tools_by_name) for agent in agents]
    drifted = [a for a in assessments if a["drift"]]

    return {
        "agent_count": len(agents),
        "drift_found": len(drifted),
        "assessments": assessments,
        "status": "drift_found" if drifted else "clean",
    }


if __name__ == "__main__":
    report = run_risk_reassessment()
    print(f"Agents assessed: {report['agent_count']}")
    print(f"Status:          {report['status']}")

    for a in report["assessments"]:
        marker = "⚠️ " if a["drift"] else "✅ "
        print(
            f"{marker}{a['agent_name']} ({a['agent_id']}): "
            f"stored={a['stored_risk_score']}, computed={a['computed_risk_score']}"
        )