import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  Bot, ShieldAlert, Clock, Activity, AlertTriangle,
} from 'lucide-react'
import { getAgents, getAuditLogs, getQueue } from '../api/client'
import StatCard  from '../components/StatCard'
import RiskBadge from '../components/RiskBadge'
import RiskArc, { riskLabel } from '../components/RiskArc'
import PageHeader from '../components/PageHeader'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-wire rounded px-3 py-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// Derived per-hour activity data from audit logs
function buildActivityData(logs) {
  const now   = Date.now()
  const hours = 12
  const buckets = Array.from({ length: hours }, (_, i) => {
    const t = new Date(now - (hours - 1 - i) * 3600000)
    return {
      time:     t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      approved: 0,
      blocked:  0,
      paused:   0,
    }
  })

  logs.forEach(log => {
    const ts  = new Date(log.timestamp)
    const age = (now - ts.getTime()) / 3600000
    const idx = Math.max(0, hours - 1 - Math.floor(age))
    if (idx < hours) {
      const v = log.decision?.toLowerCase()
      if (v === 'approved') buckets[idx].approved++
      else if (v === 'blocked') buckets[idx].blocked++
      else if (v === 'paused')  buckets[idx].paused++
    }
  })
  return buckets
}

export default function Dashboard() {
  const [agents, setAgents]     = useState([])
  const [logs,   setLogs]       = useState([])
  const [queue,  setQueue]      = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getAgents(), getAuditLogs(), getQueue()])
      .then(([a, l, q]) => {
        setAgents(a.data ?? [])
        setLogs((l.data ?? []).slice(0, 200))
        setQueue(q.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const avgRisk     = agents.length
    ? Math.round(agents.reduce((s, a) => s + (a.risk_score ?? 0), 0) / agents.length)
    : 0
  const critAgents  = agents.filter(a => (a.risk_score ?? 0) >= 75).length
  const pendingQ    = queue.filter(q => q.status === 'pending').length
  const actData     = buildActivityData(logs)
  const recentAlerts = logs.filter(l => l.decision === 'blocked' || l.decision === 'paused').slice(0, 6)

  return (
    <div className="p-8">
      <PageHeader
        title="Platform Overview"
        subtitle={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} — live data`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Agents monitored"
          value={loading ? '—' : agents.length}
          sub={`${critAgents} critical risk`}
          icon={Bot}
          accent="var(--signal)"
        />
        <StatCard
          label="Avg risk score"
          value={loading ? '—' : avgRisk}
          sub={riskLabel(avgRisk)}
          icon={Activity}
          accent={avgRisk >= 75 ? 'var(--crit)' : avgRisk >= 50 ? 'var(--high)' : avgRisk >= 25 ? 'var(--med)' : 'var(--low)'}
        />
        <StatCard
          label="Pending review"
          value={loading ? '—' : pendingQ}
          sub="awaiting human decision"
          icon={Clock}
          accent={pendingQ > 0 ? 'var(--high)' : 'var(--muted)'}
        />
        <StatCard
          label="Events logged (12h)"
          value={loading ? '—' : logs.length}
          sub="immutable audit trail"
          icon={ShieldAlert}
          accent="var(--muted)"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Activity chart — 2/3 width */}
        <div className="col-span-2 bg-surface border border-wire rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-ink text-sm">Gateway Activity</h2>
              <p className="text-xs text-muted mt-0.5">Decisions per hour, last 12h</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-low" />Approved</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-crit" />Blocked</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-high" />Paused</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={actData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="glow-low"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D48A" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00D48A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="glow-crit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF3B5C" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FF3B5C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="glow-high" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF8A00" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#FF8A00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E2F45" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#4A6480', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4A6480', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="approved" name="Approved" stroke="#00D48A" strokeWidth={1.5} fill="url(#glow-low)"  dot={false} />
              <Area type="monotone" dataKey="blocked"  name="Blocked"  stroke="#FF3B5C" strokeWidth={1.5} fill="url(#glow-crit)" dot={false} />
              <Area type="monotone" dataKey="paused"   name="Paused"   stroke="#FF8A00" strokeWidth={1.5} fill="url(#glow-high)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution — 1/3 */}
        <div className="bg-surface border border-wire rounded-lg p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Risk Distribution</h2>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-8 rounded" />)}</div>
            : (() => {
                const levels = [
                  { key: 'crit', label: 'Critical', color: 'var(--crit)', min: 75 },
                  { key: 'high', label: 'High',     color: 'var(--high)', min: 50 },
                  { key: 'med',  label: 'Medium',   color: 'var(--med)',  min: 25 },
                  { key: 'low',  label: 'Low',      color: 'var(--low)',  min: 0  },
                ]
                return (
                  <div className="space-y-3">
                    {levels.map(({ key, label, color, min }) => {
                      const max   = min + (min === 75 ? 25 : 25)
                      const count = agents.filter(a => {
                        const s = a.risk_score ?? 0
                        return min === 75 ? s >= 75 : (s >= min && s < min + 25)
                      }).length
                      const pct = agents.length ? (count / agents.length) * 100 : 0
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted">{label}</span>
                            <span style={{ color }} className="font-mono font-semibold">{count}</span>
                          </div>
                          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()
          }
        </div>
      </div>

      {/* Recent alerts */}
      <div className="mt-6 bg-surface border border-wire rounded-lg">
        <div className="px-5 py-4 border-b border-wire flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-high" />
            <h2 className="font-display font-semibold text-ink text-sm">Recent Alerts</h2>
          </div>
          <a href="/audit" className="text-xs text-signal hover:underline">View all</a>
        </div>
        {loading
          ? <div className="p-5 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-8 rounded" />)}</div>
          : recentAlerts.length === 0
            ? <p className="text-muted text-sm text-center py-8">No alerts in the last 12 hours</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wire">
                    <th className="text-left text-xs text-muted px-5 py-2.5 font-medium">Agent</th>
                    <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Action</th>
                    <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Decision</th>
                    <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Risk</th>
                    <th className="text-left text-xs text-muted px-4 py-2.5 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map(log => (
                    <tr key={log.id} className="table-row">
                      <td className="px-5 py-3 text-ink font-mono text-xs">{log.agent_id}</td>
                      <td className="px-4 py-3 text-ink">{log.action_type}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${log.decision === 'blocked' ? 'bg-crit/10 text-crit border-crit/20' : 'bg-high/10 text-high border-high/20'}`}>
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
