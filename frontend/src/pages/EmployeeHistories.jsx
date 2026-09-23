// frontend/src/pages/EmployeeHistories.jsx
import { useEffect, useState } from 'react'
import { Users, MessageCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'
import client from '../api/client'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

function ChatBubbleReadOnly({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-2">
        <div className="bg-blue-600/80 text-white rounded-lg px-3 py-2 max-w-[75%] text-sm">
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.status === 'blocked') {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-red-950/40 border border-red-800/50 text-red-300 rounded-lg px-3 py-2 max-w-[75%] text-sm">
          <span className="font-medium">Blocked — </span>{msg.reason}
        </div>
      </div>
    )
  }

  if (msg.status === 'paused') {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-yellow-950/40 border border-yellow-800/50 text-yellow-300 rounded-lg px-3 py-2 max-w-[75%] text-sm">
          <span className="font-medium">Pending review — </span>{msg.reason}
          {msg.queue_id && <span className="text-xs opacity-60 ml-1">(#{msg.queue_id})</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-2">
      <div className="bg-surface2 border border-wire text-ink rounded-lg px-3 py-2 max-w-[75%] text-sm whitespace-pre-wrap">
        {msg.provider && (
          <p className="text-xs text-muted font-medium mb-1">{msg.provider}</p>
        )}
        {msg.text}
      </div>
    </div>
  )
}

function EmployeeHistoryCard({ employee }) {
  const [open,     setOpen]     = useState(false)
  const [tab,      setTab]      = useState('internal')
  const [history,  setHistory]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  const load = async () => {
    if (history) return   // already loaded — don't re-fetch on every expand
    setLoading(true)
    try {
      const res = await client.get(`/chat/history/user/${employee.id}`)
      setHistory(res.data)
    } catch {
      setHistory({ internal: [], external: [] })
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const opening = !open
    setOpen(opening)
    if (opening) load()
  }

  const internalCount = history
    ? history.internal.filter(m => m.role === 'user').length
    : employee.chat_count ?? '?'

  return (
    <div className="bg-surface border border-wire rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-signal/20 flex items-center justify-center
                          text-signal text-sm font-semibold flex-shrink-0">
            {employee.name?.[0]?.toUpperCase()}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-ink">{employee.name}</p>
            <p className="text-xs text-muted">{employee.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <MessageCircle size={12} />
            <span>{internalCount} messages</span>
          </div>
          {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
        </div>
      </button>

      {/* Expanded history */}
      {open && (
        <div className="border-t border-wire px-5 py-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            {['internal', 'external'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                  ${tab === t
                    ? 'bg-signal/20 text-signal border border-signal/30'
                    : 'text-muted border border-wire hover:text-ink'
                  }`}
              >
                {t === 'internal' ? 'Internal AI' : 'External AI'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="shimmer h-10 rounded-lg" />
              ))}
            </div>
          ) : (() => {
            const msgs = history?.[tab] || []
            return msgs.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">No {tab} chat history</p>
            ) : (
              <div className="max-h-80 overflow-y-auto pr-1">
                {msgs.map((msg, i) => <ChatBubbleReadOnly key={i} msg={msg} />)}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function EmployeeHistories() {
  const [employees, setEmployees] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    client.get('/auth/users')
      .then(res => setEmployees(res.data.filter(u => u.role === 'employee')))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Employee Histories</h1>
          <p className="text-muted text-sm mt-0.5">Browse AI interaction histories for all employees</p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-wire rounded-md px-3 py-1.5">
          <Search size={13} className="text-muted" />
          <input
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-ink placeholder-muted focus:outline-none w-44"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={32} className="text-wire mx-auto mb-3" />
          <p className="text-muted text-sm">No employees found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(emp => (
            <EmployeeHistoryCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}
    </div>
  )
}