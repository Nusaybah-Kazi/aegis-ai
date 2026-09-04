"""
risk_engine.py
---------------
Core risk scoring logic for Aegis AI.

Scores are derived from a tool's stored risk profile (risk_weight,
data_sensitivity, requires_approval_above) rather than a hardcoded
action-type table. This keeps scoring in sync with whatever tools
are registered in the DB.
"""

from typing import Any

SENSITIVITY_MODIFIERS = {"low": 0, "medium": 10, "high": 25}

LOW_MAX = 29
MEDIUM_MAX = 69


def _level_from_score(score: int) -> str:
    if score <= LOW_MAX:
        return "low"
    if score <= MEDIUM_MAX:
        return "medium"
    return "high"


def _recommendation_from_level(level: str, threshold_exceeded: bool) -> str:
    if threshold_exceeded:
        return "pause"
    if level == "high":
        return "block"
    if level == "medium":
        return "warn"
    return "approve"


def calculate_risk(
    tool: dict[str, Any],
    agent_id: str,
    amount: float | None = None,
) -> dict[str, Any]:
    """
    Calculate a risk assessment for one tool call.

    Args:
        tool: a tool record dict, matching data/seed/tools.json shape
              (must include name, risk_weight, data_sensitivity,
              requires_approval_above).
        agent_id: id of the agent making the call (for the response).
        amount: optional numeric value of the action (e.g. refund amount),
                compared against tool['requires_approval_above'].

    Returns:
        dict matching RiskResponse: agent_id, tool_name, risk_score,
        risk_level, factors, recommendation.
    """
    factors: list[str] = []

    base_score = tool["risk_weight"]
    factors.append(f"Base risk weight for '{tool['name']}': {base_score}")

    sensitivity = tool.get("data_sensitivity", "medium")
    sensitivity_mod = SENSITIVITY_MODIFIERS.get(sensitivity, 10)
    factors.append(f"Data sensitivity '{sensitivity}': +{sensitivity_mod}")

    threshold = tool.get("requires_approval_above")
    threshold_exceeded = False
    threshold_mod = 0
    if threshold is not None and amount is not None and amount > threshold:
        threshold_exceeded = True
        threshold_mod = 30
        factors.append(
            f"Amount {amount} exceeds approval threshold {threshold}: +{threshold_mod}"
        )

    score = min(100, base_score + sensitivity_mod + threshold_mod)
    level = _level_from_score(score)
    recommendation = _recommendation_from_level(level, threshold_exceeded)

    return {
        "agent_id": agent_id,
        "tool_name": tool["name"],
        "risk_score": score,
        "risk_level": level,
        "factors": factors,
        "recommendation": recommendation,
    }


if __name__ == "__main__":
    # Quick manual check — run with:
    #   uv run python backend/services/risk_engine.py
    refund_tool = {
        "name": "process_refund",
        "risk_weight": 80,
        "requires_approval_above": 5000,
        "data_sensitivity": "high",
    }
    faq_tool = {
        "name": "query_faq",
        "risk_weight": 5,
        "requires_approval_above": None,
        "data_sensitivity": "low",
    }

    print(calculate_risk(refund_tool, agent_id="agent-1", amount=25000))
    print(calculate_risk(faq_tool, agent_id="agent-2"))