import { useEffect, useState, useRef } from 'react'
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Play, RefreshCw, Clock, Zap,
} from 'lucide-react'
import { evaluateAction, getQueue } from '../api/client'
import ApprovalQueue from '../components/ApprovalQueue'
import RiskArc from '../components/RiskArc'
import PageHeader from '../components/PageHeader'

const DECISION_STYLE = {
  approved: { icon: ShieldCheck,  color: 'text-low',   bg: 'bg-low/10  border-low/20',  label: 'Approved' },
  blocked:  { icon: ShieldX,      color: 'text-crit',  bg: 'bg-crit/10 border-crit/20', label: 'Blocked'  },
  paused:   { icon: Clock,        color: 'text-high',  bg: 'bg-high/10 border-high/20', label: 'Paused'   },
  error:    { icon: ShieldAlert,  color: 'text-muted', bg: 'bg-wire border-wire',        label: 'Error'    },
}

const DEMO_SCENARIOS = [
  {
    label: 'Small refund — ₹500',
    payload: { agent_id: 'agent-001', tool_name: 'process_refund', action: 'process_refund', payload: { amount: 500, customer_id: 'cust-42' } },
  },
  {
    label: 'Large refund — ₹25,000',
    payload: { agent_id: 'agent-001', tool_name: 'process_refund', action: 'process_refund', payload: { amount: 25000, customer_id: 'cust-99' } },
  },
  {
    label: 'DB query',
    payload: { agent_id: 'agent-002', tool_name: 'query_order', action: 'query_order', payload: { order_id: 'ord-123' } },
  },
  {
    label: 'Update inventory',
    payload: { agent_id: 'agent-002', tool_name: 'update_inventory', action: 'update_inventory', payload: { item_id: 'sku-99', delta: -5 } },
  },
  {
    label: 'Send notification',
    payload: { agent_id: 'agent-003', tool_name: 'send_notification', action: 'send_notification', payload: { customer_id: 'cust-01', channel: 'email' } },
  },
]

function getAmount(entry) {
  if (entry.payload?.amount) return entry.payload.amount
  try { return JSON.parse(entry.parameters ?? '{}').amount } catch { return null }
}

function FeedEntry({ entry }) {
  const style  = DECISION_STYLE[entry.decision] ?? DECISION_STYLE.error
  const Icon   = style.icon
  const amount = getAmount(entry)
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-wire last:border-0 animate-fade_up">
      <Icon size={14} className={`${style.color} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink font-medium">{entry.action ?? entry.action_type}</span>
          <span className={`badge ${style.bg} ${style.color}`}>{style.label}</span>
          {entry.policy_triggered && (
            <span className="badge bg-surface2 text-muted border-wire text-xs normal-case font-normal tracking-normal">
              {entry.policy_triggered}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span className="font-mono">{entry.agent_id}</span>
          <span>·</span>
          <span className="font-mono">{entry.tool_name ?? entry.tool_id}</span>
          {amount && (
            <>
              <span>·</span>
              <span>₹{Number(amount).toLocaleString('en-IN')}</span>
            </>
          )}
        </div>
        {entry.reason && (
          <p className="text-xs text-muted mt-1 italic">{entry.reason}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <RiskArc score={entry.risk_score ?? 0} size="sm" showLabel={false} />
        <span className="text-xs text-muted tabular-nums">
          {new Date(entry.timestamp ?? Date.now()).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default function RuntimeGateway() {
  const [feed,      setFeed]      = useState([])
  const [queue,     setQueue]     = useState([])
  const [custom, setCustom] = useState('{\n  "agent_id": "agent-001",\n  "tool_name": "process_refund",\n  "action": "process_refund",\n  "payload": { "amount": 5000 }\n}')
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [qLoading,  setQLoading]  = useState(true)
  const [jsonError, setJsonError] = useState('')
  const feedRef = useRef(null)

  function loadQueue() {
    setQLoading(true)
    getQueue()
      .then(r => setQueue((r.data ?? []).filter(q => q.status === 'pending')))
      .finally(() => setQLoading(false))
  }

  useEffect(() => { loadQueue() }, [])

  async function evaluate(payload) {
    setLoading(true)
    setResult(null)
    setJsonError('')
    try {
      const r     = await evaluateAction(payload)
      const entry = { ...payload, ...r.data, timestamp: new Date().toISOString() }
      setResult(r.data)
      setFeed(f => [entry, ...f].slice(0, 50))
      if (r.data.decision === 'paused') loadQueue()
    } catch (e) {
      setResult({ decision: 'error', reason: e.response?.data?.detail ?? e.message })
    } finally {
      setLoading(false)
    }
  }

  function handleCustom() {
    try {
      const parsed = JSON.parse(custom)
      evaluate(parsed)
    } catch {
      setJsonError('Invalid JSON — check your syntax')
    }
  }

  const pendingCount = queue.length

  return (
    <div className="p-8">
      <PageHeader
        title="Runtime Gateway"
        subtitle="Intercepts and evaluates every agent tool call before execution"
      >
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-high">
              <span className="w-1.5 h-1.5 rounded-full bg-high animate-pulse_ring" />
              {pendingCount} awaiting review
            </span>
          )}
          <button
            onClick={loadQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-wire
                       text-xs text-muted hover:text-ink hover:border-muted transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-6">

        {/* Left — simulator + feed */}
        <div className="col-span-2 flex flex-col gap-6">

          {/* Scenario simulator */}
          <div className="bg-surface border border-wire rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-signal" />
              <h2 className="font-display font-semibold text-ink text-sm">Action Simulator</h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {DEMO_SCENARIOS.map(s => (
                <button
                  key={s.label}
                  onClick={() => { setCustom(JSON.stringify(s.payload, null, 2)); evaluate(s.payload) }}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-md border border-wire text-xs text-muted
                             hover:border-signal/40 hover:text-ink transition-colors disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={custom}
                onChange={e => { setCustom(e.target.value); setJsonError('') }}
                rows={6}
                className="w-full bg-void border border-wire rounded-lg px-4 py-3 mono text-ink
                           focus:outline-none focus:border-signal resize-none text-xs"
              />
              {jsonError && <p className="text-xs text-crit mt-1">{jsonError}</p>}
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted">Edit the JSON above or pick a scenario, then evaluate</p>
              <button
                onClick={handleCustom}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-signal/10 border border-signal/30
                           text-signal text-xs font-medium hover:bg-signal/20 transition-colors disabled:opacity-40"
              >
                <Play size={12} strokeWidth={2.5} />
                {loading ? 'Evaluating…' : 'Evaluate'}
              </button>
            </div>

            {result && (
              <div className={`mt-4 rounded-lg border p-4 animate-fade_up ${DECISION_STYLE[result.decision]?.bg ?? 'bg-surface2 border-wire'}`}>
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const Icon = DECISION_STYLE[result.decision]?.icon ?? Shield
                    return <Icon size={16} className={DECISION_STYLE[result.decision]?.color ?? 'text-muted'} />
                  })()}
                  <span className={`font-display font-semibold text-sm ${DECISION_STYLE[result.decision]?.color ?? 'text-muted'}`}>
                    {DECISION_STYLE[result.decision]?.label ?? result.decision}
                  </span>
                  {result.risk_score != null && (
                    <span className="ml-auto font-display text-sm font-semibold text-muted">
                      Risk: <span className="text-ink">{result.risk_score}</span>
                    </span>
                  )}
                </div>
                {result.reason && <p className="text-xs text-muted">{result.reason}</p>}
                {result.policy_triggered && (
                  <p className="text-xs text-muted mt-1">Policy: <span className="text-ink">{result.policy_triggered}</span></p>
                )}
              </div>
            )}
          </div>

          {/* Live feed */}
          <div className="bg-surface border border-wire rounded-lg">
            <div className="px-5 py-4 border-b border-wire flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-low animate-pulse_ring" />
                <h2 className="font-display font-semibold text-ink text-sm">Live Feed</h2>
              </div>
              <span className="text-xs text-muted">{feed.length} events this session</span>
            </div>
            {feed.length === 0
              ? (
                <div className="flex flex-col items-center py-12 text-muted gap-2">
                  <Shield size={28} strokeWidth={1.5} className="opacity-30" />
                  <p className="text-sm">No events yet — run a scenario above</p>
                </div>
              )
              : (
                <div ref={feedRef} className="max-h-80 overflow-y-auto">
                  {feed.map((entry, i) => <FeedEntry key={i} entry={entry} />)}
                </div>
              )
            }
          </div>
        </div>

        {/* Right — approval queue */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-wire rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-high" />
              <h2 className="font-display font-semibold text-ink text-sm">Approval Queue</h2>
              {pendingCount > 0 && (
                <span className="ml-auto font-display text-xs font-semibold text-high bg-high/10 border border-high/20 rounded-full px-2 py-0.5">
                  {pendingCount}
                </span>
              )}
            </div>
            {qLoading
              ? <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="shimmer h-14 rounded-lg" />)}</div>
              : <ApprovalQueue items={queue} onRefresh={loadQueue} />
            }
          </div>

          <div className="bg-surface border border-wire rounded-lg p-5">
            <h2 className="font-display font-semibold text-ink text-sm mb-3">Decision Logic</h2>
            <div className="space-y-3 text-xs text-muted">
              {[
                { icon: ShieldCheck, color: 'text-low',  label: 'Approved', desc: 'Risk < 50, no policy violation' },
                { icon: Clock,       color: 'text-high', label: 'Paused',   desc: 'Risk 50–74 or policy requires human review' },
                { icon: ShieldX,     color: 'text-crit', label: 'Blocked',  desc: 'Risk ≥ 75 or hard policy violation' },
              ].map(({ icon: Icon, color, label, desc }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={13} className={`${color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`font-medium ${color}`}>{label}</p>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
