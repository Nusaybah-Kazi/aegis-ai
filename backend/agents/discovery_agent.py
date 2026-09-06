"""
discovery_agent.py
-------------------
Discovery Agent — scans and cross-checks the agent/tool inventory.

Responsibilities (read-only, never modifies data):
  1. Load every agent and every tool from the DB.
  2. For each agent, check that every tool name it references actually
     exists in the tools table. Flag any that don't (orphaned tool refs —
     the exact class of bug found manually in Phase 5 with
     'query_customer_pii').
  3. Flag any tools that exist but are not referenced by ANY agent
     (unused/orphaned tools — not dangerous, but useful to know).
  4. Return a structured report the orchestrator (or a future endpoint)
     can use directly.

This agent does NOT fix anything automatically — drift correction
requires a human decision, so it only reports.
"""

import json
from typing import Any

from backend.database.db import get_connection


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


def _load_tools() -> list[dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def run_discovery() -> dict[str, Any]:
    """
    Scans the current agent/tool inventory and reports any drift.

    Returns:
        dict with:
          agent_count, tool_count            — basic inventory stats
          orphaned_tool_refs                 — agents referencing tools
                                                that don't exist in the
                                                tools table
          unused_tools                       — tools not referenced by
                                                any agent
          status                             — 'clean' or 'drift_found'
    """
    agents = _load_agents()
    tools = _load_tools()

    tool_names = {tool["name"] for tool in tools}
    referenced_tool_names: set[str] = set()

    orphaned_tool_refs: list[dict[str, Any]] = []

    for agent in agents:
        for tool_name in agent["tools"]:
            referenced_tool_names.add(tool_name)
            if tool_name not in tool_names:
                orphaned_tool_refs.append({
                    "agent_id": agent["id"],
                    "agent_name": agent["name"],
                    "missing_tool": tool_name,
                })

    unused_tools = [
        tool["name"] for tool in tools
        if tool["name"] not in referenced_tool_names
    ]

    status = "drift_found" if orphaned_tool_refs else "clean"

    return {
        "agent_count": len(agents),
        "tool_count": len(tools),
        "orphaned_tool_refs": orphaned_tool_refs,
        "unused_tools": unused_tools,
        "status": status,
    }


if __name__ == "__main__":
    report = run_discovery()
    print(f"Agents scanned: {report['agent_count']}")
    print(f"Tools scanned:  {report['tool_count']}")
    print(f"Status:         {report['status']}")

    if report["orphaned_tool_refs"]:
        print("\n⚠️  Orphaned tool references found:")
        for ref in report["orphaned_tool_refs"]:
            print(f"  - Agent '{ref['agent_name']}' ({ref['agent_id']}) "
                  f"references missing tool '{ref['missing_tool']}'")
    else:
        print("\n✅ No orphaned tool references.")

    if report["unused_tools"]:
        print(f"\nℹ️  Tools not referenced by any agent: {report['unused_tools']}")