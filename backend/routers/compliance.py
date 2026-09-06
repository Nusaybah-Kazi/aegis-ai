# backend/routers/compliance.py
from fastapi import APIRouter, HTTPException, Query
from backend.services.rag_service import query_compliance

router = APIRouter(prefix="/compliance", tags=["Compliance"])

@router.get("/ask")
def ask_compliance(q: str = Query(..., description="The compliance question to answer")):
    """
    Ask the RAG compliance assistant a question.
    Retrieves relevant policy chunks and returns a grounded answer.
    
    Example: GET /compliance/ask?q=Why was the refund blocked?
    """
    if not q or len(q.strip()) < 5:
        raise HTTPException(status_code=400, detail="Question too short.")
    
    try:
        result = query_compliance(q.strip())
        return {
            "question": q.strip(),
            "answer": result["answer"],
            "sources": result["sources"],
            "chunks_used": result["chunks_used"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {str(e)}")