# Aegis AI 🛡️

**AI Security, Governance & Compliance Platform for AI Agents**

Aegis AI is a centralized security layer that sits between your employees and every AI agent, tool call, and external AI provider in your organization. Every prompt is scanned. Every action is risk-scored. Every decision is logged forever. High-risk requests pause for human review before anything executes.

Built entirely on a free, open-source stack — no paid APIs except Groq's free tier.

---

## The problem it solves

As AI agents proliferate inside organizations, they quietly gain the ability to process refunds, query customer records, send notifications, and call external APIs — often with no visibility, no policy enforcement, and no audit trail. A single misconfigured agent or a careless employee prompt can leak PII, trigger unauthorized transactions, or send sensitive internal data to an external AI provider.

Aegis AI intercepts every one of those actions before they execute.

---

## What it does

### 1. Inventory & Map
Tracks every AI agent, model, tool, and API in your org. Each agent has a live risk profile, a list of tools it can invoke, and a dependency map showing what it can touch.

### 2. Assess & Enforce — Runtime Gateway
Every tool call passes through a two-layer check before execution:

- **Policy Checker** — evaluates the action against org rules (e.g. "refunds above ₹5,000 need manager approval", "PII access is always blocked")
- **Risk Engine** — scores the action 0–100 based on tool sensitivity, data classification, and request parameters

Three outcomes:
- **Auto-approve** — low risk, clean policy check → executes immediately and logs
- **Pause** — high risk or borderline policy → queued for admin review; employee sees "pending" status
- **Block** — policy violation or unsafe content → rejected instantly with a reason

### 3. Sensitivity Scanner
Every employee prompt — whether going to the internal AI assistant or an external provider like ChatGPT — is scanned by an LLM-backed scanner before it leaves the org boundary. Four categories: PII, company internals, customer data, credentials. Unsafe prompts never reach any AI.

### 4. Audit Trail
Immutable. Every action, decision, risk score, policy reference, and reviewer is recorded. No delete endpoint exists, even for admins. Compliance questions are answered by a RAG assistant that cites your actual policy documents.

### 5. Role-Based Access
Two roles — **Admin** and **Employee** — with completely separate views:
- Employees see their own AI chat interface, request history, and outcomes
- Admins see the full platform: agent inventory, live gateway feed, approval queue, audit trail, compliance assistant, and all employees' chat histories

---

## How it works end-to-end

```
Employee types a prompt
        ↓
[ Sensitivity Scanner ]  ← scans for PII, credentials, company data
        ↓
   unsafe → blocked immediately, reason shown to employee
   borderline → paused, queued for admin review
   safe ↓
[ Intent Parser ]  ← is this a tool call or a chat question?
        ↓
  chat question → answered by internal AI → logged
  tool call ↓
[ Policy Checker ]  ← does this violate any org rule?
        ↓
[ Risk Engine ]  ← scores 0–100 based on tool + parameters
        ↓
  Low risk → auto-approved → executed → logged
  High risk → paused → Admin approves/denies → employee notified
  Violation → blocked → reason logged
        ↓
[ Audit Trail ]  ← every decision recorded forever
        ↓
[ Compliance Assistant (RAG) ]  ← "why was this blocked?" answered from policy docs
```

---

## Demo scenarios

**1. PII leak attempt blocked**
Employee types: *"Email john.doe@customer.com about his order refund"*
→ Scanner detects email address → blocked before reaching any AI

**2. High-value refund paused for approval**
Employee requests: *"Process a refund of ₹30,000 for order #4521"*
→ Policy: refunds above ₹25,000 require senior approval → paused
→ Admin reviews in approval queue → approves → employee sees outcome in My Requests

**3. External AI proxy with scanning**
Employee selects GPT-OSS and types a prompt containing an internal API key
→ Scanner detects credential → blocked, never reaches external provider

**4. Compliance question answered from policy docs**
Admin asks: *"Why was the ₹25,000 refund blocked?"*
→ RAG retrieves refund_policy.md → answers with exact policy citation

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  Admin: Dashboard, Agents, Gateway, Audit, RAG Chat  │
│  Employee: AI Assistant, External AI, My Requests    │
└───────────────────┬─────────────────────────────────┘
                    │ Axios + JWT
┌───────────────────▼─────────────────────────────────┐
│                  Backend (FastAPI)                   │
│                                                      │
│  /auth      — register, login, JWT                   │
│  /chat      — internal AI, external AI proxy,        │
│               sensitivity scanner, history           │
│  /gateway   — evaluate, approve, deny, queue         │
│  /agents    — inventory CRUD                         │
│  /tools     — tool registry                          │
│  /audit     — immutable log                          │
│  /compliance— RAG assistant                          │
└───────┬──────────────────────────┬──────────────────┘
        │                          │
┌───────▼──────┐          ┌────────▼────────┐
│   SQLite DB  │          │  ChromaDB        │
│  agents      │          │  policy doc      │
│  tools       │          │  embeddings      │
│  policies    │          │  (RAG store)     │
│  audit_log   │          └─────────────────┘
│  approval_q  │
│  users       │
└──────────────┘
```

### Multi-agent layer
Five specialist agents coordinate via an orchestrator:
- **Discovery Agent** — scans and catalogs AI systems
- **Risk Agent** — continuous risk reassessment on permission changes
- **Policy Agent** — evaluates policy compliance
- **Runtime Agent** — real-time enforcement decisions
- **Compliance Agent** — generates compliance reports

---

## Tech stack

| Component | Tool |
|---|---|
| Backend framework | FastAPI + Uvicorn |
| Database | SQLite (dev) |
| Vector store | ChromaDB |
| Embeddings | all-MiniLM-L6-v2 (local, no API needed) |
| LLM | Groq API free tier |
| Auth | bcrypt + python-jose (JWT) |
| Frontend | React + Vite + Tailwind CSS v4 |
| Charts | Recharts |
| HTTP client | Axios |
| Backend deployment | Render (free tier) |
| Frontend deployment | Vercel (free tier) |

Everything is free and open source. No credit card required.

---

## Local setup

### Prerequisites
- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) — Python package manager
- Free [Groq API key](https://console.groq.com) — no card needed

### 1. Clone and create environment

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

Open `.env` and fill in:
```
GROQ_API_KEY=your_key_here
JWT_SECRET_KEY=any_long_random_string
ADMIN_INVITE_CODE=your_chosen_admin_code
```

### 4. Initialize the database

```powershell
uv run python backend/database/init_db.py
```

Creates all tables, seeds sample agents/tools/policies, and creates a default admin account:
- Email: `admin@aegis.ai`
- Password: `Admin@123`

### 5. Build the vector store

Downloads the embedding model (~79 MB) on first run only.

```powershell
uv run python backend/database/vector_store.py
```

### 6. Start the backend

```powershell
uv run uvicorn backend.main:app --reload --port 8000
```

Swagger UI at `http://localhost:8000/docs`

### 7. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

App at `http://localhost:5173`

### 8. Create accounts

- **Admin** — log in with `admin@aegis.ai` / `Admin@123` (seeded automatically)
- **Employee** — go to `/register`, leave the invite code blank
- **Second admin** — go to `/register`, enter your `ADMIN_INVITE_CODE`

---

## Live deployment

| Service | URL |
|---|---|
| Backend (Render) | https://aegis-ai-backend-8ie5.onrender.com |
| Frontend (Vercel) | https://aegis-ai-ivory.vercel.app |

> Render's free tier has an ephemeral filesystem — the DB reseeds on every cold start. Re-register accounts after a cold start.

---

## Project structure

```
aegis-ai/
├── backend/
│   ├── main.py                    # FastAPI app + router registration
│   ├── routers/
│   │   ├── auth.py                # Register, login, JWT, user list
│   │   ├── chat.py                # Internal AI, external AI proxy, history
│   │   ├── gateway.py             # Runtime security gateway
│   │   ├── agents.py              # Agent inventory CRUD
│   │   ├── tools.py               # Tool registry
│   │   ├── audit.py               # Immutable audit trail
│   │   └── compliance.py          # RAG compliance assistant
│   ├── services/
│   │   ├── sensitivity_scanner.py # PII/credential/company data detector
│   │   ├── intent_parser.py       # Free text → structured tool call
│   │   ├── risk_engine.py         # Risk scoring logic
│   │   ├── policy_checker.py      # Policy evaluation
│   │   ├── rag_service.py         # RAG pipeline (ChromaDB + Groq)
│   │   ├── auth_service.py        # Password hashing + JWT
│   │   └── groq_client.py         # Groq API wrapper
│   ├── agents/
│   │   ├── orchestrator.py        # Routes tasks to specialist agents
│   │   ├── discovery_agent.py
│   │   ├── risk_agent.py
│   │   ├── policy_agent.py
│   │   ├── runtime_agent.py
│   │   └── compliance_agent.py
│   └── database/
│       ├── init_db.py             # Schema + seed + migrations
│       ├── db.py                  # SQLite connection
│       └── vector_store.py        # ChromaDB setup
├── frontend/src/
│   ├── pages/
│   │   ├── Landing.jsx            # Public intro page
│   │   ├── Login.jsx              # Login form
│   │   ├── Register.jsx           # Signup + admin invite code
│   │   ├── Dashboard.jsx          # Admin overview stats
│   │   ├── AgentInventory.jsx     # Agent list with risk badges
│   │   ├── AgentDetail.jsx        # Per-agent detail + dependency map
│   │   ├── RuntimeGateway.jsx     # Live tool call feed + approval queue
│   │   ├── AuditTrail.jsx         # Filterable immutable log viewer
│   │   ├── ComplianceChat.jsx     # RAG compliance assistant (admin)
│   │   ├── EmployeeChat.jsx       # AI assistant + external AI (employee)
│   │   ├── EmployeeHistories.jsx  # All employees' chat histories (admin)
│   │   └── MyRequests.jsx         # Employee's own request history
│   ├── components/
│   │   ├── Sidebar.jsx            # Role-aware navigation
│   │   ├── ProtectedRoute.jsx     # Role-based route guard
│   │   ├── RiskBadge.jsx
│   │   ├── StatCard.jsx
│   │   └── ApprovalQueue.jsx
│   └── api/client.js              # Axios client + all API calls
├── data/
│   ├── policies/                  # Org policy docs for RAG
│   └── seed/                      # Sample agents + tools JSON
├── .env.example
├── requirements.txt
└── progress.md                    # Full build log + learning notes
```

---

## Contributors

- [Nusaybah Kazi](https://github.com/Nusaybah-Kazi)
- [Iqra Ansari](https://github.com/Iqraansari-Z)
