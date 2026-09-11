# backend/services/intent_parser.py
"""
intent_parser.py
------------------
Detects whether an employee's free-text chat message is actually a request
to perform a tool action (e.g. "process a refund of 50000 to my account")
versus a normal conversational question.

If a tool-call intent is detected, extracts the tool name and any relevant
parameters (primarily 'amount', since that's what risk_engine/policy_checker
key off of).

Returns a dict:
  {
    "is_tool_call": bool,
    "tool_name": str | None,   # must match a real row in the tools table
    "parameters": dict,        # e.g. {"amount": 50000}
    "confidence_note": str     # short explanation, useful for debugging/audit
  }

Fail-closed toward "is_tool_call": False — if parsing fails or is ambiguous,
treat the message as ordinary chat rather than risk accidentally treating
a real tool action as harmless conversation, or vice versa mis-triggering
on a message that was never meant to invoke anything.
"""

import json
import re

from backend.database.db import get_connection
from backend.services.groq_client import chat


def _get_tool_catalog() -> list[dict]:
    """Fetch name + description for every tool, to ground the LLM's choices."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, description FROM tools")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def _build_system_prompt(tools: list[dict]) -> str:
    tool_list = "\n".join(f'- {t["name"]}: {t["description"]}' for t in tools)

    return f"""You are an intent classifier for an internal AI governance platform.
The employee is chatting with an AI assistant. Some messages are just questions
or conversation. Others are actually requests to PERFORM an action using one of
these tools:

{tool_list}

Your job: decide if the message is asking to perform one of these actions.

Respond with ONLY a JSON object, no other text, no markdown fences, in this exact shape:
{{"is_tool_call": true, "tool_name": "process_refund", "parameters": {{"amount": 50000}}, "confidence_note": "short explanation"}}

Rules:
- is_tool_call is true ONLY if the message clearly requests an action matching
  one of the tools above (e.g. "process a refund of 50000", "look up order #123",
  "send an alert about low stock").
- tool_name must be one of the exact tool names listed above, or null if is_tool_call is false.
- parameters should capture any numeric amount mentioned as {{"amount": <number>}}.
  If no amount is mentioned or not applicable, use an empty object {{}}.
- General questions, greetings, or requests for information/explanation
  (e.g. "what's our refund policy", "how do refunds work") are NOT tool calls —
  is_tool_call must be false for these.
- confidence_note is a short 1-sentence explanation of your decision.
"""


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return json.loads(match.group(0))


def _fail_closed(reason: str) -> dict:
    return {
        "is_tool_call": False,
        "tool_name": None,
        "parameters": {},
        "confidence_note": f"parser_error: {reason}",
    }


def parse_intent(message: str) -> dict:
    """
    Determines whether a chat message intends to invoke a real tool,
    and if so, which one and with what parameters.

    Args:
        message: the raw employee chat message

    Returns:
        dict with is_tool_call, tool_name, parameters, confidence_note
    """
    if not message or not message.strip():
        return _fail_closed("empty message")

    tools = _get_tool_catalog()
    if not tools:
        return _fail_closed("no tools registered in catalog")

    valid_tool_names = {t["name"] for t in tools}
    system_prompt = _build_system_prompt(tools)

    try:
        raw = chat(system_prompt=system_prompt, user_message=message, max_tokens=2000)
        parsed = _extract_json(raw)

        is_tool_call = bool(parsed.get("is_tool_call", False))
        tool_name = parsed.get("tool_name")
        parameters = parsed.get("parameters", {})
        confidence_note = parsed.get("confidence_note", "No explanation provided.")

        if not isinstance(parameters, dict):
            parameters = {}

        # Guard: if the model hallucinated a tool name that doesn't exist,
        # don't let a fake tool call through.
        if is_tool_call and tool_name not in valid_tool_names:
            return _fail_closed(f"model named unknown tool: {tool_name!r}")

        if not is_tool_call:
            tool_name = None
            parameters = {}

        return {
            "is_tool_call": is_tool_call,
            "tool_name": tool_name,
            "parameters": parameters,
            "confidence_note": confidence_note,
        }

    except Exception as e:
        return _fail_closed(str(e))


if __name__ == "__main__":
    print("Refund request:", parse_intent("Please process a refund of rupees 50000 to my account"))
    print("Normal question:", parse_intent("What's our refund policy for digital products?"))
    print("Order lookup:", parse_intent("Can you check the status of order #4521?"))