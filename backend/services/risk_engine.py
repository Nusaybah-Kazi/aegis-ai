"""
risk_engine.py

---------------
Core risk scoring logic for Aegis AI.

Scores are derived from a tool's stored risk profile (risk_weight,
data_sensitivity, requires_approval_above) rather than a hardcoded
action-type table.

Scoring logic:
  - If a tool has requires_approval_above (a threshold) AND an amount
    is provided, the base score is SCALED by how close amount is to the
    threshold. A ₹100 refund on a ₹5,000 threshold scores much lower
    than a ₹4,900 refund.
  - If no amount is provided (or no threshold exists), the full
    risk_weight applies — unknown/unquantified actions are treated
    as potentially full-risk.
  - Exceeding the threshold adds a flat +30.
  - data_sensitivity adds a fixed modifier on top.

Recommendation logic (fixed):
  - Compliant actions (amount within threshold, or no threshold at all)
    are capped at 'warn' — they may be flagged for visibility, but the
    engine must never pause/block something the org's own policy allows
    to run automatically.
  - Non-compliant actions (amount exceeds threshold) are *at least*
    'pause', and escalate to 'block' only when the underlying score is
    severe — so a small breach isn't treated identically to a huge one.
  - threshold_exceeded can only ESCALATE the recommendation, never
    downgrade a computed 'block' down to a softer 'pause'.
"""

from typing import Any

SENSITIVITY_MODIFIERS = {"low": 0, "medium": 10, "high": 25}

LOW_MAX = 29

MEDIUM_MAX = 69

_SEVERITY_ORDER = {"approve": 0, "warn": 1, "pause": 2, "block": 3}


def _level_from_score(score: int) -> str:

    if score <= LOW_MAX:

        return "low"

    if score <= MEDIUM_MAX:

        return "medium"

    return "high"


def _recommendation_from_level(level: str, threshold_exceeded: bool) -> str:

    # Base recommendation purely from score level

    if level == "high":

        base = "block"

    elif level == "medium":

        base = "warn"

    else:

        base = "approve"

    if not threshold_exceeded:

        # Compliant with policy — never pause/block, even if the raw
        # score crept into 'high' territory. Cap at 'warn' so it's
        # still visible/flagged, but never stops execution.

        return base if _SEVERITY_ORDER[base] < _SEVERITY_ORDER["pause"] else "warn"

    # Non-compliant (amount exceeds threshold) — must be at least
    # 'pause'. If the score already implies something stricter
    # ('block'), keep that; never downgrade.

    return base if _SEVERITY_ORDER[base] > _SEVERITY_ORDER["pause"] else "pause"


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
    sensitivity = tool.get("data_sensitivity", "medium")
    sensitivity_mod = SENSITIVITY_MODIFIERS.get(sensitivity, 10)

    threshold_exceeded = (
        threshold is not None and amount is not None and amount > threshold
    )

    if threshold_exceeded:
        # ── Breach path: score reflects HOW FAR over the threshold ──────────
        overage_ratio = amount / threshold  # e.g. 1.2, 5.0
        base_score = 40
        overage_mod = min(60, round(20 * (overage_ratio - 1)))
        factors.append(
            f"Policy threshold breach base for '{tool['name']}': {base_score}"
        )
        factors.append(
            f"Amount {amount:,.0f} is {overage_ratio:.2f}x the {threshold:,.0f} "
            f"threshold: overage penalty +{overage_mod}"
        )
    elif threshold is not None and amount is not None and threshold > 0:
        # ── Compliant path: scale by amount/threshold ratio as before ───────
        ratio = min(amount / threshold, 1.0)
        base_score = round(risk_weight * ratio)
        overage_mod = 0
        factors.append(
            f"Base risk weight for '{tool['name']}': {risk_weight} "
            f"× amount ratio {ratio:.2f} = {base_score}"
        )
    else:
        # No amount context — apply full risk_weight (unknown = worst case)
        base_score = risk_weight
        overage_mod = 0
        factors.append(f"Base risk weight for '{tool['name']}': {base_score}")

    factors.append(f"Data sensitivity '{sensitivity}': +{sensitivity_mod}")

    raw_score = min(100, base_score + sensitivity_mod + overage_mod)
    raw_level = _level_from_score(raw_score)
    recommendation = _recommendation_from_level(raw_level, threshold_exceeded)

    score = raw_score
    level = raw_level

    if not threshold_exceeded and raw_level == "high":
        # Compliant action — cap the DISPLAYED score/level too, so the
        # number shown never contradicts the 'warn' recommendation next
        # to it. Capped just below the 'high' band (MEDIUM_MAX).
        score = MEDIUM_MAX
        level = "medium"
        factors.append(
            f"Raw score {raw_score} reached 'high' but amount is within policy "
            f"threshold — score capped at {MEDIUM_MAX} ('medium') and "
            f"recommendation capped at 'warn'"
        )

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
        "risk_weight": 95,
        "requires_approval_above": 5000,
        "data_sensitivity": "medium",
    }

    faq_tool = {
        "name": "query_faq",
        "risk_weight": 5,
        "requires_approval_above": None,
        "data_sensitivity": "low",
    }

    print(
        "Refund ₹4,900 (compliant):",
        calculate_risk(refund_tool, "agent-1", amount=4900)
    )

    print(
        "Refund ₹6,000 (breach):   ",
        calculate_risk(refund_tool, "agent-1", amount=6000)
    )

    print(
        "Refund ₹25,000 (severe):  ",
        calculate_risk(refund_tool, "agent-1", amount=25000)
    )

    print(
        "FAQ query:                ",
        calculate_risk(faq_tool, "agent-2")
    )