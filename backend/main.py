from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.init_db import init_db
from backend.database.vector_store import ingest_policies
from backend.routers import agents, audit, gateway, tools
from backend.routers.compliance import router as compliance_router

app = FastAPI(
    title="Aegis AI — Governance & Compliance API",
    description="Runtime security gateway, risk engine, and compliance assistant for AI agents.",
    version="1.0.0"
)

# CORS must be added before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agents.router)
app.include_router(tools.router)
app.include_router(audit.router)
app.include_router(gateway.router)
app.include_router(compliance_router)

@app.on_event("startup")
def startup_event():
    init_db()
    ingest_policies()

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
