import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, User, ChevronDown, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CRUMBS = {
  '/dashboard': ['Overview'],
  '/analysis':  ['Analysis Centre'],
  '/history':   ['Scan History'],
  '/support':   ['Support'],
}

const ALERTS = [
  { id: 1, text: 'New high-risk domain detected: lloyds-verify.top', time: '2 min ago', type: 'danger' },
  { id: 2, text: 'Batch scan completed: 3 of 10 URLs flagged', time: '14 min ago', type: 'warn' },
  { id: 3, text: 'Model XGBoost v1 online and healthy', time: '1 hr ago', type: 'safe' },
]

export default function Navbar({ onToggleSidebar }) {
  const { user, logout }   = useAuth()
  const location           = useLocation()
  const navigate           = useNavigate()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [userOpen, setUserOpen]     = useState(false)

  const crumbs = CRUMBS[location.pathname] || ['PhishGuard UK']

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center px-6
                        bg-navy-900/80 backdrop-blur-md border-b border-white/[0.06]">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center gap-2 text-sm">
          <Shield size={14} className="text-brand-400 flex-shrink-0" />
          <span className="text-slate-500">/</span>
          {crumbs.map((c, i) => (
            <span key={c} className={clsx('font-medium', i === crumbs.length - 1 ? 'text-white' : 'text-slate-400')}>
              {c}
            </span>
          ))}
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Alert bell */}
        <div className="relative">
          <button
            onClick={() => { setAlertsOpen((o) => !o); setUserOpen(false) }}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          {alertsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 glass-card border border-white/[0.08]
                            shadow-card-lg rounded-2xl overflow-hidden animate-slide-in">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white">Notifications</p>
              </div>
              {ALERTS.map((a) => (
                <div key={a.id} className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-slate-300 leading-relaxed">{a.text}</p>
                  <p className="text-xs text-slate-500 mt-1">{a.time}</p>
                </div>
              ))}
              <div className="px-4 py-2.5 text-center">
                <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                  View all alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen((o) => !o); setAlertsOpen(false) }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                       bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07]
                       transition-colors duration-150"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">
                {user?.email?.split('@')[0] || 'Analyst'}
              </p>
              <p className="text-xs text-slate-500 capitalize leading-tight">{user?.role || 'user'}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 glass-card border border-white/[0.08]
                            shadow-card-lg rounded-2xl overflow-hidden animate-slide-in">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role} account</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-danger-400
                           hover:bg-danger-600/10 hover:text-danger-300 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
