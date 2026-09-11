# backend/services/sensitivity_scanner.py
"""
sensitivity_scanner.py
------------------------
Scans employee prompts (destined for internal or external AI) for
sensitive content before they leave the org boundary.

Categories checked:
  - PII            (names, emails, phone numbers, Aadhaar, etc.)
  - Company internals (revenue, strategy, unreleased product plans)
  - Customer data  (orders, transactions, customer records)
  - Credentials    (passwords, API keys, tokens)

Returns a dict:
  {
    "safe": bool,
    "risk_level": "safe" | "borderline" | "unsafe",
    "findings": [str, ...],
    "reason": str
  }

Fail-closed: if the scan itself errors (timeout, bad JSON from the model),
the result is treated as "unsafe" so nothing sensitive slips through due
to a system hiccup rather than an actual content violation.
"""

import json
import re

from backend.services.groq_client import chat

SYSTEM_PROMPT = """You are a data security scanner for an internal AI governance platform.
Analyze the user's text for sensitive content in these 4 categories ONLY:

1. PII - specific names of individuals, email addresses, phone numbers, national ID
   numbers (e.g. Aadhaar), home addresses
2. Company internals - UNPUBLISHED information: internal revenue/financial figures,
   confidential business strategy, unreleased product plans, internal-only documents
3. Customer data - specific order details, transaction records, specific customer
   account information
4. Credentials - passwords, API keys, tokens, secrets

IMPORTANT — these are NOT sensitive and must be marked "safe":
- General questions about existing, published company policies (e.g. "what's our
  refund policy", "how do returns work") — these are normal support questions,
  not internal leaks
- Generic business or technical questions with no real names, numbers, or secrets
- Questions about how a system or process works in general terms

Respond with ONLY a JSON object, no other text, no markdown fences, in this exact shape:
{"risk_level": "safe", "findings": [], "reason": "short explanation"}

risk_level must be exactly one of: "safe", "borderline", "unsafe"

- "safe": no sensitive content detected, including general policy/process questions

- "borderline": there IS some sensitive-sounding content, but it is vague, incomplete,
  or low-severity enough that a human should quickly judge intent rather than an
  automatic hard block. Use this for:
    * A first name alone with a vague business reference (no numbers, no full details)
      e.g. "What's John's status on the Henderson deal?"
    * A general mention of "the deal" / "the project" / "the client" without any
      concrete figures, documents, or identifying details
    * Ambiguous phrasing where sensitive intent is possible but not certain

- "unsafe": CONCRETE, CLEAR sensitive content is present — an actual credential
  (API key, password, token), a full email address or phone number, specific
  financial figures, or an explicit request to exfiltrate/send sensitive data
  somewhere. Reserve this for cases with no reasonable doubt.

When in doubt between "borderline" and "unsafe", prefer "borderline" — hard blocks
should be reserved for unambiguous violations only.

findings must be a list of short strings naming what was found (e.g. "email address", "API key").
If risk_level is "safe", findings must be an empty list.
reason must be a short 1-sentence explanation of the verdict.
"""


def _fail_closed(reason: str) -> dict:
    """Default response when the scan cannot be completed reliably."""
    return {
        "safe": False,
        "risk_level": "unsafe",
        "findings": ["scanner_error"],
        "reason": f"scanner_error: {reason}",
    }


def _extract_json(text: str) -> dict:
    """
    Groq sometimes wraps JSON in markdown fences or adds stray text.
    Pull out the first {...} block and parse it.
    """
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return json.loads(match.group(0))


def scan_prompt(text: str) -> dict:
    """
    Scans a single prompt string for sensitive content.

    Args:
        text: the raw employee prompt about to be sent to an AI (internal or external)

    Returns:
        dict with safe, risk_level, findings, reason
    """
    if not text or not text.strip():
        return {
            "safe": True,
            "risk_level": "safe",
            "findings": [],
            "reason": "Empty prompt — nothing to scan.",
        }

    try:
        raw = chat(
            system_prompt=SYSTEM_PROMPT,
            user_message=text,
            max_tokens=400,
        )
        parsed = _extract_json(raw)

        risk_level = parsed.get("risk_level")
        if risk_level not in ("safe", "borderline", "unsafe"):
            return _fail_closed(f"model returned invalid risk_level: {risk_level!r}")

        findings = parsed.get("findings", [])
        if not isinstance(findings, list):
            findings = [str(findings)]

        reason = parsed.get("reason", "No reason provided.")

        return {
            "safe": risk_level == "safe",
            "risk_level": risk_level,
            "findings": findings,
            "reason": reason,
        }

    except Exception as e:
        # Fail-closed: any error (network, JSON parse, unexpected shape)
        # results in an "unsafe" verdict, never a silent pass-through.
        return _fail_closed(str(e))


if __name__ == "__main__":
    print("Clean prompt:", scan_prompt("What's our refund policy for digital products?"))
    print("PII prompt:  ", scan_prompt("Please email John Doe at john.doe@example.com about his refund."))
    print("Credential:  ", scan_prompt("Here's my API key: sk-abc123xyz, can you use it to call the service?"))