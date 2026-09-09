# Aegis AI

**AI Security, Governance & Compliance Platform for AI Agents**

Aegis AI is a centralized platform that inventories every AI agent and tool in
an organization, enforces policies and risk scoring on every tool call in
real time, and answers compliance questions grounded in your own policy
documents via RAG.

## What it does

1. **Inventory & Map** — tracks every AI agent, its tools, and their risk profiles.
2. **Assess & Enforce** — a runtime gateway intercepts every tool call, checks
   it against org policies and a risk score, then auto-approves, pauses for
   human review, or blocks it outright.
3. **Audit & Report** — every decision is logged to an immutable audit trail.
   A compliance assistant (RAG over your policy docs) answers questions like
   *"why was this refund blocked?"* with citations back to the source policy.

## Architecture
User Query / Agent Action
↓
Runtime Gateway ← intercepts every tool call
↓
Policy Checker ← does this violate any org rule?
↓
Risk Scorer ← how dangerous is this action?
↓
Low Risk → Auto-approve → Execute → Log
High Risk → Pause → Human Review → Approve/Deny → Log
↓
Audit Trail ← everything recorded forever
↓
Compliance Assistant (RAG) ← answers "why was this blocked?"


A multi-agent layer (`backend/agents/`) wraps the core services —
discovery, risk, policy, runtime, and compliance agents — coordinated by an
orchestrator that exposes them as a single, uniform task interface.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, Uvicorn, SQLite |
| Risk & Policy Engine | Custom Python services |
| Vector store (RAG) | ChromaDB |
| LLM | Groq API (free tier) |
| Frontend | React + Vite, Tailwind CSS v4, React Router, Axios, Recharts |
| Deployment | Render (backend), Vercel (frontend) |

## Project structure
aegis-ai/
├── backend/
│ ├── main.py # FastAPI app entry point
│ ├── routers/ # API endpoints (agents, tools, gateway, audit, compliance)
│ ├── models/ # Pydantic request/response models
│ ├── services/ # risk_engine, policy_checker, rag_service, groq_client
│ ├── agents/ # orchestrator + 5 specialist agents
│ └── database/ # SQLite connection, schema, seed data, vector store
├── frontend/
│ └── src/
│ ├── pages/ # Dashboard, AgentInventory, AgentDetail, RuntimeGateway,
│ │ # AuditTrail, ComplianceChat
│ ├── components/ # Sidebar, RiskBadge, RiskArc, StatCard, ApprovalQueue
│ └── api/client.js # Axios client for the FastAPI backend
├── data/
│ ├── policies/ # Org policy docs (.md) — source for the RAG assistant
│ └── seed/ # Sample agents.json / tools.json
└── requirements.txt


## Local setup

### Prerequisites
- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- A free [Groq API key](https://console.groq.com)

### 1. Clone and set up the environment

```powershell
git clone https://github.com/Nusaybah-Kazi/aegis-ai.git
cd aegis-ai
uv venv
.venv\Scripts\activate
```

### 2. Install backend dependencies

```powershell
uv pip install -r requirements.txt
```

### 3. Configure secrets

```powershell
Copy-Item .env.example .env
```

Open `.env` and add your own `GROQ_API_KEY`.

### 4. Initialize the database

```powershell
uv run python backend/database/init_db.py
```

### 5. Build the vector store (RAG)

Downloads an embedding model (~79MB) on first run.

```powershell
uv run python backend/database/vector_store.py
```

### 6. Start the backend

```powershell
uv run uvicorn backend.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 7. Start the frontend (separate terminal)

```powershell
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

## Live deployment

_Not yet deployed — links will be added here once the backend (Render) and
frontend (Vercel) are live._

## Contributors

- [Nusaybah Kazi](https://github.com/Nusaybah-Kazi)
- [Iqra Ansari](https://github.com/Iqraansari-Z)