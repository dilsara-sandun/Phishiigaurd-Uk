import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ScanLine, History, LifeBuoy,
  Shield, ChevronLeft, ChevronRight,
  Wifi, Globe, Mail, AlertTriangle, Settings, FileSearch, Brain
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { label: 'Overview',        icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Page Analyzer',   icon: FileSearch,      to: '/analyzer'  },
  { label: 'ML Results',      icon: Brain,           to: '/ml-results' },
  { label: 'Scan History',    icon: History,         to: '/history'   },
  { label: 'Support',         icon: LifeBuoy,        to: '/support'   },
]

const ACCOUNT_NAV = [
  { label: 'Account Settings', icon: Settings, to: '/settings' },
]


const TOOLS = [
  { label: 'URL Scanner',  icon: Wifi,   to: '/analysis?tab=url' },
  { label: 'Email Analyser',icon: Mail,  to: '/analysis?tab=email' },
  { label: 'Domain / DNS', icon: Globe,  to: '/analysis?tab=dns' },
]

function NavItem({ item, collapsed }) {
  const { icon: Icon, label, to } = item
  const location = useLocation()
  const currentPath = location.pathname + location.search

  // Match query parameter if present, otherwise match path
  const isActive = currentPath === to || (to === '/analysis?tab=url' && location.pathname === '/analysis' && !location.search)

  return (
    <NavLink
      to={to}
      className={
        clsx(
          'nav-item group relative',
          isActive && 'active',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-100 text-slate-800 text-xs
                        rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none
                        whitespace-nowrap z-50 border border-slate-200 transition-opacity duration-150">
          {label}
        </div>
      )}
    </NavLink>
  )
}

export default function Sidebar({ open, setOpen }) {
  const collapsed = !open

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-screen z-40 flex flex-col',
        'bg-white border-r border-slate-200',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center h-16 border-b border-slate-200 flex-shrink-0',
        collapsed ? 'justify-center px-2' : 'px-5 gap-3'
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
          <Shield size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-black font-black text-sm leading-tight">PhishGuard</p>
            <p className="text-brand-600 text-xs font-bold uppercase tracking-widest">UK Banking</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
            Monitor
          </p>
        )}
        {NAV.slice(0, 2).map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mt-4 mb-2">
            History
          </p>
        )}
        {NAV.slice(2).map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mt-4 mb-2">
              Quick Scan
            </p>
            {TOOLS.map((item) => (
              <NavItem key={item.label} item={item} collapsed={collapsed} />
            ))}
          </>
        )}

        {/* Account section */}
        {!collapsed && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mt-4 mb-2">
            Account
          </p>
        )}
        {ACCOUNT_NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Live indicator */}
      {!collapsed && (
        <div className="px-3 pb-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-safe-500" />
            </span>
            <div>
              <p className="text-xs font-bold text-black">Models online</p>
              <p className="text-[10px] text-slate-500 font-medium">XGBoost v1 active</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center h-10 border-t border-slate-200
                   text-slate-400 hover:text-black hover:bg-slate-50
                   transition-colors duration-150"
      >
        {collapsed
          ? <ChevronRight size={16} />
          : <><ChevronLeft size={16} /><span className="text-xs ml-1 font-bold">Collapse</span></>
        }
      </button>
    </aside>
  )
}
