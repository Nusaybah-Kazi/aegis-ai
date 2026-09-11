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
| **Role-Based Access (RBAC)** | Different users see different things — an Employee never sees the Admin approval queue |
| **JWT (JSON Web Token)** | A signed "wristband" issued at login that proves who a user is on every request |
| **Intent Parsing** | Turning a free-text chat message into a structured tool call (tool name + parameters) |

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

### How Phase 10–11 fit into this picture

Everything above already works — but today, *anyone* who opens the app sees *everything* (admin dashboards included), and there's no way to simulate an actual employee talking to an agent. Phase 10 adds real login with two roles (Admin / Employee). Phase 11 gives Employees a chat interface that talks to an AI agent in plain English, with their requests flowing through the exact same Runtime Gateway you already built — so you can demo the whole story end-to-end: employee asks → gateway evaluates → admin reviews if needed → audit trail records it.

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
│       ├── App.jsx                ← Router + layout + role-based route guards
│       ├── index.css              ← Global styles + Tailwind
│       ├── api/
│       │   └── client.js          ← Axios API client (calls FastAPI, attaches JWT)
│       ├── context/
│       │   └── AuthContext.jsx    ← Stores logged-in user + role + JWT app-wide
│       ├── pages/
│       │   ├── Landing.jsx        ← Public marketing/intro page (NEW — Phase 11)
│       │   ├── Login.jsx          ← Login form (NEW — Phase 10)
│       │   ├── Register.jsx       ← Signup form + optional admin invite code (NEW — Phase 10)
│       │   ├── Dashboard.jsx      ← Agent count, avg risk, recent alerts [Admin]
│       │   ├── AgentInventory.jsx ← Table of agents with risk badges [Admin]
│       │   ├── AgentDetail.jsx    ← Per-agent risk, tools, dependency map [Admin]
│       │   ├── RuntimeGateway.jsx ← Live tool call feed + approval queue [Admin]
│       │   ├── AuditTrail.jsx     ← Filterable immutable log viewer [Admin]
│       │   ├── ComplianceChat.jsx ← Chat interface to RAG assistant [Admin]
│       │   ├── EmployeeChat.jsx   ← Chat interface for Employees → Gateway (NEW — Phase 11)
|       │   ├── Landing.jsx      ← Public intro page (Phase 11)
│       |   ├── EmployeeChat.jsx ← Internal AI chat (Phase 11)
│       |   ├── ExternalAI.jsx   ← External AI proxy UI (Phase 11)
│       |   └── MyRequests.jsx   ← Employee request history (Phase 10 Milestone D)
│       └── components/
│           ├── Sidebar.jsx        ← Navigation sidebar (role-aware)
│           ├── RiskBadge.jsx      ← Color-coded risk score badge
│           ├── AgentCard.jsx      ← Agent summary card
│           ├── PolicyAlert.jsx    ← Policy violation banner
│           ├── StatCard.jsx       ← Dashboard stat card
│           ├── ApprovalQueue.jsx  ← Human-in-the-loop approval panel
│           └── ProtectedRoute.jsx ← Route wrapper that checks role before rendering (NEW — Phase 10)
│
├── backend/                       ← FastAPI + Uvicorn backend
│   ├── main.py                    ← FastAPI app + router registration + CORS
│   ├── routers/
│   |   ├── chat.py   ← Internal AI + External AI proxy endpoints (Phase 11)
│   │   ├── agents.py              ← CRUD for agent inventory
│   │   ├── tools.py               ← Tool/permission registry
│   │   ├── gateway.py             ← Runtime security gateway
│   │   ├── audit.py               ← Audit trail endpoints
│   │   ├── compliance.py          ← RAG compliance assistant
│   │   ├── auth.py                ← Register / login / me (NEW — Phase 10)
│   │   └── chat.py                ← Employee chat → intent parser → gateway (NEW — Phase 11)
│   ├── models/
│   │   ├── agent.py               ← Agent data model
│   │   ├── tool.py                ← Tool/permission model
│   │   ├── policy.py              ← Policy model
│   │   ├── audit_log.py           ← Audit log entry model
│   │   ├── risk.py                ← Risk assessment model
│   │   └── user.py                ← User / auth request-response models (NEW — Phase 10)
│   ├── services/
|   │   ├── sensitivity_scanner.py  ← PII/credentials/company data detector (Phase 11)
│   │   ├── risk_engine.py         ← Risk scoring logic
│   │   ├── policy_checker.py      ← Policy evaluation logic
│   │   ├── rag_service.py         ← RAG pipeline (ChromaDB + Groq)
│   │   ├── audit_service.py       ← Audit trail writer
│   │   ├── groq_client.py         ← Groq API wrapper
│   │   ├── auth_service.py        ← Password hashing + JWT issue/verify (NEW — Phase 10)
│   │   └── intent_parser.py       ← Free text → {tool_name, parameters} via Groq (NEW — Phase 11)
│   ├── dependencies/
│   │   └── auth.py                ← get_current_user / require_admin FastAPI dependencies (NEW — Phase 10)
│   ├── agents/                    ← Multi-agent architecture
│   │   ├── orchestrator.py        ← Governance orchestrator
│   │   ├── discovery_agent.py     ← Finds & catalogs AI systems
│   │   ├── risk_agent.py          ← Assesses risk continuously
│   │   ├── policy_agent.py        ← Evaluates policy compliance
│   │   ├── runtime_agent.py       ← Runtime security enforcement
│   │   └── compliance_agent.py    ← Compliance reporting & investigation
│   └── database/
│       ├── db.py                  ← SQLite connection (dev) / setup
│       ├── init_db.py             ← Schema creation + seed data (adds `users` table — Phase 10)
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
│   ├── test_rag.py
│   └── test_auth.py               ← NEW — Phase 10
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
- Guide one step/file at a time — wait for my confirmed output before moving on.
- Never use && in PowerShell — write commands on separate lines.
- Always use `uv run` (never raw `python script.py`).
- Run `uv run ruff check --fix` before every commit.
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

### Phase 5 — Policy Engine ✅ COMPLETE
- [x] Define policy data model and seed sample policies
- [x] Build `policy_checker.py` — evaluates action against applicable policies
- [x] Integrate policy check into gateway flow
- [x] Verify: policy violation → action blocked with policy reference

### Phase 6 — RAG Compliance Assistant ✅ COMPLETE
- [x] Install chromadb (1.5.9 — pre-built wheels, no C++ Build Tools needed)
- [x] Set up ChromaDB vector store (PersistentClient, cosine similarity, all-MiniLM-L6-v2 embeddings)
- [x] Build document ingestion pipeline (reads `data/policies/`, chunks at 500 chars with 50 char overlap)
- [x] Build `rag_service.py` — retrieve relevant policy chunks + assemble context
- [x] Build `groq_client.py` — Groq API wrapper with `<think>` tag stripping for thinking models
- [x] Build `GET /compliance/ask?q=...` endpoint
- [x] Verify: ask "Why was the ₹25,000 refund blocked?" → grounded answer citing refund_policy.md

### Phase 7 — Multi-Agent Architecture ✅ COMPLETE
- [x] Build `orchestrator.py` — routes tasks to specialist agents
- [x] Build `discovery_agent.py` — scans and updates inventory
- [x] Build `risk_agent.py` — continuous risk reassessment
- [x] Build `policy_agent.py` — policy compliance evaluation
- [x] Build `runtime_agent.py` — runtime enforcement decisions
- [x] Build `compliance_agent.py` — compliance reporting
- [x] Verify: orchestrator routes a discovery request → inventory updated

### Phase 8 — React Frontend ✅ COMPLETE
- [x] Install Node.js 18+
- [x] Scaffold React app with Vite
- [x] Install dependencies: Tailwind CSS v4, React Router, Axios, Recharts, Lucide React
- [x] Configure Tailwind CSS (v4 — via @tailwindcss/vite plugin, no config file)
- [x] Build layout: `App.jsx` with sidebar navigation
- [x] Build `api/client.js` — Axios instance pointing to FastAPI
- [x] Build `Dashboard.jsx`, `AgentInventory.jsx`, `AgentDetail.jsx`, `RuntimeGateway.jsx`, `AuditTrail.jsx`, `ComplianceChat.jsx`
- [x] Verify: all pages load, gateway approval flow works end-to-end ✅

### Phase 9 — GitHub + Deployment ✅ COMPLETE
- [x] Push all code to GitHub (check `.gitignore` — no secrets committed)
- [x] Write `README.md` with setup instructions
- [x] Deploy backend to **Render** (free tier)
- [x] Deploy frontend to **Vercel** (free)
- [x] Verify: live URLs work, compliance chat answers questions

**Live URLs:**
- Backend: https://aegis-ai-backend-8ie5.onrender.com
- Frontend: https://aegis-ai-ivory.vercel.app

### Phase 10 — Authentication & Role-Based Access
> Goal: replace "anyone can see everything" with real accounts and two roles — **Admin** and **Employee** — using free tools only (`bcrypt`, `python-jose`, existing SQLite DB, plain-text invite code in `.env`).

- [x] Add `users` table to `init_db.py` (id, name, email, password_hash, role, created_at)
- [x] Build `backend/models/user.py` — `UserCreate`, `UserLogin`, `UserResponse`
- [x] Build `backend/services/auth_service.py` — password hashing (bcrypt) + JWT create/verify (python-jose)
- [x] Build `backend/routers/auth.py` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- [x] Registration logic: blank/wrong invite code → `role = employee`; correct `ADMIN_INVITE_CODE` → `role = admin`
- [x] Build `backend/dependencies/auth.py` — `get_current_user` and `require_admin` FastAPI dependencies
- [x] Protect sensitive existing routes with `require_admin` (gateway approve/deny, agents/tools write endpoints)
- [x] Audit trail made permanently immutable — `DELETE /audit/clear` removed entirely
- [x] Add `bcrypt==4.0.1`, `python-jose[cryptography]`, `email-validator` to `requirements.txt`
- [x] Add `JWT_SECRET_KEY` and `ADMIN_INVITE_CODE` to `.env.example`
- [x] Frontend: `AuthContext.jsx` — stores JWT + role app-wide, attaches JWT to every Axios call
- [x] Frontend: `Login.jsx` and `Register.jsx` (register form includes optional "Admin invite code" field)
- [x] Frontend: `ProtectedRoute.jsx` — redirects based on role
- [x] Frontend: role-aware `Sidebar.jsx` — admin sees platform nav, employee sees workspace nav
- [x] Add `user_id` column to `audit_log` and `approval_queue` tables (tracks which employee triggered each entry)
- [x] `backend/routers/chat.py` — attach `user_id` to every gateway evaluation from employees
- [x] Frontend: `MyRequests.jsx` — employee sees only their own audit entries filtered by user_id
- [x] Wire `/requests` route in `App.jsx`
- [x] Add `JWT_SECRET_KEY` and `ADMIN_INVITE_CODE` to `.env.example`
- [x] Verify: employee sees only their own requests; admin sees all

### Phase 11 — AI Chat, External AI Monitor & Sensitivity Scanner
> Goal: give employees a built-in AI assistant and an external AI proxy (ChatGPT, Gemini, any provider), both routed through a sensitivity scanner that detects PII, credentials, company data, and customer data before any prompt leaves the org.

#### Backend
- [ ] Build `backend/services/sensitivity_scanner.py`
      — uses Groq to scan every prompt for 4 categories:
        PII (names, emails, phone, Aadhaar),
        Company internals (revenue, strategy, product plans),
        Customer data (orders, transactions, customer records),
        Credentials (passwords, API keys, tokens)
      — returns: `{safe: bool, risk_level, findings: [], reason}`
- [ ] Build `backend/routers/chat.py` with two endpoints:
      `POST /chat/internal` — employee chats with Groq AI; prompt scanned first;
        clean → LLM answers; sensitive → blocked; borderline → paused for admin
      `POST /chat/external` — employee sends prompt to any external AI
        (ChatGPT/Gemini/etc); prompt scanned first; if clean, Aegis proxies
        using company-managed API key from `.env`; response returned to employee
- [ ] Add `OPENAI_API_KEY` and `GOOGLE_API_KEY` to `.env.example`
- [ ] Add `openai` and `google-generativeai` to `requirements.txt`
- [ ] All chat interactions logged to `audit_log` with `user_id`, `tool_name=internal_ai`
      or `tool_name=external_ai`, decision, findings, and risk score
- [ ] External AI: if provider key not configured in `.env` → return clear
      "provider not available" message to employee

#### Frontend
- [ ] Build `frontend/src/pages/EmployeeChat.jsx`
      — tabbed UI: "AI Assistant" tab (internal Groq) + "External AI" tab
      — Internal tab: chat bubbles, input box, blocked messages shown in red with reason
      — External tab: provider selector (ChatGPT / Gemini / Groq), prompt input,
        safety verdict shown before/alongside response, blocked prompts explained
- [ ] Build `frontend/src/pages/MyRequests.jsx`
      — table of employee's own audit entries (timestamp, tool, decision, risk, reason)
      — filter by decision (approved / blocked / paused)
      — paused entries show "Pending admin review" status badge
- [ ] Wire `/requests` route in `App.jsx`
- [ ] Update `Sidebar.jsx` employee nav:
      AI Assistant → `/chat`, External AI → `/external`, My Requests → `/requests`

#### Landing Page
- [ ] Build `frontend/src/pages/Landing.jsx`
      — public page (no login needed) explaining what Aegis AI does
      — sections: hero, how it works (3 steps), key features, Login/Register CTAs
- [ ] Wire `/` to `Landing.jsx` for unauthenticated users, redirect to role home if logged in

### Phase 12 — Polish & Demo
- [ ] Add demo scenario: Employee sends prompt with customer PII → blocked by scanner
- [ ] Add demo scenario: Employee uses External AI (ChatGPT) → Aegis scans → proxies → returns response
- [ ] Add demo scenario: High-risk request paused → Admin approves → Employee sees outcome in My Requests
- [ ] Add demo scenario: Compliance question answered from policy docs
- [ ] Add demo scenario: Permission change triggers risk reassessment
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

### 06-Sep-2026 — Phase 6
**What I learned:** RAG pipeline: chunk policy docs → embed into ChromaDB →
similarity search on query → inject chunks as context → LLM answers from
your docs, not training data. ChromaDB 1.5.9 ships pre-built wheels so
no C++ Build Tools needed. Thinking models on Groq wrap reasoning in
<think>...</think> tags — strip them with regex. Thinking models need large
max_tokens (2000+) or they exhaust the budget on reasoning before writing
the answer. Model IDs change — always verify against client.models.list()
rather than hardcoding from docs.
**Where I got stuck:** llama3-8b-8192 decommissioned; a thinking model's
`<think>` tags were eating the entire token budget at 600 max_tokens.
**How I solved it:** Listed available models via Groq client API; stripped
`<think>` tags with re.sub; bumped max_tokens to 2000.
**Next session goal:** Phase 7 — Multi-Agent Architecture (orchestrator + specialist agents)

### 06-Sep-2026 — Phase 6 verification
**What I learned:** A thinking model can silently produce empty answers when
max_tokens is too low for its reasoning + response combined, while Groq's
free-tier OTPM cap (1000/min) rejects requests where max_tokens is set too
high. Switched default model to openai/gpt-oss-20b to avoid the tradeoff entirely.
**Where I got stuck:** /compliance/ask returned 200 with an empty "answer"
field — no error, just silent failure. Needed to inspect raw JSON to catch it.
**How I solved it:** Swapped the default model in groq_client.py.
**Next session goal:** Phase 7 — Multi-Agent Architecture

### 06-Sep-2026 — Phase 7
**What I learned:** An orchestrator is just a dispatch table — task name
in, matching agent function out, wrapped in a consistent envelope. Built
5 specialist agents on top of existing services (discovery, risk, policy,
runtime, compliance) rather than duplicating logic. Discovery/risk/policy
agents are read-only reporters by design — they never write fixes back to
the DB; that stays a human decision.
**Where I got stuck:** Running new agent files directly with
`python path/to/file.py` failed with `ModuleNotFoundError: No module named
'backend'` — Python only adds the script's own directory to sys.path, not
the project root. Fixed by running as a module instead:
`python -m backend.agents.discovery_agent`.
**How I solved it:** N/A (see above)
**Next session goal:** Phase 8 — React Frontend

### 09-Sep-2026 — Phase 8
**What I learned:** Tailwind v4 drops tailwind.config.js entirely — theme is defined
in @theme blocks inside CSS, and the plugin wires into Vite directly via
@tailwindcss/vite. React Router v7 works the same as v6 for basic routing.
Frontend-backend field name mismatches (tool_id vs tool_name, action_type vs action)
are the most common integration bug — always check the backend's OpenAPI schema at
/docs before wiring up API calls. Vite must be run from the frontend/ directory or
it can't resolve node_modules.
**Where I got stuck:** Tailwind v4 config (no tailwind.config.js); package install
running from wrong directory; gateway 422 errors due to wrong request field names;
tool lookup 404 because backend expects tool_name string not tool_id.
**How I solved it:** Switched to @tailwindcss/vite + @theme in CSS; verified field
names via /docs Swagger UI; updated client.js to map frontend field names to backend
schema; updated demo scenarios to use tool_name directly.
**Next session goal:** Phase 9 — push to GitHub, deploy backend to Render,
deploy frontend to Vercel.

### 09-Sep-2026 — Phase 9
**What I learned:** Render's free tier has an ephemeral filesystem — SQLite
and ChromaDB data don't persist across restarts, so the app must self-seed
on every boot via a FastAPI @app.on_event("startup") hook (safe here since
init_db uses INSERT OR IGNORE and vector_store uses upsert). Render's build
environment defaults to the newest Python (3.14), which lacks pre-built
wheels for pinned older pydantic-core versions and tries to compile from
Rust source in a read-only filesystem — fails outright. Fix is a
PYTHON_VERSION env var (runtime.txt alone wasn't picked up). Vercel/Render
GitHub Apps are scoped per-account — being a repo collaborator doesn't
surface someone else's private app installation; forking the repo to your
own account is the simplest fix when repos are public. Vercel needs an
explicit Root Directory setting when the deployable app lives in a
subfolder (frontend/), or it misdetects the project type from repo-root
files.
**Where I got stuck:** Render build failed on pydantic-core (Rust/maturin,
read-only filesystem) under Python 3.14; runtime.txt didn't pin the version
as expected; Vercel's GitHub App couldn't see a collaborator's repo; Vercel
initially misdetected the project as FastAPI before Root Directory was set.
**How I solved it:** Set PYTHON_VERSION=3.13.14 as a Render env var; forked
the repo to my own GitHub account for Vercel access; set Root Directory to
`frontend` in Vercel, which correctly auto-detected Vite afterward.
**Also fixed:** accidentally pasted a real GROQ_API_KEY into chat — rotated
the key immediately and updated it in both local .env and Render's env vars.
**Next session goal:** Fix two known gaps found during Phase 9 verification:
risk_engine wasn't actually blocking refunds over ₹25,000 despite
refund_policy.md claiming it does; and client.js's orchestrate() called a
POST /orchestrator/run endpoint that didn't exist yet.

### 10-Sep-2026 — Bug fixes (pre–Phase 10)
**What I learned:** Both known gaps from Phase 9 verification are now fixed.
**Where I got stuck:** N/A
**How I solved it:** N/A
**Next session goal:** Phase 10 — Authentication & Role-Based Access
(users table, password hashing, JWT, admin invite code, protecting existing routes)

### 11-Sep-2026 — Phase 10 (Milestones A–C)
**What I learned:** JWT auth flow end-to-end — bcrypt password hashing, JWT
issue/verify with python-jose, FastAPI dependency injection for route protection
(`require_admin` as a `Depends` parameter). Immutable audit trail is a hard
compliance requirement — no delete endpoint, not even for admins. passlib's
bcrypt backend is broken on Python 3.13 (missing `__about__` attribute) — 
switched to calling the `bcrypt` library directly. `EmailStr` in Pydantic v2
requires `email-validator` as a separate install. Role-based routing on the
frontend: `ProtectedRoute` checks role before rendering, `AuthContext` rehydrates
JWT + user from localStorage on page load so refresh doesn't log you out.
Frontend `.env` pointing at Render meant local auth changes had no effect until
redeployed — always check which API URL the frontend is hitting before debugging.
**Where I got stuck:** passlib bcrypt failure on Python 3.13; missing
`email-validator`; `clearAuditLogs` import in AuditTrail.jsx broke the frontend
after we removed the endpoint; blank screen traced to frontend hitting Render
instead of localhost.
**How I solved it:** Replaced passlib with direct bcrypt calls; added
email-validator to requirements.txt; removed Clear button and import from
AuditTrail.jsx; switched .env to Render URL and redeployed.
**Next session goal:** Phase 10 Milestone D — Employee view (My Requests page)
then Phase 11 (EmployeeChat + intent parser + Landing page).

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
| Password hashing | passlib (bcrypt) | Open source |
| Auth tokens | python-jose (JWT) | Open source |
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
| `backend/services/auth_service.py` | Password hashing + JWT (Phase 10) |
| `backend/services/intent_parser.py` | Chat text → structured tool call (Phase 11) |
| `backend/dependencies/auth.py` | Route protection (Phase 10) |
| `frontend/src/App.jsx` | React entry point + routing + role guards |
| `frontend/src/context/AuthContext.jsx` | App-wide auth/role state (Phase 10) |
| `frontend/src/api/client.js` | All API calls to FastAPI |
| `frontend/src/pages/Landing.jsx` | Public intro page (Phase 11) |
| `frontend/src/pages/EmployeeChat.jsx` | Employee agent chat (Phase 11) |
| `frontend/src/pages/Dashboard.jsx` | Main admin dashboard page |
| `data/policies/` | Drop new policy docs here for RAG |
| `.env` | Your secrets — NEVER commit this |

---

## 🚦 Quick Start Commands

```bash
# 1. Activate environment
.venv\Scripts\activate

# 2. Install Python dependencies
uv pip install -r requirements.txt

# 3. Set up database
uv run python backend/database/init_db.py

# 4. Start backend (terminal 1)
uv run uvicorn backend.main:app --reload --port 8000

# 5. Start frontend (terminal 2)
cd frontend
npm run dev

# 6. View API docs
# Open: http://localhost:8000/docs

# 7. View frontend
# Open: http://localhost:5173
```

---

*Last updated: 05-Sep-2026 — Phase 4 (Runtime Gateway) complete.*
*Last updated: 06-Sep-2026 — Phase 7 (Multi-Agent Architecture) complete.*
*Last updated: 09-Sep-2026 — Phase 9 (GitHub + Deployment) complete: backend live on Render, frontend live on Vercel, compliance chat verified working end-to-end in production.*
*Last updated: 10-Sep-2026 — Known Phase 9 bugs fixed. Added Phase 10 (Authentication & Role-Based Access) and Phase 11 (Employee Simulation & Landing Experience); Polish & Demo moved to Phase 12 (last).*