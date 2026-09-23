// frontend/src/pages/PolicyQA.jsx
import { useState, useRef, useEffect } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { askCompliance } from '../api/client'
import PageHeader from '../components/PageHeader'

const SUGGESTIONS = [
  'Why was my refund request blocked?',
  'What is the approval limit for refunds?',
  'What data can I access without approval?',
  'What happens to my flagged request?',
  'Which actions require manager approval?',
  'What counts as sensitive customer data?',
]

function Bubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-signal text-void rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] text-sm">
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.status === 'error') {
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-crit/10 border border-crit/20 text-crit rounded-2xl rounded-tl-sm
                        px-4 py-2.5 max-w-[75%] text-sm">
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4 gap-2.5">
      <div className="w-7 h-7 rounded-full bg-signal/15 flex items-center justify-center
                      flex-shrink-0 mt-0.5">
        <BookOpen size={13} className="text-signal" />
      </div>
      <div className="bg-surface border border-wire rounded-2xl rounded-tl-sm
                      px-4 py-3 max-w-[78%]">
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{msg.text}</p>
        {msg.sources?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-wire flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted">Sources:</span>
            {msg.sources.map(s => (
              <span key={s}
                className="text-xs bg-signal/10 text-signal border border-signal/20
                           rounded px-1.5 py-0.5">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PolicyQA() {
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const ask = async (question) => {
    const text = (question ?? input).trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const { data } = await askCompliance(text)
      setMessages(prev => [...prev, {
        role:    'assistant',
        status:  'answered',
        text:    data.answer,
        sources: data.sources ?? [],
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role:   'assistant',
        status: 'error',
        text:   err.response?.data?.detail || 'Could not reach the compliance assistant.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-8 pt-8 pb-0 flex-shrink-0">
        <PageHeader
          title="Policy Q&A"
          subtitle="Ask anything about company policies — answers come from your org's own documents, not general AI knowledge"
        />
      </div>

      <div className="flex flex-1 min-h-0 gap-6 px-8 pb-8">

        {/* ── Chat column ─────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 bg-surface border border-wire rounded-xl overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-signal/10 flex items-center justify-center">
                  <BookOpen size={22} className="text-signal" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink mb-1">Ask about any policy</p>
                  <p className="text-xs text-muted max-w-xs">
                    Your question is answered using your org's actual policy documents — not general AI knowledge.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => <Bubble key={i} msg={msg} />)
            )}
            {loading && (
              <div className="flex justify-start mb-4 gap-2.5">
                <div className="w-7 h-7 rounded-full bg-signal/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={13} className="text-signal" />
                </div>
                <div className="bg-surface border border-wire rounded-2xl rounded-tl-sm px-4 py-3
                                flex items-center gap-2 text-muted text-sm">
                  <Loader2 size={13} className="animate-spin" />
                  Searching policy documents…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-wire px-4 py-3 flex gap-3 flex-shrink-0">
            <textarea
              className="flex-1 bg-void border border-wire rounded-lg px-3 py-2 text-sm
                         text-ink placeholder-muted resize-none
                         focus:outline-none focus:border-signal"
              rows={2}
              placeholder="Ask about a policy, approval rule, or why something was blocked…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() }
              }}
            />
            <button
              onClick={() => ask()}
              disabled={loading || !input.trim()}
              className="px-5 py-2 rounded-lg bg-signal/10 border border-signal/30 text-signal
                         text-sm font-medium hover:bg-signal/20 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              Ask
            </button>
          </div>
        </div>

        {/* ── Suggestions sidebar ─────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-surface border border-wire rounded-xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
              Suggested questions
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-wire
                             text-xs text-muted hover:border-signal/40 hover:text-ink
                             hover:bg-signal/5 transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-wire rounded-xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
              How it works
            </p>
            <div className="space-y-3 text-xs text-muted">
              {[
                { step: '1', text: 'Your question is matched against policy documents' },
                { step: '2', text: 'Relevant sections are retrieved and used as context' },
                { step: '3', text: 'The AI answers only from those sections — not from training data' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-signal/10 text-signal flex items-center
                                   justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}