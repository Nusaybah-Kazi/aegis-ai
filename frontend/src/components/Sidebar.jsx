// frontend/src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, Shield, ScrollText,
  MessageSquare, Hexagon, LogOut, MessageCircle, Clock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ADMIN_NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Overview'    },
  { to: '/agents',     icon: Bot,             label: 'Agents'      },
  { to: '/gateway',    icon: Shield,          label: 'Gateway'     },
  { to: '/audit',      icon: ScrollText,      label: 'Audit Trail' },
  { to: '/compliance', icon: MessageSquare,   label: 'Compliance'  },
]

const EMPLOYEE_NAV = [
  { to: '/chat',     icon: MessageCircle, label: 'AI Assistant' },
  { to: '/requests', icon: Clock,         label: 'My Requests'  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const NAV = user?.role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-wire bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-wire">
        <Hexagon size={20} className="text-signal" strokeWidth={1.5} />
        <span className="font-display font-semibold text-ink tracking-tight">
          Aegis <span className="text-signal">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
        <p className="text-muted text-xs font-medium px-3 mb-2 uppercase tracking-widest">
          {user?.role === 'admin' ? 'Platform' : 'Workspace'}
        </p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
               ${isActive
                 ? 'bg-signal/10 border-l-2 border-signal text-signal font-medium -ml-px pl-[11px]'
                 : 'text-muted hover:text-ink hover:bg-surface2'
               }`
            }
          >
            <Icon size={16} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-wire flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-signal/20 flex items-center justify-center
                            text-signal text-xs font-semibold flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-muted
                     hover:text-red-400 hover:bg-red-400/10 transition-colors w-full"
        >
          <LogOut size={13} />
          Sign out
        </button>
        <div className="flex items-center gap-2 px-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-low animate-pulse_ring" />
          <span className="text-xs text-muted">System nominal</span>
        </div>
        <p className="text-xs text-wire px-1">v0.9.0 — dev</p>
      </div>
    </aside>
  )
}