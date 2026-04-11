import React from 'react'
import { ExternalLink, AlertTriangle, Clock } from 'lucide-react'

export default function NewsPanel({ news, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="animate-shimmer flex gap-3">
             <div className="w-1.5 h-12 bg-white/[0.08] rounded-full" />
             <div className="flex-1 space-y-2">
               <div className="h-4 bg-white/[0.08] rounded w-3/4" />
               <div className="h-3 bg-white/[0.06] rounded w-1/2" />
             </div>
          </div>
        ))}
      </div>
    )
  }

  if (!news || news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] rounded-xl border border-dashed border-white/[0.1]">
        <AlertTriangle size={24} className="text-slate-500 mb-2" />
        <p className="text-sm text-slate-400">No recent security alerts.</p>
        <p className="text-xs text-slate-500 mt-1">Hacker News feed is currently quiet or unavailable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {news.map((item, i) => (
        <a 
          key={item.id || i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
        >
          <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-brand-500 to-transparent mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-slate-200 group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug">
              {item.title}
            </h4>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {item.time_ago || 'Recent'}
              </span>
              <span className="opacity-50">•</span>
              <span className="truncate max-w-[120px]">{item.domain || item.url || 'News'}</span>
            </div>
          </div>
          <ExternalLink size={14} className="text-slate-600 group-hover:text-brand-400 transition-colors flex-shrink-0 mt-1" />
        </a>
      ))}
    </div>
  )
}
