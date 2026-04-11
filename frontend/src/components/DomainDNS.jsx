import React, { useState } from 'react'
import { Globe, Server, Database } from 'lucide-react'

export default function DomainDNS() {
  const [domain, setDomain] = useState('')

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Domain & DNS Intelligence</h2>
        <p className="text-sm text-slate-400 mb-6">Investigate domain creation dates, WHOIS records, registrar data, and associated A/MX records.</p>
        
        <form className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Globe size={18} className="text-slate-500" />
            </div>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. lloyds-verify.top"
              className="w-full bg-navy-950 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3.5
                         text-slate-200 placeholder-slate-500 font-mono text-sm
                         focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-not-allowed"
              disabled
            />
          </div>
          <button type="button" disabled className="btn-primary opacity-50 cursor-not-allowed py-3.5 px-6">
            <Database size={16} /> Lookup DNS
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 text-slate-400 mb-4">
          <Server size={18} />
          <h3 className="font-semibold text-white">Feature Status</h3>
        </div>
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-warn-500 border-t-transparent animate-spin inline-block" />
          Integration with external WHOIS/DNS APIs (e.g., DomainTools) is scheduled for Phase 2.
        </p>
      </div>
    </div>
  )
}
