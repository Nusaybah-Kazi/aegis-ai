# Aegis AI — Project Progress & Learning Guide

> **AI Security, Governance & Compliance Platform for AI Agents**
> *Your personal build log — concepts first, always.*

---

## 🧠 Concepts First

Before writing a single line of code, understand **what you're building and why**.

### What is Aegis AI?

Aegis AI is a **centralized platform** that does three things:

1. **Inventory & Map** — Knows every AI agent, model, tool, database and API in your org, and how they connect.
2. **Assess & Enforce** — Continuously checks agent behavior against policies. Blocks or pauses risky actions. Routes high-risk decisions to humans.
3. **Audit & Report** — Records every decision in an immutable trail. Answers compliance questions using your own policy documents (RAG).

### Key Concepts You Must Understand

| Concept | Plain English |
|---|---|
| **AI Agent** | An LLM that can take actions — call APIs, query DBs, send emails |
| **Tool / MCP** | A capability an agent can invoke (e.g., `process_refund`, `query_db`) |
| **Risk Score** | A number (0–100) indicating how dangerous an agent's action is |
| **Policy** | An org rule — e.g., "Refunds > ₹5,000 need manager approval" |
| **RAG** | Retrieval-Augmented Generation — AI answers from *your* documents, not just training data |
| **Audit Trail** | Immutable log of every action + decision, timestamped |
| **Runtime Gateway** | The security layer that intercepts agent tool calls and evaluates them *before* execution |
| **Human-in-the-Loop** | High-risk actions are paused; a human approves or denies |
| **Multi-Agent Architecture** | Specialized sub-agents (discovery, risk, policy, compliance) coordinated by an orchestrator |
| **Governance Orchestrator** | The "brain" that routes tasks to the right specialist agent |

### Why Each Component Matters

```
User Query / Agent Action
         ↓
  [ Runtime Gateway ]  ← intercepts every tool call
         ↓
  [ Policy Checker ]   ← does this violate any rule?
         ↓
  [ Risk Scorer ]      ← how dangerous is this action?
         ↓
  Low Risk → Auto-approve → Execute → Log
  High Risk → Pause → Human Review → Approve/Deny → Log
         ↓
  [ Audit Trail ]      ← everything recorded forever
         ↓
  [ Compliance Assistant (RAG) ] ← answer "why was this blocked?"
```

---

## 📁 Full Folder Structure

```
aegis-ai/
│
├── README.md
├── progress.md                    ← YOU ARE HERE
├── requirements.txt               ← Python backend deps
├── .env.example                   ← env vars template (never commit .env)
├── .gitignore
│
├── frontend/                      ← React + Vite frontend
│   ├── index.html
│   ├── package.json               ← Node deps (React, Vite, Tailwind, etc.)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env                       ← VITE_API_URL=http://localhost:8000
│   └── src/
│       ├── main.jsx               ← React entry point
│       ├── App.jsx                ← Router + layout
│       ├── index.css              ← Global styles + Tailwind
│       ├── api/
│       │   └── client.js          ← Axios API client (calls FastAPI)
│       ├── pages/
│       │   ├── Dashboard.jsx      ← Agent count, avg risk, recent alerts
│       │   ├── AgentInventory.jsx ← Table of agents with risk badges
│       │   ├── AgentDetail.jsx    ← Per-agent risk, tools, dependency map
│       │   ├── RuntimeGateway.jsx ← Live tool call feed + approval queue
│       │   ├── AuditTrail.jsx     ← Filterable immutable log viewer
│       │   └── ComplianceChat.jsx ← Chat interface to RAG assistant
│       └── components/
│           ├── Sidebar.jsx        ← Navigation sidebar
│           ├── RiskBadge.jsx      ← Color-coded risk score badge
│           ├── AgentCard.jsx      ← Agent summary card
│           ├── PolicyAlert.jsx    ← Policy violation banner
│           ├── StatCard.jsx       ← Dashboard stat card
│           └── ApprovalQueue.jsx  ← Human-in-the-loop approval panel
│
├── backend/                       ← FastAPI + Uvicorn backend
│   ├── main.py                    ← FastAPI app + router registration + CORS
│   ├── routers/
│   │   ├── agents.py              ← CRUD for agent inventory
│   │   ├── tools.py               ← Tool/permission registry
│   │   ├── gateway.py             ← Runtime security gateway
│   │   ├── audit.py               ← Audit trail endpoints
│   │   └── compliance.py          ← RAG compliance assistant
│   ├── models/
│   │   ├── agent.py               ← Agent data model
│   │   ├── tool.py                ← Tool/permission model
│   │   ├── policy.py              ← Policy model
│   │   ├── audit_log.py           ← Audit log entry model
│   │   └── risk.py                ← Risk assessment model
│   ├── services/
│   │   ├── risk_engine.py         ← Risk scoring logic
│   │   ├── policy_checker.py      ← Policy evaluation logic
│   │   ├── rag_service.py         ← RAG pipeline (ChromaDB + Groq)
│   │   ├── audit_service.py       ← Audit trail writer
│   │   └── groq_client.py         ← Groq API wrapper
│   ├── agents/                    ← Multi-agent architecture
│   │   ├── orchestrator.py        ← Governance orchestrator
│   │   ├── discovery_agent.py     ← Finds & catalogs AI systems
│   │   ├── risk_agent.py          ← Assesses risk continuously
│   │   ├── policy_agent.py        ← Evaluates policy compliance
│   │   ├── runtime_agent.py       ← Runtime security enforcement
│   │   └── compliance_agent.py    ← Compliance reporting & investigation
│   └── database/
│       ├── db.py                  ← SQLite connection (dev) / setup
│       ├── init_db.py             ← Schema creation + seed data
│       └── vector_store.py        ← ChromaDB vector store setup
│
├── data/
│   ├── policies/                  ← Org policy documents for RAG
│   │   ├── refund_policy.md
│   │   ├── data_access_policy.md
│   │   └── ai_usage_policy.md
│   ├── seed/
│   │   ├── agents.json            ← Sample agent definitions
│   │   └── tools.json             ← Sample tool definitions
│   └── aegis.db                   ← SQLite database (gitignored)
│
├── tests/
│   ├── test_risk_engine.py
│   ├── test_policy_checker.py
│   ├── test_gateway.py
│   └── test_rag.py
│
└── docs/
    ├── architecture.md            ← System design notes
    ├── api_reference.md           ← Backend API docs
    └── demo_scenarios.md          ← Walk-through scenarios for demo
```

---

## ⚙️ Claude Project Setup (claude.ai — Web/Mobile)

> This section covers how to configure Claude as your AI coding assistant using **Claude Projects on claude.ai** — no desktop app or MCP needed.

### What You Need

- Free Claude account at [claude.ai](https://claude.ai) (no card needed)
- VS Code as your local IDE
- A GitHub repo to store and share code between sessions
- Node.js 18+ installed (for React frontend)

### How Context Works Without MCP

Claude on the web has **no direct access to your filesystem**. Instead, you share context by:

| Method | When to use |
|---|---|
| **Paste file contents** | Small files — paste the code directly into chat |
| **Upload files** | Share `.py`, `.jsx`, `.md`, `.json` files (Claude reads them) |
| **Project Instructions** | Persistent rules Claude follows in every conversation |
| **Project Knowledge** | Upload key files once — Claude references them in all chats |

> **Workflow habit:** At the start of each session, upload the files you're working on. At the end, copy Claude's output into VS Code and commit to GitHub.

### Step-by-Step Claude Project Configuration

1. **Go to [claude.ai](https://claude.ai)** and sign in.

2. **Create a new Project** — click "Projects" in the sidebar → "New Project" → name it `Aegis AI`.

3. **Set the Project Instructions** (replaces MCP system prompt):

```
You are my senior engineer for the Aegis AI project — an AI Security,
Governance & Compliance platform.

Backend: Python 3.13, FastAPI, Uvicorn, SQLite, ChromaDB, Groq API (free tier).
Frontend: React + Vite, Tailwind CSS, React Router, Axios, Recharts.
Deployment: Backend on Render (free), Frontend on Vercel (free).

Rules:
- Explain concepts before writing code.
- Prefer simple, readable code over clever abstractions.
- Always tell me which file to create/edit and its exact path.
- When writing code, output the complete file — no partial snippets.
- Remind me to save and commit to GitHub after each working feature.
- Follow the build phases in progress.md in order.
- All dependencies must be free and open source (no paid APIs except Groq free tier).
```

4. **Upload key files to Project Knowledge** (these persist across all chats):
   - `progress.md` — upload once, re-upload when updated
   - `requirements.txt` — once created in Phase 1
   - `frontend/package.json` — once created in Phase 8
   - Any policy docs from `data/policies/` used for RAG

5. **Each coding session workflow:**
   ```
   Start session → upload file(s) you're editing
   Ask Claude to implement the next checklist item
   Copy output → paste into VS Code → save → test
   Commit to GitHub
   Next session → upload updated file(s)
   ```

### Sharing Code with Claude (Practical Tips)

- **Single file:** paste directly with a label: *"Here is `backend/services/risk_engine.py`:"*
- **Multiple files:** upload them all at the start of the session
- **Error messages:** paste the full terminal output — Claude needs the exact traceback
- **Confirm Claude's output:** always run the code locally before moving to the next step; paste errors back if anything breaks

---

## ✅ Build Checklist — Phase by Phase

### Phase 0 — Environment Setup ✅ COMPLETE
- [x] Install Python 3.11+ — Python 3.13.14
- [x] Install VS Code + Python extension
- [x] Create GitHub repo: `aegis-ai`
- [x] Initialize git + connect remote origin
- [x] Create Conda environment: `conda create -n aegis-ai python=3.13`
- [x] Activate: `conda activate aegis-ai`
- [x] Get free Groq API key at [console.groq.com](https://console.groq.com)
- [x] Create `.env` from `.env.example`
- [x] Verify: `python --version`, `pip --version`

### Phase 1 — Project Scaffold ✅ COMPLETE
- [x] Create full folder structure (all dirs + empty `__init__.py` files)
- [x] Create `requirements.txt` with all dependencies
  - ⚠️ `chromadb` commented out — requires Microsoft C++ Build Tools on Windows; revisit in Phase 6
- [x] Create `.gitignore`
- [x] Create `.env.example`
- [x] Initialize SQLite DB with schema (`init_db.py`) — 5 tables created
  - agents, tools, policies, audit_log, approval_queue
- [x] Seed with sample agents (3), tools (8), policies (3)
- [x] Create policy documents for RAG (`data/policies/`)
- [x] Verify: `python backend/database/init_db.py` ✅
- [x] Push to GitHub

### Phase 2 — Backend Core (FastAPI + Uvicorn) ✅ COMPLETE
- [x] Create Pydantic models (agent, tool, audit_log, risk)
- [x] Create FastAPI app (`backend/main.py`) with CORS enabled for React
- [x] Run with Uvicorn: `uvicorn backend.main:app --reload`
- [x] Build Agent inventory endpoints (GET all, GET by id, POST, PUT, DELETE)
- [x] Build Tool/permission registry endpoints (GET all, GET by id, POST, PUT, DELETE)
- [x] Build Audit log endpoints (GET all, GET by id, POST, DELETE/clear)
- [x] Verify: `http://localhost:8000/docs` — Swagger UI shows Agents, Tools, Audit Trail, Health
- [x] Verify: GET /agents/ returns 3 seeded agents ✅
- [x] Verify: GET /tools/ returns 8 seeded tools ✅
- [x] Verify: POST /audit/ creates log entry with timestamp ✅
- [x] Push to GitHub

### Phase 3 — Risk Engine ✅ COMPLETE
- [x] Define risk scoring rules (action type, data sensitivity, permission level)
- [x] Build `risk_engine.py` service
- [x] Integrate risk score into agent model
- [x] Add risk recalculation on permission change
- [x] Verify: POST a tool call → receive risk score response

### Phase 4 — Runtime Gateway ✅ COMPLETE
- [x] Build gateway endpoint: `POST /gateway/evaluate`
- [x] Implement: auto-approve low-risk, block violations, pause high-risk
- [x] Add human approval queue (DB-backed)
- [x] Build `POST /gateway/approve` and `POST /gateway/deny`
- [x] Verify: simulate refund > ₹5,000 → action paused, appears in queue

### Phase 5 — Policy Engine
- [x] Define policy data model and seed sample policies
- [x] Build `policy_checker.py` — evaluates action against applicable policies
- [x] Integrate policy check into gateway flow
- [x] Verify: policy violation → action blocked with policy reference

### Phase 6 — RAG Compliance Assistant
- [ ] Install C++ Build Tools and install chromadb (Windows prerequisite)
- [ ] Set up ChromaDB vector store
- [ ] Build document ingestion pipeline (reads `data/policies/`)
- [ ] Build `rag_service.py` — retrieve relevant policy chunks
- [ ] Build `groq_client.py` — call Groq LLM with retrieved context
- [ ] Build `GET /compliance/ask?q=...` endpoint
- [ ] Verify: ask "Why was the ₹25,000 refund blocked?" → grounded answer

### Phase 7 — Multi-Agent Architecture
- [ ] Build `orchestrator.py` — routes tasks to specialist agents
- [ ] Build `discovery_agent.py` — scans and updates inventory
- [ ] Build `risk_agent.py` — continuous risk reassessment
- [ ] Build `policy_agent.py` — policy compliance evaluation
- [ ] Build `runtime_agent.py` — runtime enforcement decisions
- [ ] Build `compliance_agent.py` — compliance reporting
- [ ] Verify: orchestrator routes a discovery request → inventory updated

### Phase 8 — React Frontend
- [ ] Install Node.js 18+
- [ ] Scaffold React app with Vite: `npm create vite@latest frontend -- --template react`
- [ ] Install dependencies: Tailwind CSS, React Router, Axios, Recharts, Lucide React
- [ ] Configure Tailwind CSS
- [ ] Build layout: `App.jsx` with sidebar navigation
- [ ] Build `api/client.js` — Axios instance pointing to FastAPI
- [ ] Build `Dashboard.jsx` — stat cards (agent count, avg risk, alerts), risk chart
- [ ] Build `AgentInventory.jsx` — searchable/filterable agent table with risk badges
- [ ] Build `AgentDetail.jsx` — tool list, risk history chart, dependency info
- [ ] Build `RuntimeGateway.jsx` — live tool call feed + approval queue with approve/deny
- [ ] Build `AuditTrail.jsx` — filterable, paginated log viewer
- [ ] Build `ComplianceChat.jsx` — chat interface to RAG assistant
- [ ] Verify: all pages load, gateway approval flow works end-to-end

### Phase 9 — GitHub + Deployment
- [ ] Push all code to GitHub (check `.gitignore` — no secrets committed)
- [ ] Write `README.md` with setup instructions
- [ ] Deploy backend to **Render** (free tier — connect GitHub, set env vars)
- [ ] Deploy frontend to **Vercel** (free — connect GitHub, set `VITE_API_URL` to Render URL)
- [ ] Verify: live URLs work, compliance chat answers questions

### Phase 10 — Polish & Demo
- [ ] Add demo scenario: Customer Refund Agent blocked at ₹25,000
- [ ] Add demo scenario: Permission change triggers risk reassessment
- [ ] Add demo scenario: Compliance question answered from policy docs
- [ ] Record a short walkthrough video (optional)
- [ ] Update `docs/demo_scenarios.md`

---

## 📚 Learning Log

> Use this section to record what you learn as you build. One entry per session.

### Template
```
### [Date] — [Topic]
**What I learned:** 
**Where I got stuck:** 
**How I solved it:** 
**Next session goal:** 
```

### Log

### 04-Sep-2026 — Phase 0 & 1
**What I learned:** Project scaffolding, conda environments, SQLite schema design, git setup, Python package management with uv
**Where I got stuck:** `chromadb` requires Microsoft C++ Build Tools on Windows — blocked install
**How I solved it:** Commented out chromadb for now, will revisit in Phase 6 after installing build tools
**Next session goal:** Phase 2 — FastAPI backend core; also decided to switch from Streamlit to React + Vite frontend for a more interactive, professional UI

### 04-Sep-2026 — Phase 2
**What I learned:** FastAPI router structure, Pydantic models for request/response validation, CORS middleware setup, SQLite queries with row_factory for dict-like rows, Swagger UI auto-generation
**Where I got stuck:** Nothing blocked — clean run
**How I solved it:** N/A
**Next session goal:** Phase 3 — Risk Engine (scoring logic + integration into gateway)

### 04-Sep-2026 — Phase 3 (follow-up)
**What I learned:** Hooking a side-effect (risk recalculation) into an existing update endpoint, writing system-generated entries into the audit log
**Where I got stuck:** Nothing major — one copy-paste truncation caused a SyntaxError, fixed by re-pasting the full file
**How I solved it:** N/A
**Next session goal:** Phase 4 — Runtime Gateway

### 05-Sep-2026 — Phase 4
**What I learned:** Building a gateway that reuses existing services (risk_engine) rather than duplicating logic; branching a decision into approve/pause/block based on a risk_engine recommendation; a DB-backed human-approval queue with a shared _resolve() helper for approve/deny to avoid duplicating the "already reviewed" guard; switched from conda to a plain venv (uv venv) since conda wasn't installed — same isolation, different tool.
**Where I got stuck:** Noticed a data drift — the DB's `process_refund` risk_weight (95) didn't match the seed JSON file (80), likely from an earlier manual PUT during Phase 3 testing. Not a bug, but a reminder that `init_db.py`'s `INSERT OR IGNORE` won't re-sync existing rows to the seed file.
**How I solved it:** Confirmed via GET /tools/tool-001 that the DB value was authoritative and the gateway was working correctly off live data; left the drift as-is since it doesn't affect correctness.
**Next session goal:** Phase 5 — Policy Engine (policy_checker.py + policy table integration into gateway flow)

### 05-Sep-2026 — Phase 5
**What I learned:** Policy engine sits above the risk engine in the gateway —
policies can only make decisions stricter, never looser. Three rule types:
amount_limit (threshold comparison), permission (always triggers), data_access
(sensitivity-based). The strictest verdict wins when multiple policies apply.
Also fixed a fundamental flaw in the risk engine: fixed risk_weight meant every
tool call scored the same regardless of amount. Replaced it with ratio-based
scaling (amount ÷ threshold) so small actions score proportionally lower.
**Where I got stuck:** query_customer_pii didn't exist in the tools table —
policy seed data was misaligned with tool seed data. Also hit a Windows
triple-quote issue running multi-line python -c commands.
**How I solved it:** Fixed policy applies_to via a script; fixed tool
data_sensitivity from high → medium; rewrote risk_engine base scoring
to scale with amount ratio.
**Next session goal:** Phase 6 — RAG Compliance Assistant
(install C++ Build Tools, ChromaDB, ingest policy docs, build /compliance/ask endpoint)

---

## 🛠️ Free Stack Reference

| Component | Tool | Why Free |
|---|---|---|
| Language | Python 3.13 | Open source |
| Backend framework | FastAPI | Open source |
| ASGI server | Uvicorn | Open source |
| Frontend framework | React + Vite | Open source |
| Frontend styling | Tailwind CSS | Open source |
| Frontend charts | Recharts | Open source |
| Frontend routing | React Router | Open source |
| HTTP client (frontend) | Axios | Open source |
| Database (dev) | SQLite | Built into Python |
| Vector store (RAG) | ChromaDB | Open source, runs locally |
| LLM API | Groq API | Free tier, no card needed |
| IDE | VS Code | Free |
| Version control | GitHub | Free public/private repos |
| Backend deployment | Render | Free tier |
| Frontend deployment | Vercel | Free tier, no card needed |

---

## 🔑 Key Files to Know

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app — start here for backend |
| `backend/services/risk_engine.py` | Core risk scoring logic |
| `backend/services/policy_checker.py` | Policy evaluation |
| `backend/agents/orchestrator.py` | Multi-agent coordinator |
| `backend/services/rag_service.py` | RAG pipeline |
| `frontend/src/App.jsx` | React entry point + routing |
| `frontend/src/api/client.js` | All API calls to FastAPI |
| `frontend/src/pages/Dashboard.jsx` | Main dashboard page |
| `data/policies/` | Drop new policy docs here for RAG |
| `.env` | Your secrets — NEVER commit this |

---

## 🚦 Quick Start Commands

```bash
# 1. Activate conda environment
conda activate aegis-ai

# 2. Install Python dependencies
uv pip install -r requirements.txt

# 3. Set up database
python backend/database/init_db.py

# 4. Start backend (terminal 1)
uvicorn backend.main:app --reload --port 8000

# 5. Start frontend (terminal 2)
cd frontend
npm run dev

# 6. View API docs
# Open: http://localhost:8000/docs

# 7. View frontend
# Open: http://localhost:5173
```

---

*Last updated: 05-Sep-2026 — Phase 4 (Runtime Gateway) complete: evaluate/approve/deny endpoints, approval queue, all four decision paths (approve/pause→approve/pause→deny/block) tested and verified via Swagger UI.*

