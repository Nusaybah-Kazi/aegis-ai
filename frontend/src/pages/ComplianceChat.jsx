import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, FileText, Loader, User, Bot } from 'lucide-react'
import { askCompliance } from '../api/client'
import PageHeader from '../components/PageHeader'

const SUGGESTED = [
  'Why was the ₹25,000 refund blocked?',
  'What is the data access policy for PII?',
  'Which actions require manager approval?',
  'What risk score triggers a block?',
  'Summarise all active AI usage policies',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 animate-fade_up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center
        ${isUser ? 'bg-signal/20' : 'bg-surface2 border border-wire'}`}
      >
        {isUser
          ? <User size={13} className="text-signal" />
          : <Bot  size={13} className="text-muted"  />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? 'bg-signal/10 border border-signal/20 text-ink'
          : 'bg-surface border border-wire text-ink'
        }`}
      >
        {msg.content}
        {msg.sources?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-wire flex flex-wrap gap-1.5">
            {msg.sources.map((s, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-muted bg-surface2 border border-wire rounded px-2 py-0.5">
                <FileText size={10} />
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade_up">
      <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-surface2 border border-wire">
        <Bot size={13} className="text-muted" />
      </div>
      <div className="bg-surface border border-wire rounded-lg px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse_ring"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ComplianceChat() {
  const [messages, setMessages] = useState([
    {
      role:    'assistant',
      content: 'Hello. I can answer questions about your organisation\'s AI policies, explain why actions were blocked, and help with compliance investigations. What would you like to know?',
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await askCompliance(q)
      setMessages(m => [...m, {
        role:    'assistant',
        content: r.data?.answer ?? 'No answer returned.',
        sources: r.data?.sources ?? [],
      }])
    } catch (e) {
      setMessages(m => [...m, {
        role:    'assistant',
        content: `Error: ${e.response?.data?.detail ?? e.message}. Make sure the backend is running and the RAG service is initialised.`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="p-8 flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>
      <PageHeader
        title="Compliance Assistant"
        subtitle="Ask anything about your AI policies — answers grounded in your own documents"
      />

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface border border-wire rounded-lg overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-wire p-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about a policy, a blocked action, or a compliance requirement…"
                rows={2}
                className="flex-1 bg-void border border-wire rounded-lg px-4 py-2.5 text-sm text-ink
                           placeholder:text-muted resize-none focus:outline-none focus:border-signal"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-lg bg-signal/10 border border-signal/30 text-signal
                           hover:bg-signal/20 transition-colors disabled:opacity-30 flex-shrink-0"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">Answers are grounded in your policy documents via RAG — not general knowledge.</p>
          </div>
        </div>

        {/* Sidebar — suggested questions */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-surface border border-wire rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={13} className="text-muted" />
              <h2 className="font-display font-semibold text-ink text-xs">Suggested questions</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-left text-xs text-muted px-3 py-2 rounded-md border border-wire
                             hover:border-signal/30 hover:text-ink hover:bg-surface2 transition-colors
                             disabled:opacity-40 leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-wire rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={13} className="text-muted" />
              <h2 className="font-display font-semibold text-ink text-xs">Policy documents</h2>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-muted">
              {['refund_policy.md', 'data_access_policy.md', 'ai_usage_policy.md'].map(f => (
                <div key={f} className="flex items-center gap-1.5 px-2 py-1.5 bg-surface2 rounded border border-wire">
                  <FileText size={10} className="flex-shrink-0" />
                  <span className="font-mono truncate">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
