import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ArrowLeft, Zap, ShieldCheck, ShieldAlert, Database } from 'lucide-react'
import { getAgent, getTools, getAuditLogs } from '../api/client'
import RiskArc, { riskLabel, riskLevel } from '../components/RiskArc'
import RiskBadge from '../components/RiskBadge'

const DATA_SENS_COLOR = {
  high:   'text-crit border-crit/30 bg-crit/10',
  medium: 'text-high border-high/30 bg-high/10',
  low:    'text-low  border-low/30  bg-low/10',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-wire rounded px-3 py-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="text-ink">Risk: <span className="text-signal font-semibold">{payload[0]?.value}</span></p>
    </div>
  )
}

export default function AgentDetail() {
  const { id }  = useParams()
  const navigate = useNavigate()

  const [agent,   setAgent]   = useState(null)
  const [tools,   setTools]   = useState([])
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAgent(id), getTools(), getAuditLogs()])
      .then(([a, t, l]) => {
        setAgent(a.data)
        // Filter tools that belong to this agent
        const agentTools = (t.data ?? []).filter(tool =>
          tool.agent_id === id || tool.assigned_agents?.includes(id)
        )
        setTools(agentTools)
        // Audit logs for this agent
        const agentLogs = (l.data ?? []).filter(log => log.agent_id === id).slice(0, 50)
        setLogs(agentLogs)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Build risk history from audit logs
  const riskHistory = logs.slice().reverse().map((log, i) => ({
    t:    i + 1,
    risk: log.risk_score ?? 0,
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }))

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="shimmer h-8 w-48 rounded" />
        <div className="shimmer h-48 rounded-lg" />
        <div className="shimmer h-48 rounded-lg" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-8 text-center text-muted">
        <p>Agent not found.</p>
        <button onClick={() => navigate('/agents')} className="text-signal text-sm mt-2 hover:underline">
          Back to inventory
        </button>
      </div>
    )
  }

  const level = riskLevel(agent.risk_score ?? 0)

  return (
    <div className="p-8">
      {/* Back */}
      <button
        onClick={() => navigate('/agents')}
        className="flex items-center gap-1.5 text-muted text-sm hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        All agents
      </button>

      {/* Agent header */}
      <div className="bg-surface border border-wire rounded-lg p-6 mb-6 flex items-center gap-6">
        <RiskArc score={agent.risk_score ?? 0} size="lg" />
        <div className="flex-1">
          <h1 className="font-display text-xl font-semibold text-ink">{agent.name}</h1>
          <p className="text-xs text-muted font-mono mt-0.5">{agent.id}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {agent.type && (
              <span className="badge bg-surface2 text-muted border border-wire normal-case font-normal tracking-normal">
                {agent.type}
              </span>
            )}
            {agent.status && (
              <span className={`badge ${agent.status === 'active' ? 'bg-low/10 text-low border-low/20' : 'bg-muted/10 text-muted border-wire'}`}>
                {agent.status}
              </span>
            )}
            <RiskBadge score={agent.risk_score ?? 0} />
          </div>
          {agent.description && (
            <p className="text-sm text-muted mt-3 max-w-xl">{agent.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px bg-wire rounded-lg overflow-hidden text-center shrink-0">
          {[
            { label: 'Tools', value: tools.length },
            { label: 'Events', value: logs.length },
            { label: 'Approvals', value: logs.filter(l => l.decision === 'approved').length },
            { label: 'Blocks', value: logs.filter(l => l.decision === 'blocked').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface px-6 py-3">
              <p className="font-display text-lg font-semibold text-ink">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tools/permissions */}
        <div className="bg-surface border border-wire rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-signal" />
            <h2 className="font-display font-semibold text-ink text-sm">Tool Access</h2>
          </div>
          {tools.length === 0
            ? (
              <div className="flex flex-col items-center py-8 text-muted gap-2">
                <ShieldCheck size={24} strokeWidth={1.5} className="opacity-40" />
                <p className="text-xs">No tools assigned</p>
              </div>
            )
            : (
              <div className="space-y-2">
                {tools.map(tool => (
                  <div key={tool.id} className="flex items-center justify-between px-3 py-2.5 bg-surface2 rounded-md">
                    <div>
                      <p className="text-sm text-ink font-medium">{tool.name ?? tool.id}</p>
                      <p className="text-xs text-muted font-mono mt-0.5">{tool.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.data_sensitivity && (
                        <span className={`badge ${DATA_SENS_COLOR[tool.data_sensitivity] ?? 'text-muted border-wire bg-surface2'}`}>
                          <Database size={10} className="mr-1" />
                          {tool.data_sensitivity}
                        </span>
                      )}
                      <span className="font-display text-sm font-semibold text-muted">
                        {tool.risk_weight ?? '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Risk history chart */}
        <div className="bg-surface border border-wire rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={14} className="text-high" />
            <h2 className="font-display font-semibold text-ink text-sm">Risk History</h2>
          </div>
          {riskHistory.length < 2
            ? (
              <div className="flex flex-col items-center py-8 text-muted gap-2">
                <p className="text-xs">Not enough data yet</p>
              </div>
            )
            : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={riskHistory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="risk-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2E8FFF" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2E8FFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E2F45" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#4A6480', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#4A6480', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="risk" stroke="#2E8FFF" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Recent events */}
      <div className="mt-6 bg-surface border border-wire rounded-lg">
        <div className="px-5 py-4 border-b border-wire">
          <h2 className="font-display font-semibold text-ink text-sm">Recent Events</h2>
        </div>
        {logs.length === 0
          ? <p className="text-muted text-sm text-center py-8">No events recorded</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wire">
                  <th className="text-left text-xs text-muted px-5 py-2.5 font-medium">Action</th>
                  <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Tool</th>
                  <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Decision</th>
                  <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Risk</th>
                  <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="px-5 py-3 text-ink">{log.action_type}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{log.tool_id}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        log.decision === 'approved' ? 'bg-low/10 text-low border-low/20' :
                        log.decision === 'blocked'  ? 'bg-crit/10 text-crit border-crit/20' :
                        'bg-high/10 text-high border-high/20'
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RiskBadge score={log.risk_score ?? 0} /></td>
                    <td className="px-4 py-3 text-muted text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}
