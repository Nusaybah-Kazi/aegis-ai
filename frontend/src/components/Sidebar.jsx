import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Bot, Shield, ScrollText,
  MessageSquare, ChevronRight, Hexagon,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Overview'       },
  { to: '/agents',     icon: Bot,             label: 'Agents'         },
  { to: '/gateway',    icon: Shield,          label: 'Gateway'        },
  { to: '/audit',      icon: ScrollText,      label: 'Audit Trail'    },
  { to: '/compliance', icon: MessageSquare,   label: 'Compliance'     },
]

export default function Sidebar() {
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
          Platform
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-wire">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-low animate-pulse_ring" />
          <span className="text-xs text-muted">System nominal</span>
        </div>
        <p className="text-xs text-wire mt-1">v0.8.0 — dev</p>
      </div>
    </aside>
  )
}
