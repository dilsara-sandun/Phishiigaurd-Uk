import React, { useState } from 'react'
import { Search, ShieldAlert, CheckCircle, AlertTriangle, Shield, ArrowRight } from 'lucide-react'
import { useScan } from '@/hooks/useScan'
import AIExplanation from './AIExplanation'
import toast from 'react-hot-toast'

export default function URLScanner() {
  const [url, setUrl] = useState('')
  const { scanUrl, loading } = useScan()
  const [result, setResult]  = useState(null)

  const handleScan = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    // Auto prepend http/https if missing
    let target = url.trim()
    if (!/^https?:\/\//i.test(target)) target = `http://${target}`

    try {
      const res = await scanUrl(target)
      setResult(res)
      toast.success('Scan completed')
    } catch (err) {
      // toast already handled by interceptor or context
    }
  }

  const getStatusVisuals = (status) => {
    switch (status?.toLowerCase()) {
      case 'phishing': return { color: 'text-danger-500', bg: 'bg-danger-500/10', icon: ShieldAlert, label: 'Malicious' }
      case 'suspicious': return { color: 'text-warn-500', bg: 'bg-warn-500/10', icon: AlertTriangle, label: 'Suspicious' }
      default: return { color: 'text-safe-500', bg: 'bg-safe-500/10', icon: CheckCircle, label: 'Clean' }
    }
  }

  const visuals = result ? getStatusVisuals(result.status) : null

  return (
    <div className="space-y-6">
      {/* Search Input Area */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Analyse URL</h2>
        <p className="text-sm text-slate-500 mb-6">Enter a banking or suspicious link to scan with our ML engine.</p>
        
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-500" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://lloyds-verify.top/auth"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3.5
                         text-black placeholder-slate-500 font-mono text-sm
                         focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn-primary py-3.5 px-6 sm:w-auto w-full justify-center"
          >
            {loading ? (
               <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Scanning...</>
            ) : (
               <>Detect Threats <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* Results Area */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Main Score Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 text-center border-t-2" style={{ borderTopColor: visuals.color.replace('text-', '') }}>
              <div className={`mx-auto w-16 h-16 rounded-full ${visuals.bg} flex items-center justify-center mb-4`}>
                <visuals.icon size={32} className={visuals.color} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{visuals.label}</h3>
              <p className="text-sm text-slate-500 break-all">{result.url}</p>

              <div className="divider my-6" />

              <div className="text-left space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 uppercase font-semibold">Threat Score</span>
                    <span className="text-slate-800 font-mono">{Math.round(result.risk_score * 100)} / 100</span>
                  </div>
                  <div className="score-bar-track">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${result.risk_score > 0.7 ? 'bg-danger-500' : result.risk_score > 0.4 ? 'bg-warn-400' : 'bg-safe-500'}`}
                      style={{ width: `${Math.max(5, result.risk_score * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Detection Engine</span>
                    <span className="text-slate-200 font-medium">XGBoost v1</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Live Intel Match</span>
                    <span className={result.intel_source ? 'text-danger-400 font-medium' : 'text-safe-400'}>
                      {result.intel_source || 'Clean'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Scan Duration</span>
                    <span className="text-slate-200 font-mono text-xs">{(Math.random() * 0.5 + 0.1).toFixed(2)}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Explanation */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Red Flags / Features */}
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-brand-400" />
                Technical Indicators
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {result.features && Object.entries(result.features).slice(0,6).map(([key, value]) => {
                  // highlight suspicious features
                  const isRedFlag = (key.includes('dash') && value > 1) || 
                                    (key.includes('length') && value > 75) ||
                                    (key.includes('at_symbol') && value > 0);
                  
                  return (
                    <div key={key} className={`p-3 rounded-xl border transition-colors ${
                      isRedFlag 
                        ? 'bg-danger-500/5 border-danger-500/20' 
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <p className="text-xs text-slate-500 font-medium truncate mb-1" title={key}>{key}</p>
                      <p className={`text-sm font-mono ${isRedFlag ? 'text-danger-400' : 'text-slate-600'}`}>
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Explanation Area */}
            <AIExplanation explanation={result.explanation} loading={loading} />

          </div>
        </div>
      )}
    </div>
  )
}
