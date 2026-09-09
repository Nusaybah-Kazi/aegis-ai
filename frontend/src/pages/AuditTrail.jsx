import { useEffect, useState } from 'react'
import { Search, Filter, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuditLogs, clearAuditLogs } from '../api/client'
import RiskBadge from '../components/RiskBadge'
import PageHeader from '../components/PageHeader'

const DECISIONS = ['all', 'approved', 'paused', 'blocked']
const PAGE_SIZE  = 20

const DECISION_STYLE = {
  approved: 'bg-low/10  text-low  border-low/20',
  blocked:  'bg-crit/10 text-crit border-crit/20',
  paused:   'bg-high/10 text-high border-high/20',
}

function exportCSV(logs) {
  const header = 'id,timestamp,agent_id,tool_id,action_type,decision,risk_score,policy_triggered\n'
  const rows   = logs.map(l =>
    [l.id, l.timestamp, l.agent_id, l.tool_id, l.action_type, l.decision, l.risk_score ?? '', l.policy_triggered ?? ''].join(',')
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'aegis-audit.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AuditTrail() {
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')
  const [decision, setDecision] = useState('all')
  const [page,     setPage]     = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [clearing, setClearing] = useState(false)

  function load() {
    setLoading(true)
    getAuditLogs()
      .then(r => setLogs(r.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = logs.filter(l => {
    const matchD = decision === 'all' || l.decision === decision
    const matchQ = !query || [l.agent_id, l.tool_id, l.action_type, l.policy_triggered]
      .some(v => v?.toLowerCase().includes(query.toLowerCase()))
    return matchD && matchQ
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleClear() {
    if (!confirm('Clear all audit logs? This cannot be undone.')) return
    setClearing(true)
    try { await clearAuditLogs(); load() }
    finally { setClearing(false) }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable record of every gateway decision"
      >
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-wire
                     text-xs text-muted hover:text-ink hover:border-muted transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-crit/20
                     text-xs text-crit/60 hover:text-crit hover:border-crit/40 transition-colors disabled:opacity-40"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search agent, tool, action…"
            className="w-full bg-surface border border-wire rounded-lg pl-8 pr-3 py-2 text-sm
                       text-ink placeholder:text-muted focus:outline-none focus:border-signal"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-muted" />
          {DECISIONS.map(d => (
            <button
              key={d}
              onClick={() => { setDecision(d); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${decision === d
                  ? 'bg-signal/20 text-signal border border-signal/30'
                  : 'text-muted border border-wire hover:border-muted hover:text-ink'
                }`}
            >
              {d}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted ml-auto">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-wire rounded-lg overflow-hidden">
        {loading
          ? <div className="p-6 space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="shimmer h-10 rounded" />)}</div>
          : paged.length === 0
            ? <p className="text-muted text-sm text-center py-16">No log entries match your filters</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wire">
                    {['Timestamp', 'Agent', 'Tool', 'Action', 'Decision', 'Risk', 'Policy'].map(h => (
                      <th key={h} className="text-left text-xs text-muted px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(log => (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="table-row cursor-pointer"
                      >
                        <td className="px-4 py-3 text-muted text-xs tabular-nums whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink">{log.agent_id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{log.tool_id}</td>
                        <td className="px-4 py-3 text-ink">{log.action_type}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${DECISION_STYLE[log.decision] ?? 'bg-surface2 text-muted border-wire'}`}>
                            {log.decision}
                          </span>
                        </td>
                        <td className="px-4 py-3"><RiskBadge score={log.risk_score ?? 0} /></td>
                        <td className="px-4 py-3 text-xs text-muted">{log.policy_triggered ?? '—'}</td>
                      </tr>
                      {expanded === log.id && (
                        <tr key={`${log.id}-exp`} className="bg-surface2">
                          <td colSpan={7} className="px-4 py-3 animate-fade_up">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="text-muted mb-1">Log ID</p>
                                <p className="font-mono text-ink">{log.id}</p>
                              </div>
                              <div>
                                <p className="text-muted mb-1">Reason</p>
                                <p className="text-ink">{log.reason ?? '—'}</p>
                              </div>
                              {log.payload && (
                                <div>
                                  <p className="text-muted mb-1">Payload</p>
                                  <pre className="mono bg-void rounded px-2 py-1.5 text-ink overflow-auto max-h-16">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-wire hover:border-muted transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded border text-xs transition-colors
                    ${n === page
                      ? 'border-signal/40 bg-signal/10 text-signal'
                      : 'border-wire hover:border-muted text-muted hover:text-ink'
                    }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-wire hover:border-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
