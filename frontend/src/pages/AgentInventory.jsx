import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Bot, ChevronRight } from 'lucide-react'
import { getAgents } from '../api/client'
import RiskArc, { riskLevel, riskLabel } from '../components/RiskArc'
import RiskBadge from '../components/RiskBadge'
import PageHeader from '../components/PageHeader'

const FILTERS = ['all', 'critical', 'high', 'medium', 'low']

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
        ${active
          ? 'bg-signal/20 text-signal border border-signal/30'
          : 'text-muted border border-wire hover:border-muted hover:text-ink'
        }`}
    >
      {label}
    </button>
  )
}

export default function AgentInventory() {
  const [agents,  setAgents]  = useState([])
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getAgents()
      .then(r => setAgents(r.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = agents.filter(a => {
    const matchQ = !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.id?.toLowerCase().includes(query.toLowerCase()) ||
      a.type?.toLowerCase().includes(query.toLowerCase())
    const matchF = filter === 'all' || riskLevel(a.risk_score ?? 0) === filter.slice(0, filter === 'critical' ? 4 : undefined)
    return matchQ && matchF
  }).filter(a => {
    if (filter === 'all')      return true
    if (filter === 'critical') return (a.risk_score ?? 0) >= 75
    if (filter === 'high')     return (a.risk_score ?? 0) >= 50 && (a.risk_score ?? 0) < 75
    if (filter === 'medium')   return (a.risk_score ?? 0) >= 25 && (a.risk_score ?? 0) < 50
    if (filter === 'low')      return (a.risk_score ?? 0) < 25
    return true
  })

  return (
    <div className="p-8">
      <PageHeader
        title="Agent Inventory"
        subtitle={`${agents.length} AI agents registered and monitored`}
      />

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="w-full bg-surface border border-wire rounded-lg pl-8 pr-3 py-2 text-sm
                       text-ink placeholder:text-muted focus:outline-none focus:border-signal"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-muted" />
          {FILTERS.map(f => (
            <FilterPill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
          ))}
        </div>
      </div>

      {/* Agents grid */}
      {loading
        ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-wire rounded-lg p-5 h-36 shimmer" />
            ))}
          </div>
        )
        : filtered.length === 0
          ? (
            <div className="text-center py-20 text-muted">
              <Bot size={32} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No agents match your filters</p>
            </div>
          )
          : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="bg-surface border border-wire rounded-lg p-5 text-left
                             hover:border-signal/40 hover:bg-surface2 transition-all duration-150
                             group animate-fade_up"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-ink text-sm truncate">{agent.name}</p>
                      <p className="text-xs text-muted mt-0.5 font-mono">{agent.id}</p>
                    </div>
                    <RiskArc score={agent.risk_score ?? 0} size="sm" showLabel={false} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.type && (
                      <span className="badge bg-surface2 text-muted border border-wire text-xs normal-case font-normal tracking-normal">
                        {agent.type}
                      </span>
                    )}
                    {agent.status && (
                      <span className={`badge ${
                        agent.status === 'active'
                          ? 'bg-low/10 text-low border-low/20'
                          : 'bg-muted/10 text-muted border-wire'
                      }`}>
                        {agent.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <RiskBadge score={agent.risk_score ?? 0} showScore />
                    <ChevronRight size={14} className="text-wire group-hover:text-signal transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )
      }
    </div>
  )
}
