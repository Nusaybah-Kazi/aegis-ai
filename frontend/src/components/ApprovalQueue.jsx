import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { approveAction, denyAction } from '../api/client'
import RiskBadge from './RiskBadge'

export default function ApprovalQueue({ items = [], onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  const [notes,    setNotes]    = useState({})
  const [loading,  setLoading]  = useState({})

  async function handleApprove(id) {
    setLoading(l => ({ ...l, [id]: true }))
    try { await approveAction(id, notes[id] || ''); onRefresh?.() }
    catch (e) { alert(e.response?.data?.detail ?? e.message) }
    finally { setLoading(l => ({ ...l, [id]: false })) }
  }

  async function handleDeny(id) {
    setLoading(l => ({ ...l, [id]: true }))
    try { await denyAction(id, notes[id] || ''); onRefresh?.() }
    catch (e) { alert(e.response?.data?.detail ?? e.message) }
    finally { setLoading(l => ({ ...l, [id]: false })) }
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
        <CheckCircle size={28} strokeWidth={1.5} className="text-low opacity-60" />
        <p className="text-sm">No actions pending review</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map(item => {
        const isOpen = expanded === item.id
        // Parse parameters JSON safely
        let params = {}
        try { params = JSON.parse(item.parameters ?? '{}') } catch {}

        return (
          <div key={item.id} className="bg-surface2 border border-high/20 rounded-lg overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpanded(isOpen ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors"
            >
              <Clock size={14} className="text-high flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-ink truncate">{item.tool_name} — {item.action}</p>
                <p className="text-xs text-muted">{item.agent_id} • {item.created_at}</p>
              </div>
              <RiskBadge score={item.risk_score ?? 0} />
              {isOpen
                ? <ChevronUp size={14} className="text-muted flex-shrink-0" />
                : <ChevronDown size={14} className="text-muted flex-shrink-0" />
              }
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="px-4 pb-4 border-t border-wire flex flex-col gap-3 pt-3 animate-fade_up">
                {/* Key fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted mb-1">Amount</p>
                    <p className="text-ink font-mono">
                      {params.amount ? `₹${Number(params.amount).toLocaleString('en-IN')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Queue ID</p>
                    <p className="text-ink font-mono">#{item.id}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted mb-1">Reason</p>
                    <p className="text-ink leading-relaxed">{item.reason ?? '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted mb-1">Parameters</p>
                    <pre className="mono bg-void rounded px-2 py-1.5 text-ink overflow-auto max-h-20">
                      {JSON.stringify(params, null, 2)}
                    </pre>
                  </div>
                </div>

                <textarea
                  value={notes[item.id] || ''}
                  onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                  placeholder="Add a review note (optional)"
                  rows={2}
                  className="w-full bg-void border border-wire rounded px-3 py-2 text-xs text-ink
                             placeholder:text-muted resize-none focus:outline-none focus:border-signal"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={loading[item.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md
                               bg-low/10 border border-low/30 text-low text-xs font-medium
                               hover:bg-low/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={13} strokeWidth={2} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeny(item.id)}
                    disabled={loading[item.id]}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md
                               bg-crit/10 border border-crit/30 text-crit text-xs font-medium
                               hover:bg-crit/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={13} strokeWidth={2} />
                    Deny
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
