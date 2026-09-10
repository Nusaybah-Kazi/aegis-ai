"""
risk_engine.py
---------------
Core risk scoring logic for Aegis AI.

Scores are derived from a tool's stored risk profile (risk_weight,
data_sensitivity, requires_approval_above) rather than a hardcoded
action-type table.

Scoring logic:
  - If a tool has requires_approval_above (a threshold) AND an amount
    is provided, the base score is SCALED by how close amount is to
    the threshold. A ₹100 refund on a ₹5,000 threshold scores much
    lower than a ₹4,900 refund.
  - If no amount is provided (or no threshold exists), the full
    risk_weight applies — unknown/unquantified actions are treated
    as potentially full-risk.
  - Exceeding the threshold adds a flat +30 and forces 'pause'.
  - data_sensitivity adds a fixed modifier on top.
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


def _recommendation_from_level(level: str, threshold_exceeded: bool, amount_known: bool) -> str:
    if threshold_exceeded:
        return "pause"
    if level == "high":
        # A known, quantified amount should go to a human, never a silent block.
        # Only truly unknown/unquantified actions get hard-blocked.
        return "pause" if amount_known else "block"
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
        tool:     tool record dict from DB
        agent_id: agent making the call
        amount:   optional numeric value (e.g. refund amount)

    Returns:
        dict with risk_score, risk_level, factors, recommendation.
    """
    factors: list[str] = []

    risk_weight = tool["risk_weight"]
    threshold = tool.get("requires_approval_above")

    # ── Base score: scale by amount/threshold ratio when possible ────────────
    if threshold is not None and amount is not None and threshold > 0:
        # ratio: 0.0 (tiny amount) → 1.0 (amount == threshold)
        ratio = min(amount / threshold, 1.0)
        base_score = round(risk_weight * ratio)
        factors.append(
            f"Base risk weight for '{tool['name']}': {risk_weight} "
            f"× amount ratio {ratio:.2f} = {base_score}"
        )
    else:
        # No amount context — apply full risk_weight (unknown = worst case)
        base_score = risk_weight
        factors.append(f"Base risk weight for '{tool['name']}': {base_score}")

    # ── Sensitivity modifier ─────────────────────────────────────────────────
    sensitivity = tool.get("data_sensitivity", "medium")
    sensitivity_mod = SENSITIVITY_MODIFIERS.get(sensitivity, 10)
    factors.append(f"Data sensitivity '{sensitivity}': +{sensitivity_mod}")

    # ── Threshold exceeded modifier ──────────────────────────────────────────
    threshold_exceeded = False
    threshold_mod = 0
    if threshold is not None and amount is not None and amount > threshold:
        threshold_exceeded = True
        threshold_mod = 30
        factors.append(
            f"Amount {amount:,.0f} exceeds approval threshold {threshold:,.0f}: +{threshold_mod}"
        )

    score = min(100, base_score + sensitivity_mod + threshold_mod)
    level = _level_from_score(score)
    recommendation = _recommendation_from_level(level, threshold_exceeded, amount_known=amount is not None)

    return {
        "agent_id": agent_id,
        "tool_name": tool["name"],
        "risk_score": score,
        "risk_level": level,
        "factors": factors,
        "recommendation": recommendation,
    }


if __name__ == "__main__":
    refund_tool = {
        "name": "process_refund",
        "risk_weight": 80,
        "requires_approval_above": 5000,
        "data_sensitivity": "medium",
    }
    faq_tool = {
        "name": "query_faq",
        "risk_weight": 5,
        "requires_approval_above": None,
        "data_sensitivity": "low",
    }

    print("Small refund ₹2,000:", calculate_risk(refund_tool, "agent-1", amount=2000))
    print("Large refund ₹6,000:", calculate_risk(refund_tool, "agent-1", amount=6000))
    print("FAQ query:          ", calculate_risk(faq_tool, "agent-2"))
