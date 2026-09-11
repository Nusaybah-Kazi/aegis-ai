// frontend/src/api/client.js
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginUser    = (data) => api.post('/auth/login', data)
export const registerUser = (data) => api.post('/auth/register', data)
export const getMe        = ()     => api.get('/auth/me')

// ─── Agents ───────────────────────────────────────────────────────────────────
export const getAgents   = ()      => api.get('/agents/')
export const getAgent    = (id)    => api.get(`/agents/${id}`)
export const createAgent = (data)  => api.post('/agents/', data)
export const updateAgent = (id, d) => api.put(`/agents/${id}`, d)
export const deleteAgent = (id)    => api.delete(`/agents/${id}`)

// ─── Tools ────────────────────────────────────────────────────────────────────
export const getTools    = ()      => api.get('/tools/')
export const getTool     = (id)    => api.get(`/tools/${id}`)
export const createTool  = (data)  => api.post('/tools/', data)
export const updateTool  = (id, d) => api.put(`/tools/${id}`, d)
export const deleteTool  = (id)    => api.delete(`/tools/${id}`)

// ─── Gateway ──────────────────────────────────────────────────────────────────
export const evaluateAction = (data) => api.post('/gateway/evaluate', {
  agent_id:   data.agent_id,
  tool_name:  data.tool_name ?? data.tool_id,
  action:     data.action ?? data.action_type,
  parameters: JSON.stringify(data.payload ?? {}),
})

export const approveAction = (id, note, reviewerName) => api.post(`/gateway/approve/${id}`, {
  reviewed_by: reviewerName || 'admin',
  reason:      note || 'Approved via Aegis UI',
})
export const denyAction = (id, note, reviewerName) => api.post(`/gateway/deny/${id}`, {
  reviewed_by: reviewerName || 'admin',
  reason:      note || 'Denied via Aegis UI',
})
export const getQueue = () => api.get('/gateway/queue')

// ─── Audit ────────────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/audit/', { params })
export const getAuditLog  = (id)     => api.get(`/audit/${id}`)

// ─── Compliance (RAG) ─────────────────────────────────────────────────────────
export const askCompliance = (q) => api.get('/compliance/ask', { params: { q } })

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export const orchestrate = (data) => api.post('/orchestrator/run', data)

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthCheck = () => api.get('/health')

export default api