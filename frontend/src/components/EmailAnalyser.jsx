import React, { useState } from 'react'
import { FileText, Upload, ShieldAlert, Cpu } from 'lucide-react'

export default function EmailAnalyser() {
  const [content, setContent] = useState('')
  const [isHovering, setIsHovering] = useState(false)

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Raw Email Header & Body Analysis</h2>
        <p className="text-sm text-slate-400 mb-6">Paste the raw EML content or email headers to detect SPF/DKIM/DMARC failures and NLP-based phishing hooks.</p>
        
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 text-center
            ${isHovering ? 'border-brand-500 bg-brand-500/5' : 'border-white/[0.1] bg-white/[0.02]'}`}
          onDragOver={(e) => { e.preventDefault(); setIsHovering(true) }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={(e) => { e.preventDefault(); setIsHovering(false) }}
        >
          <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center mx-auto mb-4 border border-white/[0.05] shadow-inner text-slate-400">
            <Upload size={20} />
          </div>
          <p className="text-sm text-slate-300 mb-1">Drag and drop .eml file here</p>
          <p className="text-xs text-slate-500 mb-6">or paste raw content below</p>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="textarea-field min-h-[200px]"
            placeholder="Return-Path: <spoofed@lloydsbanks.com>&#10;Received: from mail.attacker.net...&#10;&#10;Dear Customer,&#10;Your account has been restricted..."
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" disabled={!content.trim()}>
            <Cpu size={16} /> Run NLP Analysis
          </button>
        </div>
      </div>

      {/* Placeholders for future feature expansion */}
      <div className="glass-card p-6 opacity-60">
        <div className="flex items-center gap-3 text-slate-400 mb-4">
          <ShieldAlert size={18} />
          <h3 className="font-semibold text-white">Analysis Status</h3>
        </div>
        <p className="text-sm">NLP classification module pending deployment. Currently utilizing URL features via extraction.</p>
      </div>
    </div>
  )
}
