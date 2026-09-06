# backend/database/vector_store.py
import os
import chromadb
from chromadb.utils import embedding_functions

# ChromaDB will store its data in this local directory
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "../../data/chroma_db")
POLICIES_DIR = os.path.join(os.path.dirname(__file__), "../../data/policies")
COLLECTION_NAME = "policies"

def get_chroma_client():
    """Returns a persistent ChromaDB client."""
    return chromadb.PersistentClient(path=os.path.abspath(CHROMA_PATH))

def get_collection():
    """Returns (or creates) the policies collection using the default embedding function."""
    client = get_chroma_client()
    ef = embedding_functions.DefaultEmbeddingFunction()
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )
    return collection

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Splits text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def ingest_policies():
    """
    Reads all .md files in data/policies/, chunks them,
    and upserts into ChromaDB. Safe to run multiple times.
    """
    collection = get_collection()
    policies_path = os.path.abspath(POLICIES_DIR)

    if not os.path.exists(policies_path):
        print(f"[vector_store] Policies directory not found: {policies_path}")
        return

    files = [f for f in os.listdir(policies_path) if f.endswith(".md")]
    if not files:
        print("[vector_store] No .md policy files found.")
        return

    total_chunks = 0
    for filename in files:
        filepath = os.path.join(policies_path, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        chunks = chunk_text(content)
        ids = [f"{filename}::chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

        # upsert = insert if new, update if exists (safe to re-run)
        collection.upsert(
            ids=ids,
            documents=chunks,
            metadatas=metadatas
        )
        total_chunks += len(chunks)
        print(f"[vector_store] Ingested {filename} → {len(chunks)} chunks")

    print(f"[vector_store] Done. Total chunks in store: {total_chunks}")

if __name__ == "__main__":
    ingest_policies()