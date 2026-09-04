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
├── requirements.txt               ← all Python deps
├── .env.example                   ← env vars template (never commit .env)
├── .gitignore
│
├── app/                           ← Streamlit frontend
│   ├── main.py                    ← Streamlit entry point
│   ├── pages/
│   │   ├── 1_Dashboard.py         ← Agent inventory + risk overview
│   │   ├── 2_Agent_Detail.py      ← Per-agent risk + dependency map
│   │   ├── 3_Runtime_Gateway.py   ← Live tool call monitor + approvals
│   │   ├── 4_Audit_Trail.py       ← Immutable log viewer
│   │   └── 5_Compliance_Chat.py   ← RAG-powered compliance assistant
│   └── components/
│       ├── risk_badge.py          ← Reusable risk score badge
│       ├── agent_card.py          ← Agent summary card
│       └── policy_alert.py        ← Policy violation banner
│
├── backend/                       ← FastAPI + Uvicorn backend
│   ├── main.py                    ← FastAPI app + router registration
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

### How Context Works Without MCP

Claude on the web has **no direct access to your filesystem**. Instead, you share context by:

| Method | When to use |
|---|---|
| **Paste file contents** | Small files — paste the code directly into chat |
| **Upload files** | Share `.py`, `.md`, `.json`, `.txt` files (Claude reads them) |
| **Project Instructions** | Persistent rules Claude follows in every conversation |
| **Project Knowledge** | Upload key files once — Claude references them in all chats |

> **Workflow habit:** At the start of each session, upload the files you're working on. At the end, copy Claude's output into VS Code and commit to GitHub.

### Step-by-Step Claude Project Configuration

1. **Go to [claude.ai](https://claude.ai)** and sign in.

2. **Create a new Project** — click "Projects" in the sidebar → "New Project" → name it `Aegis AI`.

3. **Set the Project Instructions** (replaces MCP system prompt):

```
You are my senior engineer for the Aegis AI project — an AI Security,
Governance & Compliance platform built with Python, FastAPI, Uvicorn,
Streamlit, SQLite, ChromaDB and Groq API (free tier).

Rules:
- Explain concepts before writing code.
- Prefer simple, readable code over clever abstractions.
- Always tell me which file to create/edit and its exact path.
- When writing code, output the complete file — no partial snippets.
- Remind me to save and commit to GitHub after each working feature.
- Follow the build phases in progress.md in order.
- All dependencies must be free and open source (no paid APIs except Groq free tier).
Stack: Python 3.11+, FastAPI, Uvicorn, Streamlit, SQLite, ChromaDB, Groq API.
```

4. **Upload key files to Project Knowledge** (these persist across all chats):
   - `progress.md` — upload once, re-upload when updated
   - `requirements.txt` — once created in Phase 1
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

### Phase 0 — Environment Setup
- [x] Install Python 3.11+ — Python 3.13.14
- [x] Install VS Code + Python extension
- [x] Create GitHub repo: `aegis-ai` (public or private)
- [x] Clone repo locally
- [x] Create Conda environment: `conda create -n aegis-ai python=3.13`
- [x] Activate: `conda activate aegis-ai`
- [x] Get free Groq API key at [console.groq.com](https://console.groq.com)
- [x] Create `.env` from `.env.example`
- [x] Verify: `python --version`, `pip --version`

### Phase 1 — Project Scaffold
- [x] Create full folder structure (all dirs + empty `__init__.py` files)
- [x] Create `requirements.txt` with all dependencies (chromadb deferred — needs C++ build tools)
- [x] Create `.gitignore`
- [x] Create `.env.example`
- [x] Initialize SQLite DB with schema (`init_db.py`) — 5 tables created
- [x] Seed with sample agents (3) and tools (8) and policies (3)
- [x] Verify: `python backend/database/init_db.py` ✅

### Phase 2 — Backend Core (FastAPI + Uvicorn)
- [ ] Create FastAPI app (`backend/main.py`)
- [ ] Run with Uvicorn: `uvicorn backend.main:app --reload`
- [ ] Build Agent inventory endpoints (GET, POST, PUT)
- [ ] Build Tool/permission registry endpoints
- [ ] Build Audit log endpoints
- [ ] Verify: visit `http://localhost:8000/docs` — Swagger UI shows all routes
- [ ] Write basic tests for each router

### Phase 3 — Risk Engine
- [ ] Define risk scoring rules (action type, data sensitivity, permission level)
- [ ] Build `risk_engine.py` service
- [ ] Integrate risk score into agent model
- [ ] Add risk recalculation on permission change
- [ ] Verify: POST a tool call → receive risk score response

### Phase 4 — Runtime Gateway
- [ ] Build gateway endpoint: `POST /gateway/evaluate`
- [ ] Implement: auto-approve low-risk, block violations, pause high-risk
- [ ] Add human approval queue (in-memory → later DB-backed)
- [ ] Build `POST /gateway/approve` and `POST /gateway/deny`
- [ ] Verify: simulate refund > ₹5,000 → action paused, appears in queue

### Phase 5 — Policy Engine
- [ ] Define policy data model and seed sample policies
- [ ] Build `policy_checker.py` — evaluates action against applicable policies
- [ ] Integrate policy check into gateway flow
- [ ] Verify: policy violation → action blocked with policy reference

### Phase 6 — RAG Compliance Assistant
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

### Phase 8 — Streamlit Frontend
- [ ] Build main dashboard (`app/main.py`) — agent count, avg risk, recent alerts
- [ ] Build Agent Inventory page — table of agents with risk badges
- [ ] Build Agent Detail page — dependency map, permission list, risk history
- [ ] Build Runtime Gateway page — live tool call feed + approval queue
- [ ] Build Audit Trail page — filterable log viewer
- [ ] Build Compliance Chat page — chat interface to RAG assistant
- [ ] Verify: all pages load, gateway approval flow works end-to-end

### Phase 9 — GitHub + Deployment
- [ ] Push all code to GitHub (check `.gitignore` — no secrets committed)
- [ ] Write `README.md` with setup instructions
- [ ] Create `requirements.txt` final version
- [ ] Deploy to Streamlit Cloud (connect GitHub repo)
- [ ] Set environment variables in Streamlit Cloud secrets
- [ ] Verify: live URL works, compliance chat answers questions

### Phase 10 — Polish & Demo
- [ ] Add demo scenario: Customer Refund Agent blocked at ₹25,000
- [ ] Add demo scenario: Permission change triggers risk reassessment
- [ ] Add demo scenario: Compliance question answered from policy docs
- [ ] Record a short walkthrough video (optional)
- [ ] Update `docs/demo_scenarios.md`

---

## 📚 Learning Log

> Use this section to record what you learn as you build. One entry per session.

### 04-Sep-2026 — Phase 0 & 1
**What I learned:** Project scaffolding, conda environments, SQLite schema design, git setup
**Where I got stuck:** chromadb requires Microsoft C++ Build Tools on Windows — blocked install
**How I solved it:** Commented out chromadb for now, will revisit in Phase 6 after installing build tools
**Next session goal:** Phase 2 — FastAPI backend core

### Template
```
### [Date] — [Topic]
**What I learned:** 
**Where I got stuck:** 
**How I solved it:** 
**Next session goal:** 
```

### Log

*(Start adding entries here as you build)*

---

## 🛠️ Free Stack Reference

| Component | Tool | Why Free |
|---|---|---|
| Language | Python 3.11+ | Open source |
| Backend framework | FastAPI | Open source |
| ASGI server | Uvicorn | Open source |
| Frontend | Streamlit | Open source + free cloud tier |
| Database (dev) | SQLite | Built into Python |
| Vector store (RAG) | ChromaDB | Open source, runs locally |
| LLM API | Groq API | Free tier, no card needed |
| IDE | VS Code | Free |
| Version control | GitHub | Free public/private repos |
| Deployment | Streamlit Cloud | Free tier at streamlit.io/cloud |

---

## 🔑 Key Files to Know

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app — start here for backend |
| `backend/services/risk_engine.py` | Core risk scoring logic |
| `backend/services/policy_checker.py` | Policy evaluation |
| `backend/agents/orchestrator.py` | Multi-agent coordinator |
| `backend/services/rag_service.py` | RAG pipeline |
| `app/main.py` | Streamlit entry point |
| `data/policies/` | Drop new policy docs here for RAG |
| `.env` | Your secrets — NEVER commit this |

---

## 🚦 Quick Start Commands

```bash
# 1. Activate virtual environment
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up database
python backend/database/init_db.py

# 4. Start backend
uvicorn backend.main:app --reload --port 8000

# 5. Start frontend (new terminal)
streamlit run app/main.py

# 6. View API docs
# Open: http://localhost:8000/docs
```

---

*Last updated: Start of project — update this file as you progress!*
