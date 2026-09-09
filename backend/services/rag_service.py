# backend/services/rag_service.py
from backend.database.vector_store import get_collection
from backend.services.groq_client import chat

SYSTEM_PROMPT = """You are Aegis AI's Compliance Assistant.
Answer the question directly and concisely in 2-3 sentences.
Do not think step by step. Do not explain your reasoning process.
Start your response immediately with the answer.
Answer ONLY from the policy context provided.
If the context does not contain enough information, say so clearly.
Always cite which policy document your answer comes from.
"""

def query_compliance(question: str, n_results: int = 3) -> dict:
    """
    Retrieves relevant policy chunks from ChromaDB and asks Groq to answer
    the question grounded in those chunks.

    Args:
        question: The compliance question to answer
        n_results: Number of policy chunks to retrieve (default 3)

    Returns:
        dict with 'answer', 'sources', and 'chunks_used'
    """
    # Step 1: retrieve relevant chunks from vector store
    collection = get_collection()
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )

    # results["documents"] is a list of lists (one list per query)
    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]

    if not chunks:
        return {
            "answer": "No relevant policy documents found to answer this question.",
            "sources": [],
            "chunks_used": 0
        }

    # Step 2: build context block from retrieved chunks
    context_parts = []
    sources = []
    for i, (chunk, meta) in enumerate(zip(chunks, metadatas)):
        source = meta.get("source", "unknown")
        context_parts.append(f"[Source: {source}]\n{chunk}")
        if source not in sources:
            sources.append(source)

    context = "\n\n---\n\n".join(context_parts)

    # Step 3: build the full prompt and call Groq
    user_message = f"""Policy Context:
{context}

---

Question: {question}

Answer based only on the policy context above."""

    answer = chat(system_prompt=SYSTEM_PROMPT, user_message=user_message, max_tokens=800)

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(chunks)
    }