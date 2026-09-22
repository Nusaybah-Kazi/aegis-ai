// frontend/src/pages/Register.jsx
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hexagon, UserPlus, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Register() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', invite_code: ''
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [waking, setWaking]   = useState(false)
  const wakeTimer = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setWaking(false)

    // If the request is still going after 3s, assume Render is cold-starting
    wakeTimer.current = setTimeout(() => setWaking(true), 3000)

    try {
      const payload = { ...form }
      if (!payload.invite_code) delete payload.invite_code
      const res = await api.post('/auth/register', payload)
      login(res.data.access_token, res.data.user)
      navigate(res.data.user.role === 'admin' ? '/dashboard' : '/chat', { replace: true })
    } catch (err) {
      if (!err.response) {
        setError('Server is waking up — this can take up to a minute on first use. Please try again.')
      } else {
        setError(err.response?.data?.detail || 'Registration failed')
      }
    } finally {
      clearTimeout(wakeTimer.current)
      setWaking(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Hexagon size={24} className="text-signal" strokeWidth={1.5} />
          <span className="font-display font-semibold text-ink text-xl tracking-tight">
            Aegis <span className="text-signal">AI</span>
          </span>
        </div>

        <div className="bg-surface border border-wire rounded-lg p-8">
          <h1 className="text-ink font-semibold text-lg mb-1">Create account</h1>
          <p className="text-muted text-sm mb-6">Join the governance platform</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Full name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-void border border-wire rounded px-3 py-2 text-sm text-ink
                           focus:outline-none focus:border-signal placeholder:text-wire"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-void border border-wire rounded px-3 py-2 text-sm text-ink
                           focus:outline-none focus:border-signal placeholder:text-wire"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-void border border-wire rounded px-3 py-2 text-sm text-ink
                           focus:outline-none focus:border-signal placeholder:text-wire"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Admin invite code{' '}
                <span className="text-wire normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={form.invite_code}
                onChange={e => setForm(f => ({ ...f, invite_code: e.target.value }))}
                className="w-full bg-void border border-wire rounded px-3 py-2 text-sm text-ink
                           focus:outline-none focus:border-signal placeholder:text-wire"
                placeholder="Leave blank for employee access"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20
                            rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-signal text-void
                         font-medium text-sm py-2 rounded hover:bg-signal/90
                         disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {waking ? 'Waking up server…' : 'Creating account…'}
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  Create account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-signal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}