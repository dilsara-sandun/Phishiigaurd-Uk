import React, { useState } from 'react'
import { Globe, Server, Database, CheckCircle, ShieldAlert, Cpu } from 'lucide-react'
import { useScan } from '@/hooks/useScan'
import AIExplanation from './AIExplanation'

export default function DomainDNS() {
  const [domain, setDomain] = useState('')
  const { scanDomain, loading } = useScan()
  const [result, setResult] = useState(null)

  const handleLookup = async (e) => {
    e.preventDefault()
    if (!domain) return
    const cleaned = domain.replace(/https?:\/\//, '').split('/')[0]
    setDomain(cleaned)
    const res = await scanDomain(cleaned)
    setResult(res)
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Domain & DNS Intelligence</h2>
        <p className="text-sm text-slate-500 mb-6">Investigate domain creation dates, WHOIS records, registrar data, and associated A/MX records.</p>
        
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Globe size={18} className="text-slate-500" />
            </div>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. lloyds-verify.top"
              className="w-full bg-slate-50 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3.5
                         text-slate-200 placeholder-slate-500 font-mono text-sm
                         focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
              disabled={loading}
              required
            />
          </div>
          <button type="submit" disabled={loading || !domain} className="btn-primary py-3.5 px-6">
            <Database size={16} /> {loading ? 'Looking up...' : 'Lookup DNS'}
          </button>
        </form>
      </div>

      {result && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-6">
               <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                 <Server size={16} /> Infrastructure Details
               </h3>
               <div className="space-y-3 font-mono text-sm">
                 <div className="flex justify-between border-b border-slate-200 pb-2">
                   <span className="text-slate-500">Registrar</span>
                   <span className="text-slate-200 text-right">{result.dns_info.registrar || 'Unknown'}</span>
                 </div>
                 <div className="flex justify-between border-b border-slate-200 pb-2">
                   <span className="text-slate-500">Age</span>
                   <span className="text-slate-200">{result.dns_info.domain_age_days ? `${result.dns_info.domain_age_days} days` : 'Unknown'}</span>
                 </div>
                 <div className="flex justify-between border-b border-slate-200 pb-2">
                   <span className="text-slate-500">Geo Location</span>
                   <span className="text-slate-200">{result.dns_info.geo_ip_country || 'Unknown'} - {result.dns_info.geo_ip_city || 'Unknown'}</span>
                 </div>
                 <div className="flex justify-between pb-2">
                   <span className="text-slate-500">SSL Issuer</span>
                   <span className="text-slate-200">{result.dns_info.ssl_issuer || 'None Detected'}</span>
                 </div>
               </div>
            </div>

            <div className="glass-card p-6">
               <h3 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                 <Globe size={16} /> DNS Records
               </h3>
               <div className="space-y-4 font-mono text-xs">
                 <div>
                   <span className="text-slate-500 block mb-1">A Records (IPs)</span>
                   <div className="bg-slate-50 p-2 rounded text-slate-600">
                     {result.dns_info.a_records.length > 0 ? result.dns_info.a_records.join(', ') : 'None'}
                   </div>
                 </div>
                 <div>
                   <span className="text-slate-500 block mb-1">MX Records (Mail)</span>
                   <div className="bg-slate-50 p-2 rounded text-slate-600">
                     {result.dns_info.mx_records.length > 0 ? result.dns_info.mx_records.join('\n') : 'No Mail Servers'}
                   </div>
                 </div>
               </div>
            </div>
          </div>

          <AIExplanation explanation={result.explanation} loading={loading} />
        </div>
      )}
    </div>
  )
}
