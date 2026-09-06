"""
compliance_agent.py
----------------------
Compliance Agent — thin wrapper around the existing RAG pipeline
(rag_service.query_compliance), exposed through the same agent
interface as discovery_agent, risk_agent, policy_agent, and
runtime_agent, so the orchestrator can call it uniformly.

No new logic here — all the real work (chunk retrieval, context
assembly, LLM call) already lives in rag_service.py from Phase 6.
This agent exists purely so compliance questions can be run via
run_task("ask_compliance", question="...") alongside every other
governance task, instead of only through the /compliance/ask
HTTP endpoint.
"""

from typing import Any

from backend.services.rag_service import query_compliance


def ask_compliance(question: str, n_results: int = 3) -> dict[str, Any]:
    """
    Answers a compliance question grounded in the ingested policy docs.

    Args:
        question:  The compliance question to answer
        n_results: Number of policy chunks to retrieve (default 3)

    Returns:
        dict with 'answer', 'sources', and 'chunks_used'
        (same shape as rag_service.query_compliance)
    """
    if not question or len(question.strip()) < 5:
        raise ValueError("Question too short.")

    return query_compliance(question.strip(), n_results=n_results)


if __name__ == "__main__":
    result = ask_compliance("What happens if an agent tries to access PII without authorization?")
    print(f"Answer:  {result['answer']}")
    print(f"Sources: {result['sources']}")