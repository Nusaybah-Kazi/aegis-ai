// frontend/src/pages/MyRequests.jsx
import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, PauseCircle, RefreshCw } from 'lucide-react'
import { getAuditLogs } from '../api/client'

const DECISIONS = ['all', 'approved', 'blocked', 'paused']

const DECISION_CONFIG = {
  approved: { icon: CheckCircle,  color: 'text-low',  bg: 'bg-low/10  border-low/20',  label: 'Approved' },
  blocked:  { icon: XCircle,      color: 'text-crit', bg: 'bg-crit/10 border-crit/20', label: 'Blocked'  },
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
    fetch(`${base}/audit/my` +
      (filter !== 'all' ? `?decision=${filter}` : ''), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('aegis_token')}`,
      }
    })
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

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
      ) : logs.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={32} className="text-wire mx-auto mb-3" />
          <p className="text-muted text-sm">No requests found</p>
          <p className="text-wire text-xs mt-1">
            Your AI interactions will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
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
                      <p className="text-muted mb-1">Reason</p>
                      <p className="text-ink leading-relaxed">{log.reason ?? '—'}</p>
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