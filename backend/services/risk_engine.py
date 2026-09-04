"""
risk_engine.py
---------------
Core risk scoring logic for Aegis AI.

This module is intentionally framework-free (no FastAPI, no DB access).
It takes plain data in, and returns a plain risk assessment dict out.
This makes it trivial to unit test and reuse from the gateway, the
risk_agent, or anywhere else later.
"""

from typing import Optional, Dict, Any


# ---------------------------------------------------------------------------
# Reference tables — tweak these numbers as you learn what "feels right"
# for your org. Keeping them as named constants (not magic numbers buried
# in logic) makes the scoring auditable and easy to explain in a demo.
# ---------------------------------------------------------------------------

# Base score purely from the *type* of action being attempted.
ACTION_TYPE_BASE_SCORES: Dict[str, int] = {
    "read_data": 5,
    "query_db": 10,
    "send_email": 15,
    "call_external_api": 20,
    "update_data": 35,
    "process_refund": 40,
    "delete_data": 60,
    "modify_permissions": 70,
    "send_payment": 75,
}
DEFAULT_ACTION_BASE_SCORE = 25  # used if action_type is unrecognized

# Additional points based on how sensitive the data involved is.
DATA_SENSITIVITY_MODIFIERS: Dict[str, int] = {
    "public": 0,
    "internal": 5,
    "confidential": 15,
    "restricted": 25,   # e.g. PII, financial records, health data
}
DEFAULT_SENSITIVITY_MODIFIER = 10

# Additional points based on the permission level the agent is acting with.
PERMISSION_LEVEL_MODIFIERS: Dict[str, int] = {
    "read_only": 0,
    "read_write": 10,
    "admin": 25,
}
DEFAULT_PERMISSION_MODIFIER = 10

# Magnitude (monetary value) thresholds -> extra points.
# Sorted ascending; we walk through and take the highest matching bracket.
MAGNITUDE_THRESHOLDS = [
    (0, 0),
    (1_000, 5),
    (5_000, 15),
    (25_000, 30),
    (100_000, 45),
]

# Score cutoffs for categorical level.
LOW_MAX = 29
MEDIUM_MAX = 69


def _magnitude_modifier(value: Optional[float]) -> int:
    """Return extra risk points based on a monetary value, if provided."""
    if value is None:
        return 0
    modifier = 0
    for threshold, points in MAGNITUDE_THRESHOLDS:
        if value >= threshold:
            modifier = points
    return modifier


def _clamp(score: int, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, score))


def _level_from_score(score: int) -> str:
    if score <= LOW_MAX:
        return "low"
    if score <= MEDIUM_MAX:
        return "medium"
    return "high"


def calculate_risk(
    action_type: str,
    data_sensitivity: str = "internal",
    permission_level: str = "read_only",
    value: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Calculate a risk assessment for a single proposed agent action.

    Args:
        action_type: e.g. "process_refund", "delete_data", "read_data"
        data_sensitivity: "public" | "internal" | "confidential" | "restricted"
        permission_level: "read_only" | "read_write" | "admin"
        value: optional monetary/numeric magnitude of the action
               (e.g. refund amount). Pass None if not applicable.

    Returns:
        {
            "score": int (0-100),
            "level": "low" | "medium" | "high",
            "breakdown": {
                "action_base": int,
                "sensitivity_modifier": int,
                "permission_modifier": int,
                "magnitude_modifier": int,
            }
        }
    """
    action_base = ACTION_TYPE_BASE_SCORES.get(action_type, DEFAULT_ACTION_BASE_SCORE)
    sensitivity_mod = DATA_SENSITIVITY_MODIFIERS.get(
        data_sensitivity, DEFAULT_SENSITIVITY_MODIFIER
    )
    permission_mod = PERMISSION_LEVEL_MODIFIERS.get(
        permission_level, DEFAULT_PERMISSION_MODIFIER
    )
    magnitude_mod = _magnitude_modifier(value)

    raw_score = action_base + sensitivity_mod + permission_mod + magnitude_mod
    final_score = _clamp(raw_score)
    level = _level_from_score(final_score)

    return {
        "score": final_score,
        "level": level,
        "breakdown": {
            "action_base": action_base,
            "sensitivity_modifier": sensitivity_mod,
            "permission_modifier": permission_mod,
            "magnitude_modifier": magnitude_mod,
        },
    }


if __name__ == "__main__":
    # Quick manual sanity check — run with:
    #   uv run python backend/services/risk_engine.py
    examples = [
        {"action_type": "read_data", "data_sensitivity": "public", "permission_level": "read_only"},
        {"action_type": "process_refund", "data_sensitivity": "confidential", "permission_level": "read_write", "value": 25000},
        {"action_type": "delete_data", "data_sensitivity": "restricted", "permission_level": "admin"},
    ]
    for ex in examples:
        result = calculate_risk(**ex)
        print(ex, "->", result)