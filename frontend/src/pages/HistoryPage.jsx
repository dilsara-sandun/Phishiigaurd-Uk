import React, { useState, useEffect } from 'react'
import { getHistory } from '@/services/scanService'
import { Search, Filter, ShieldAlert, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory(50)
        setHistory(data)
      } catch (err) {
        console.error('Failed to fetch history', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const getStatusVisuals = (status) => {
    switch (status?.toLowerCase()) {
      case 'phishing': return { color: 'text-danger-400', bg: 'bg-danger-500/10', icon: ShieldAlert, label: 'Phishing' }
      case 'suspicious': return { color: 'text-warn-400', bg: 'bg-warn-500/10', icon: AlertTriangle, label: 'Suspicious' }
      default: return { color: 'text-safe-400', bg: 'bg-safe-500/10', icon: CheckCircle, label: 'Clean' }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Scan History</h1>
          <p className="page-sub">Recent URL analyses performed by your organization.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search URLs..." 
              className="bg-white border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-500 focus:border-brand-500/50 outline-none w-64"
            />
          </div>
          <button className="btn-secondary py-2 px-3">
            <Filter size={16} /> <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-50">
                <th className="table-th">Target URL</th>
                <th className="table-th w-32">Status</th>
                <th className="table-th w-32">Risk Score</th>
                <th className="table-th w-40">Source</th>
                <th className="table-th w-48 hidden md:table-cell">Timestamp</th>
                <th className="table-th w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                       <span className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-slate-300 animate-spin" />
                       Loading history...
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-slate-500 text-sm">No scan history found.</td></tr>
              ) : (
                history.map((item) => {
                  const visuals = getStatusVisuals(item.status)
                  const score = item.risk_score != null ? Math.round(item.risk_score * 100) : '—'
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="table-td">
                        <p className="font-mono text-sm text-slate-200 truncate max-w-[250px] lg:max-w-[400px]">
                          {item.url}
                        </p>
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${visuals.bg} ${visuals.color} border border-transparent`}>
                           <visuals.icon size={12} /> {visuals.label}
                        </span>
                      </td>
                      <td className="table-td font-mono">{score}</td>
                      <td className="table-td">
                         <span className="text-xs bg-white/[0.05] border border-white/[0.1] px-2 py-0.5 rounded text-slate-600">
                           {item.intel_source ? 'Live Intel' : 'ML Model'}
                         </span>
                      </td>
                      <td className="table-td text-slate-500 text-xs hidden md:table-cell">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="table-td text-center">
                         <button className="text-slate-500 hover:text-brand-400 group-hover:opacity-100 opacity-50 transition-all p-1">
                            <ExternalLink size={16} />
                         </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
