from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.init_db import init_db
from backend.database.vector_store import ingest_policies
from backend.routers import agents, audit, gateway, tools

app = FastAPI(
    title="Aegis AI — Governance & Compliance API",
    description="Runtime security gateway, risk engine, and compliance assistant for AI agents.",
    version="1.0.0"
)


@app.on_event("startup")
def startup_event():
    """
    Ensures the SQLite DB and ChromaDB vector store are initialized and
    seeded on every app startup. Required because Render's free tier has
    an ephemeral filesystem — any local writes are wiped on restart, so
    the app must be able to rebuild its own state from scratch every time
    it boots. Both init_db() and ingest_policies() are safe to re-run
    (INSERT OR IGNORE / upsert), so this never duplicates data.
    """
    init_db()
    ingest_policies()


# CORS — allows React (localhost:5173) and future Vercel URL to talk to this API
from fastapi import FastAPI

from backend.routers import orchestrator

app = FastAPI(
    title="Aegis AI — Governance & Compliance API",
    description="Runtime security gateway, risk engine, and compliance assistant for AI agents.",
    version="1.0.0"
)

# CORS — allows React (localhost:5173) and future Vercel URL to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # React dev server
        "http://localhost:3000",     # fallback
        "*"                          # update to Vercel URL in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agents.router)
app.include_router(tools.router)
app.include_router(audit.router)
app.include_router(gateway.router)
app.include_router(orchestrator.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "app": "Aegis AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}