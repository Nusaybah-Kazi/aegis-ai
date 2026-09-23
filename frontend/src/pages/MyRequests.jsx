// frontend/src/pages/MyRequests.jsx
import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, PauseCircle, RefreshCw } from 'lucide-react'

const DECISIONS = ['all', 'approved', 'blocked', 'denied', 'paused']

const DECISION_CONFIG = {
  approved: { icon: CheckCircle,  color: 'text-low',  bg: 'bg-low/10  border-low/20',  label: 'Approved' },
  blocked:  { icon: XCircle,      color: 'text-crit', bg: 'bg-crit/10 border-crit/20', label: 'Blocked'  },
  denied:   { icon: XCircle,      color: 'text-crit', bg: 'bg-crit/10 border-crit/20', label: 'Denied'   },
  paused:   { icon: PauseCircle,  color: 'text-high', bg: 'bg-high/10 border-high/20', label: 'Pending Review' },
}

function DecisionBadge({ decision }) {
  const cfg = DECISION_CONFIG[decision] ?? { label: decision, color: 'text-muted', bg: 'bg-surface2 border-wire' }
  const Icon = cfg.icon ?? Clock
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// Groups paused + resolved rows that represent the same request into one
// card. A paused row and its later approved/denied row share the same
// tool_name, agent_id and parameters (the resolve step never changes them),
// so that combination is used as the grouping key.
function groupRequests(rows) {
  const groups = new Map()

  for (const row of rows) {
    const key = `${row.tool_name ?? ''}|${row.agent_id ?? ''}|${row.parameters ?? ''}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(row)
  }

  const result = []
  for (const entries of groups.values()) {
    // oldest first, so [0] is the original request and the last entry is
    // the most recent status (e.g. the admin's approve/deny)
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const original = entries[0]
    const latest = entries[entries.length - 1]

    result.push({
      id: latest.id,
      tool_name: latest.tool_name,
      agent_id: latest.agent_id,
      parameters: latest.parameters,
      risk_score: latest.risk_score,
      decision: latest.decision,
      reason: latest.reason,
      reviewed_by: latest.reviewed_by,
      timestamp: original.timestamp,
      resolved_at: entries.length > 1 ? latest.timestamp : null,
      original_reason: original.reason,
      wasResolved: entries.length > 1,
    })
  }

  // newest first, by the original request time
  result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return result
}

export default function MyRequests() {
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [expanded, setExpanded] = useState(null)

  function load() {
    setLoading(true)
    // calls GET /audit/my — returns only this employee's entries
    // .replace(/\/$/, '') strips any trailing slash from the env var so we
    // never accidentally build a double-slash URL like ".../aegis-ai//audit/my"
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    fetch(`${base}/audit/my`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('aegis_token')}`,
      }
    })
      .then(r => r.json())
      .then(data => setLogs(groupRequests(Array.isArray(data) ? data : [])))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const visibleLogs = filter === 'all' ? logs : logs.filter(log => log.decision === filter)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">My Requests</h1>
          <p className="text-muted text-sm mt-0.5">Your AI interaction history and request status</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-wire
                     text-xs text-muted hover:text-ink hover:border-muted transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-6">
        {DECISIONS.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
              ${filter === d
                ? 'bg-signal/20 text-signal border border-signal/30'
                : 'text-muted border border-wire hover:border-muted hover:text-ink'
              }`}
          >
            {d === 'paused' ? 'pending review' : d}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-lg" />
          ))}
        </div>
      ) : visibleLogs.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={32} className="text-wire mx-auto mb-3" />
          <p className="text-muted text-sm">No requests found</p>
          <p className="text-wire text-xs mt-1">
            Your AI interactions will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleLogs.map(log => (
            <div key={log.id}>
              <div
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="bg-surface border border-wire rounded-lg px-5 py-4 cursor-pointer
                           hover:border-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <DecisionBadge decision={log.decision} />
                    <div className="min-w-0">
                      <p className="text-sm text-ink font-medium truncate">
                        {log.tool_name ?? log.action ?? 'AI Interaction'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {log.agent_id ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {log.risk_score != null && (
                      <span className={`text-xs font-mono font-medium
                        ${log.risk_score >= 70 ? 'text-crit' :
                          log.risk_score >= 40 ? 'text-high' : 'text-low'}`}>
                        Risk {log.risk_score}
                      </span>
                    )}
                    <span className="text-xs text-muted tabular-nums">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'short', timeStyle: 'short'
                      })}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === log.id && (
                  <div className="mt-4 pt-4 border-t border-wire grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted mb-1">
                        {log.wasResolved ? 'Original reason' : 'Reason'}
                      </p>
                      <p className="text-ink leading-relaxed">{log.original_reason ?? '—'}</p>
                    </div>
                    {log.parameters && (
                      <div>
                        <p className="text-muted mb-1">Parameters</p>
                        <pre className="font-mono bg-void rounded px-2 py-1.5 text-ink
                                        overflow-auto max-h-20 text-xs">
                          {log.parameters}
                        </pre>
                      </div>
                    )}
                    {log.decision === 'paused' && (
                      <div className="col-span-2">
                        <p className="text-high text-xs flex items-center gap-1.5">
                          <PauseCircle size={12} />
                          This request is pending admin review. You'll see the outcome here once reviewed.
                        </p>
                      </div>
                    )}
                    {log.wasResolved && (
                      <div className="col-span-2 pt-3 border-t border-wire">
                        <p className="text-muted mb-1">
                          Admin note
                          {log.reviewed_by ? ` — ${log.reviewed_by}` : ''}
                          {log.resolved_at
                            ? ` · ${new Date(log.resolved_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
                            : ''}
                        </p>
                        <p className="text-ink leading-relaxed">{log.reason ?? '—'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}