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
      <div className="flex bg-slate-200/50 border border-slate-200 p-1 rounded-xl w-fit shadow-inner">
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'url' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
          }`}
        >
          URL Scanner
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'email' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
          }`}
        >
          Email Analyser
        </button>
        <button
          onClick={() => setActiveTab('dns')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all border-l border-transparent ${
            activeTab === 'dns' ? 'bg-white text-brand-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
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
