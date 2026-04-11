import React, { useState } from 'react'
import { Layers } from 'lucide-react'
import URLScanner from '../components/URLScanner'
import EmailAnalyser from '../components/EmailAnalyser'
import DomainDNS from '../components/DomainDNS'

export default function AnalysisCentre() {
  const [activeTab, setActiveTab] = useState('url')

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="page-title">Analysis Centre</h1>
        <p className="page-sub">Manual investigation tools for deep inspection</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-navy-900 border border-white/[0.08] p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'url' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          URL Scanner
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'email' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          Email Analyser
        </button>
        <button
          onClick={() => setActiveTab('dns')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border-l border-transparent ${
            activeTab === 'dns' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          Domain / DNS
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'url' && <URLScanner />}
        {activeTab === 'email' && <EmailAnalyser />}
        {activeTab === 'dns' && <DomainDNS />}
      </div>
    </div>
  )
}
