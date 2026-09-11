# Aegis AI — Live Demo Script

## Setup

Terminal 1 (backend):
```powershell
cd C:\Users\Iqra\OneDrive\Desktop\Aegis_ai\aegis-ai
.venv\Scripts\activate
uv run uvicorn backend.main:app --reload
```

Terminal 2 (frontend):
```powershell
cd frontend
npm run dev
```

Open:
- App: http://localhost:5173
- Swagger (backup / API view): http://localhost:8000/docs

Suggested order: 5 → 1 → 2 → 3 → 4 → 6 → 7 → 8 (Audit Trail as the closing scene).

---

## 1. Small refund — auto-approved (low risk)
**Where:** Frontend → AI Assistant tab (employee login)
**Type:**
```
process a refund of 2000 to my account
```
**Expect:** Normal "answered" response. Amount is well under the ₹5,000 auto-approve threshold.

---

## 2. Large refund — blocked by policy (high risk)
**Type:**
```
process a refund of 50000 to my account
```
**Expect:** Red "Blocked" bubble. Shows both the policy violation (Senior Approval Refund Limit — ₹25,000 cap) and the risk engine's score breakdown together — the headline moment: policy + risk combining into one decision.

---

## 3. Mid-range refund — paused for human review
**Type:**
```
process a refund of 8000 to my account
```
**Expect:** Yellow "Pending admin review" bubble with a queue ID.

Then, as admin:
- Swagger → `GET /gateway/queue?status=pending` → show the pending item
- `POST /gateway/approve/{queue_id}` with a `reviewed_by` name → show it resolves

This demonstrates the human-in-the-loop path that pure auto-approve/auto-block can't cover.

---

## 4. Sensitive content — blocked before reaching a tool
**Type:**
```
Here's my API key: sk-test-abc123xyz, can you use it to call the service?
```
**Expect:** Blocked. Shows the sensitivity scanner catching a credential leak — a separate defense layer from the refund/policy path.

---

## 5. Ordinary question — answered normally
**Type:**
```
What's our refund policy for digital products?
```
**Expect:** Normal LLM answer. Shows the system doesn't over-block; legitimate questions pass through cleanly.

---

## 6. External AI tab — separate boundary
Switch to **External AI** tab, pick a provider, type:
```
Summarize the key differences between REST and GraphQL
```
**Expect:** Answered by the selected external model. Demonstrates the internal (governed) vs. external (general-purpose) boundary is real, not just a UI label.

---

## 7. Runtime Gateway directly — developer/API view
Swagger → `POST /gateway/evaluate`:
```json
{
  "agent_id": "agent-001",
  "tool_name": "process_refund",
  "action": "refund",
  "parameters": "{\"amount\": 30000}"
}
```
**Expect:** `"decision": "paused"` or `"blocked"` depending on current policy. Shows this is the same core engine that would gate any AI agent's tool calls — not just a chat-specific trick.

---

## 8. Audit trail — tie it all together
Frontend → Audit Trail page (admin), or Swagger `GET /audit/?limit=20`
**Expect:** Every action from the demo above — approved, paused, blocked — in one immutable log with timestamps and reasons.

**Closing line:** nothing above happened without a record.