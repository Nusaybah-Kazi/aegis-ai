// frontend/src/pages/RuntimeGateway.jsx
import { useEffect, useState, useCallback } from 'react'
import {
  Clock, ShieldCheck, ShieldX, RefreshCw,
  User, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Inbox,
} from 'lucide-react'
import { getQueue, approveAction, denyAction } from '../api/client'
import RiskArc from '../components/RiskArc'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(score) {
  if (score >= 75) return 'text-crit'
  if (score >= 50) return 'text-high'
  return 'text-low'
}

function riskBg(score) {
  if (score >= 75) return 'bg-crit/10 border-crit/20'
  if (score >= 50) return 'bg-high/10 border-high/20'
  return 'bg-low/10 border-low/20'
}

function statusStyle(status) {
  switch (status) {
    case 'pending':  return { color: 'text-high',  bg: 'bg-high/10 border-high/20',  label: 'Awaiting Review' }
    case 'approved': return { color: 'text-low',   bg: 'bg-low/10  border-low/20',   label: 'Approved'        }
    case 'denied':   return { color: 'text-crit',  bg: 'bg-crit/10 border-crit/20',  label: 'Denied'          }
    default:         return { color: 'text-muted', bg: 'bg-wire    border-wire',      label: status            }
  }
}

function formatTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function getAmount(item) {
  try {
    const p = JSON.parse(item.parameters ?? '{}')
    return p.amount ?? p?.parameters?.amount ?? null
  } catch { return null }
}

function getMessage(item) {
  try {
    const p = JSON.parse(item.parameters ?? '{}')
    return p.message ?? null
  } catch { return null }
}

function UserChip({ name, email }) {
  const initial = name?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-signal/20 flex items-center justify-center
                      text-signal text-xs font-semibold flex-shrink-0">
        {initial}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink font-medium truncate">{name ?? 'Unknown user'}</p>
        <p className="text-xs text-muted truncate">{email ?? '—'}</p>
      </div>
    </div>
  )
}

// ── Queue card ────────────────────────────────────────────────────────────────

function QueueCard({ item, onRefresh, reviewerName }) {
  const [expanded,  setExpanded]  = useState(false)
  const [note,      setNote]      = useState('')
  const [acting,    setActing]    = useState(false)

  const st       = statusStyle(item.status)
  const amount   = getAmount(item)
  const message  = getMessage(item)
  const isPending = item.status === 'pending'

  async function act(fn) {
    setActing(true)
    try { await fn(item.id, note, reviewerName) } catch { /* surface via refresh */ }
    finally { setActing(false); onRefresh() }
  }

  // Split reason into policy part and risk part for cleaner display
  const [policyReason, riskReason] = (() => {
    const r = item.reason ?? ''
    const pi = r.indexOf('[POLICY]')
    const ri = r.indexOf('[RISK]')
    if (pi !== -1 && ri !== -1) {
      return [
        r.slice(pi + 8, ri).replace(/\|/g, '').trim(),
        r.slice(ri + 6).trim(),
      ]
    }
    if (ri !== -1) return [null, r.slice(ri + 6).trim()]
    return [null, r]
  })()

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-shadow
                     hover:shadow-md ${isPending ? 'border-high/30' : 'border-wire'}`}>

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-start gap-4">

        {/* Risk arc */}
        <div className="flex-shrink-0 pt-0.5">
          <RiskArc score={item.risk_score ?? 0} size="sm" showLabel={false} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm text-ink font-semibold font-display">
              {item.tool_name}
            </span>
            <span className={`badge border text-xs ${st.bg} ${st.color}`}>
              {st.label}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${riskColor(item.risk_score ?? 0)}`}>
              Risk {item.risk_score ?? 0}
            </span>
          </div>

          {/* User + time row */}
          <div className="flex items-center gap-4 flex-wrap mt-1.5">
            <UserChip name={item.user_name} email={item.user_email} />
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock size={11} />
              {formatTime(item.created_at)}
            </span>
            {item.agent_id && (
              <span className="text-xs font-mono text-muted">
                {item.agent_id}
              </span>
            )}
          </div>

          {/* Amount pill or message snippet */}
          {amount != null && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full
                             text-xs font-semibold border ${riskBg(item.risk_score ?? 0)}
                             ${riskColor(item.risk_score ?? 0)}`}>
              ₹{Number(amount).toLocaleString('en-IN')}
            </div>
          )}
          {!amount && message && (
            <p className="mt-2 text-xs text-muted italic line-clamp-1">
              "{message}"
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 p-1.5 rounded-md text-muted hover:text-ink
                     hover:bg-surface2 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Expanded detail ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-wire px-5 py-4 bg-void/50 space-y-3">

          {/* Policy reason */}
          {policyReason && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-high mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-high mb-0.5">Policy violation</p>
                <p className="text-xs text-muted">{policyReason}</p>
              </div>
            </div>
          )}

          {/* Risk reason */}
          {riskReason && (
            <div className="flex items-start gap-2">
              <ShieldX size={13} className="text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-ink mb-0.5">Risk factors</p>
                <p className="text-xs text-muted">{riskReason}</p>
              </div>
            </div>
          )}

          {/* Full message if chat */}
          {message && (
            <div className="bg-surface border border-wire rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-muted mb-1">Original message</p>
              <p className="text-xs text-ink whitespace-pre-wrap">{message}</p>
            </div>
          )}

          {/* Raw parameters for tool calls */}
          {!message && item.parameters && (
            <div className="bg-surface border border-wire rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-muted mb-1">Parameters</p>
              <pre className="text-xs text-ink font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(JSON.parse(item.parameters), null, 2)}
              </pre>
            </div>
          )}

          {/* Review outcome (already decided) */}
          {!isPending && (
            <div className={`rounded-lg border px-3 py-2 ${st.bg}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {item.status === 'approved'
                  ? <CheckCircle2 size={13} className="text-low" />
                  : <XCircle     size={13} className="text-crit" />
                }
                <p className={`text-xs font-semibold ${st.color}`}>
                  {item.status === 'approved' ? 'Approved' : 'Denied'} by {item.reviewed_by ?? 'admin'}
                </p>
              </div>
              {item.reviewed_at && (
                <p className="text-xs text-muted">{formatTime(item.reviewed_at)}</p>
              )}
            </div>
          )}

          {/* Approve / Deny controls */}
          {isPending && (
            <div className="pt-1 space-y-2">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note for audit trail…"
                rows={2}
                className="w-full bg-void border border-wire rounded-lg px-3 py-2 text-xs text-ink
                           placeholder-muted focus:outline-none focus:border-signal resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act(approveAction)}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium
                             bg-low/10 border border-low/30 text-low
                             hover:bg-low/20 transition-colors disabled:opacity-40"
                >
                  <ShieldCheck size={12} />
                  {acting ? 'Processing…' : 'Approve'}
                </button>
                <button
                  onClick={() => act(denyAction)}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium
                             bg-crit/10 border border-crit/30 text-crit
                             hover:bg-crit/20 transition-colors disabled:opacity-40"
                >
                  <XCircle size={12} />
                  {acting ? 'Processing…' : 'Deny'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'denied',   label: 'Denied'   },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RuntimeGateway() {
  const { user }             = useAuth()
  const [queue,    setQueue]    = useState([])
  const [filter,   setFilter]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  const loadQueue = useCallback(() => {
    setLoading(true)
    getQueue()
      .then(r => setQueue(r.data ?? []))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadQueue() }, [loadQueue])

  const pendingCount = queue.filter(q => q.status === 'pending').length

  const visible = queue.filter(item => {
    const matchesFilter = !filter || item.status === filter
    const term = search.toLowerCase()
    const matchesSearch = !term || [
      item.user_name, item.user_email, item.tool_name,
      item.agent_id,  item.reason,
    ].some(v => v?.toLowerCase().includes(term))
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-8">
      <PageHeader
        title="Approval Queue"
        subtitle="Every paused action awaiting human review — with full context and one-click decisions"
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
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-wire
                       text-xs text-muted hover:text-ink hover:border-muted
                       transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </PageHeader>

      {/* ── Filter + search bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex rounded-lg border border-wire overflow-hidden">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                ${filter === f.value
                  ? 'bg-signal/10 text-signal'
                  : 'text-muted hover:text-ink hover:bg-surface2'
                }`}
            >
              {f.label}
              {f.value === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-high text-void rounded-full px-1.5 py-px text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by user, tool, agent, or reason…"
          className="flex-1 min-w-48 bg-surface border border-wire rounded-lg px-3 py-1.5
                     text-xs text-ink placeholder-muted focus:outline-none focus:border-signal"
        />
      </div>

      {/* ── Decision legend ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 mb-6 px-1">
        {[
          { icon: Clock,       color: 'text-high', label: 'Paused — Risk 50–74 or policy requires review' },
          { icon: ShieldX,     color: 'text-crit', label: 'Blocked — Risk ≥ 75 or hard policy violation'  },
          { icon: ShieldCheck, color: 'text-low',  label: 'Approved — Admin confirmed the action'         },
        ].map(({ icon: Icon, color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={12} className={color} />
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Queue list ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted gap-3">
          <Inbox size={36} strokeWidth={1.2} className="opacity-30" />
          <p className="text-sm">
            {search || filter ? 'No items match your filter.' : 'Queue is empty — no actions pending review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(item => (
            <QueueCard
              key={item.id}
              item={item}
              onRefresh={loadQueue}
              reviewerName={user?.name ?? 'admin'}
            />
          ))}
        </div>
      )}
    </div>
  )
}