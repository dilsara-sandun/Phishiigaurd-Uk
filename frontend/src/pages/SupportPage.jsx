import React from 'react'
import { LifeBuoy, Mail, MessageSquare, FileText, ExternalLink } from 'lucide-react'

export default function SupportPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <LifeBuoy className="text-brand-400" />
          Analyst Support
        </h1>
        <p className="page-sub">Resources, API Documentation, and Contact</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* API Docs Panel */}
        <div className="glass-card p-6 flex flex-col items-center text-center group hover:border-brand-500/30 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <FileText size={32} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">API Documentation</h3>
          <p className="text-sm text-slate-500 mb-6 flex-1">
            Integrate PhishGuard's ML engine directly into your institution's SOC tools. View the OpenAPI specifications and Swagger UI.
          </p>
          <a 
            href="http://localhost:8000/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary w-full justify-center"
          >
            Open Swagger UI <ExternalLink size={16} />
          </a>
        </div>

        {/* Technical Support Panel */}
        <div className="glass-card p-6 border-transparent">
          <h3 className="text-lg font-bold text-slate-800 mb-2 border-b border-white/[0.06] pb-4">Contact Engineering</h3>
          <div className="space-y-4 mt-6">
            
            <div className="flex items-start gap-4">
               <div className="mt-1 w-10 h-10 rounded-xl bg-slate-100 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-slate-600" />
               </div>
               <div>
                 <p className="text-sm font-semibold text-slate-800">Direct Email</p>
                 <p className="text-xs text-slate-500 mb-1">For API token requests and general architecture inquiries.</p>
                 <a href="mailto:support@phishguard.ac.uk" className="text-sm text-brand-400 hover:underline">support@phishguard.ac.uk</a>
               </div>
            </div>

            <div className="flex items-start gap-4">
               <div className="mt-1 w-10 h-10 rounded-xl bg-slate-100 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={18} className="text-slate-600" />
               </div>
               <div>
                 <p className="text-sm font-semibold text-slate-800">Live SOC Channel</p>
                 <p className="text-xs text-slate-500 mb-1">For urgent model false-positive reporting or feedback.</p>
                 <button className="text-sm text-brand-400 hover:underline">Open Live Chat (Unavailable)</button>
               </div>
            </div>

          </div>
        </div>

      </div>

      <div className="glass-card p-6 mt-8">
        <h3 className="text-base font-semibold text-slate-800 mb-3">Model Feedback & Retraining</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          XGBoost v1 is periodically retrained using data submitted from connected nodes. 
          If you encounter a false negative (a phishing site marked legitimate), please flag it via the History panel. 
          The local Phi-3 LLM instance operates autonomously to explain features and does not send data externally.
        </p>
        <div className="p-4 rounded-xl bg-safe-500/10 border border-safe-500/20 text-safe-400 text-sm flex gap-3">
          <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
          <p>
            Your current institutional privacy setting is <strong>Strict</strong>. 
            URL parameters and query strings are stripped before features are extracted for the ML Pipeline.
          </p>
        </div>
      </div>

    </div>
  )
}
