import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

export default function StatCard({ label, value, sub, trend, trendDir = 'neutral', icon: Icon, accentClass = 'from-brand-600 to-brand-700', loading = false }) {
  const trendIcon = trendDir === 'up'
    ? <TrendingUp size={13} />
    : trendDir === 'down'
    ? <TrendingDown size={13} />
    : <Minus size={13} />

  const trendColor = trendDir === 'up'
    ? 'text-danger-400 bg-danger-600/10'
    : trendDir === 'down'
    ? 'text-safe-400 bg-safe-600/10'
    : 'text-slate-400 bg-white/[0.06]'

  if (loading) {
    return (
      <div className="glass-card p-5 animate-shimmer">
        <div className="h-3 w-20 bg-white/[0.08] rounded mb-3" />
        <div className="h-8 w-28 bg-white/[0.08] rounded mb-2" />
        <div className="h-3 w-16 bg-white/[0.06] rounded" />
      </div>
    )
  }

  return (
    <div className="glass-card p-5 hover:border-white/[0.10] transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            `bg-gradient-to-br ${accentClass}`,
            'shadow-glow opacity-90 group-hover:opacity-100 transition-opacity'
          )}>
            <Icon size={17} className="text-white" />
          </div>
        )}
      </div>

      <p className="text-3xl font-bold text-white tracking-tight leading-none mb-2">
        {value ?? '—'}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
        {trend && (
          <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', trendColor)}>
            {trendIcon}
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}
