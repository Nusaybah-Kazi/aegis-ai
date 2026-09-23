// frontend/src/pages/EmployeeChat.jsx
import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import client, { getChatHistory, clearMyChatHistory, getAgents } from '../api/client'

const PROVIDERS = [
  { value: 'gpt-oss-fast',      label: 'GPT-OSS Fast'      },
  { value: 'gpt-oss-reasoning', label: 'GPT-OSS Reasoning' },
  { value: 'qwen',              label: 'Qwen'               },
]

function ChatBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[75%]">
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.status === 'blocked') {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="font-semibold text-sm mb-1">Blocked</p>
          <p className="text-sm">{msg.reason}</p>
          {msg.findings?.length > 0 && (
            <ul className="text-xs mt-1 list-disc list-inside opacity-80">
              {msg.findings.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      </div>
    )
  }

  if (msg.status === 'paused') {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-yellow-950/40 border border-yellow-800 text-yellow-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="font-semibold text-sm mb-1">Pending admin review</p>
          <p className="text-sm">{msg.reason}</p>
          {msg.queue_id && (
            <p className="text-xs mt-1 opacity-70">
              Request #{msg.queue_id} — check My Requests once approved.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (msg.status === 'unavailable') {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-slate-800/70 border border-slate-700 text-slate-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="text-sm">{msg.reason}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-[#111b2a] border border-[#24344a] text-[#c7d5e8] rounded-lg px-4 py-2 max-w-[75%]">
        {msg.provider && (
          <p className="text-xs font-semibold text-[#6f89a8] mb-1">
            {PROVIDERS.find(p => p.value === msg.provider)?.label || msg.provider}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  )
}

function ChatPanel({ endpoint, extraFields, providerSelector, initialMessages, onNewMessage, placeholder }) {
  const [messages, setMessages] = useState(initialMessages || [])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => { setMessages(initialMessages || []) }, [initialMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const body = { message: text, ...extraFields }
      const { data } = await client.post(endpoint, body)
      setMessages(prev => [...prev, {
        role:     'assistant',
        status:   data.status,
        text:     data.answer,
        reason:   data.reason,
        findings: data.findings,
        queue_id: data.queue_id,
        provider: data.provider,
      }])
      onNewMessage?.()
    } catch (err) {
      setMessages(prev => [...prev, {
        role:   'assistant',
        status: 'blocked',
        reason: err.response?.data?.detail || 'Something went wrong sending your message.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[70vh] border border-[#24344a] rounded-lg bg-[#0f1724]">
      {providerSelector}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[#7f96b3] text-center mt-8">
            {placeholder || 'Start a conversation below.'}
          </p>
        )}
        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-[#111b2a] border border-[#24344a] text-[#6f89a8] rounded-lg px-4 py-2 text-sm">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-[#24344a] p-3 flex gap-2">
        <textarea
          className="flex-1 bg-[#080e17] border border-[#2a3b52] text-[#c7d5e8]
                     placeholder-[#5d7898] rounded-lg px-3 py-2 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Type your message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function EmployeeChat() {
  const [agents,           setAgents]          = useState([])
  const [agentsLoading,    setAgentsLoading]    = useState(true)
  const [tab,              setTab]              = useState(null)
  const [provider,         setProvider]         = useState('gpt-oss-fast')
  const [internalByAgent,  setInternalByAgent]  = useState({})
  const [externalMessages, setExternalMessages] = useState([])
  const [historyLoading,   setHistoryLoading]   = useState(true)
  const [clearing,         setClearing]         = useState(false)

  useEffect(() => {
    getAgents()
      .then(({ data }) => {
        const list = data || []
        setAgents(list)
        if (list.length > 0) setTab(list[0].id)
      })
      .finally(() => setAgentsLoading(false))
  }, [])

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const { data } = await getChatHistory()
      setInternalByAgent(data.internal_by_agent || {})
      setExternalMessages(data.external || [])
    } catch { /* silently fail */ }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => { loadHistory() }, [])

  const handleClear = async () => {
    if (!window.confirm('Clear your entire chat history? This cannot be undone.')) return
    setClearing(true)
    try {
      await clearMyChatHistory()
      setInternalByAgent({})
      setExternalMessages([])
    } catch { alert('Failed to clear history. Please try again.') }
    finally { setClearing(false) }
  }

  const isLoading   = agentsLoading || historyLoading || tab === null
  const activeAgent = agents.find(a => a.id === tab)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#c7d5e8]">AI Assistant</h1>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-800/50
                     text-xs text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
        >
          <Trash2 size={12} />
          {clearing ? 'Clearing…' : 'Clear History'}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setTab(a.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === a.id
                ? 'bg-blue-600 text-white'
                : 'bg-[#182333] text-[#9eb3cc] border border-[#2a3b52] hover:border-blue-600/40'
            }`}
          >
            {a.name}
          </button>
        ))}
        <button
          onClick={() => setTab('external')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'external'
              ? 'bg-blue-600 text-white'
              : 'bg-[#182333] text-[#9eb3cc] border border-[#2a3b52] hover:border-blue-600/40'
          }`}
        >
          External AI
        </button>
      </div>

      {/* Panel */}
      {isLoading ? (
        <div className="h-[70vh] border border-[#24344a] rounded-lg bg-[#0f1724]
                        flex items-center justify-center text-[#6f89a8] text-sm">
          Loading…
        </div>
      ) : tab === 'external' ? (
        <ChatPanel
          key="external"
          endpoint="/chat/external"
          extraFields={{ provider }}
          initialMessages={externalMessages}
          onNewMessage={loadHistory}
          placeholder="Start a conversation with an external AI provider below."
          providerSelector={
            <div className="border-b border-[#24344a] p-3">
              <label className="text-xs font-medium text-[#6f89a8] mr-2">Provider:</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="bg-[#080e17] border border-[#2a3b52] text-[#c7d5e8] rounded px-2 py-1 text-sm"
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value} className="bg-[#0f1724] text-[#c7d5e8]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      ) : (
        <ChatPanel
          key={tab}
          endpoint="/chat/internal"
          extraFields={{ agent_id: tab }}
          initialMessages={internalByAgent[tab] || []}
          onNewMessage={loadHistory}
          placeholder={activeAgent ? `Start a conversation with ${activeAgent.name} below.` : 'Start a conversation below.'}
        />
      )}
    </div>
  )
}