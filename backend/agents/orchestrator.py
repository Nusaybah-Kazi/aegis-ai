"""
orchestrator.py
----------------
Governance Orchestrator — the single entry point for running any
governance task, regardless of which specialist agent handles it.

The orchestrator itself does NO domain logic (no scoring, no policy
checks, no discovery, no RAG). It only:
  1. Accepts a task name (e.g. "run_discovery")
  2. Looks up the matching specialist agent function
  3. Calls it, and wraps the result in a consistent response envelope
"""

from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from backend.agents.compliance_agent import ask_compliance
from backend.agents.discovery_agent import run_discovery
from backend.agents.policy_agent import run_policy_evaluation
from backend.agents.risk_agent import run_risk_reassessment
from backend.agents.runtime_agent import evaluate_tool_call

# Dispatch table: task name -> agent function
# Each agent function must take **kwargs and return a dict.
TASK_REGISTRY: dict[str, Callable[..., dict[str, Any]]] = {
    "run_discovery": lambda **kwargs: run_discovery(),
    "run_risk_reassessment": lambda **kwargs: run_risk_reassessment(),
    "run_policy_evaluation": lambda **kwargs: run_policy_evaluation(),
    "evaluate_tool_call": lambda **kwargs: evaluate_tool_call(**kwargs),
    "ask_compliance": lambda **kwargs: ask_compliance(**kwargs),
}


def run_task(task_name: str, **kwargs) -> dict[str, Any]:
    """
    Runs a single governance task by name.

    Args:
        task_name: Must be a key in TASK_REGISTRY
        **kwargs:  Any parameters the specific agent function needs

    Returns:
        dict with:
          task       — the task name that was run
          timestamp  — when it ran (UTC ISO format)
          result     — the raw dict returned by the agent function

    Raises:
        ValueError if task_name isn't registered.
    """
    if task_name not in TASK_REGISTRY:
        available = ", ".join(TASK_REGISTRY.keys())
        raise ValueError(
            f"Unknown task '{task_name}'. Available tasks: {available}"
        )

    agent_fn = TASK_REGISTRY[task_name]
    result = agent_fn(**kwargs)

    return {
        "task": task_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "result": result,
    }


if __name__ == "__main__":
    output = run_task("run_discovery")
    print(f"Task:      {output['task']}")
    print(f"Timestamp: {output['timestamp']}")
    print(f"Status:    {output['result']['status']}")
    print(f"Agents:    {output['result']['agent_count']}")
    print(f"Tools:     {output['result']['tool_count']}")