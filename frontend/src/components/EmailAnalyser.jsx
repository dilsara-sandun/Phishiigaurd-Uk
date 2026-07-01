import React, { useState, useRef } from 'react'
import { FileText, Upload, ShieldAlert, Cpu, CheckCircle, AlertTriangle, ShieldCheck, Mail, Shield, ExternalLink } from 'lucide-react'
import { useScan } from '@/hooks/useScan'
import AIExplanation from './AIExplanation'

export default function EmailAnalyser() {
  const [content, setContent] = useState('')
  const [isHovering, setIsHovering] = useState(false)
  const { scanEmail, scanEmailFile, loading } = useScan()
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleAnalyse = async () => {
    if (!content.trim()) return
    const res = await scanEmail(content)
    setResult(res)
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsHovering(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleFileUpload = async (file) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      alert("Error: Invalid file format. Only PDF (.pdf) and Text (.txt) files are allowed. Please check again.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (isPdf) {
      setContent(`[PDF Uploaded: ${file.name}]\n\nProcessing PDF document via AI...`)
      try {
        const res = await scanEmailFile(file)
        setResult(res)
        setContent(`[PDF Processed: ${file.name}]\n\nThe text has been successfully extracted and analyzed by the PhishGuard AI pipeline. See results below.`)
      } catch (err) {
        setContent('')
        const errorDetail = err.response?.data?.detail || "Could not analyze the file. Please check again.";
        alert(errorDetail);
      }
    } else {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const txtContent = e.target.result
        setContent(txtContent)
        try {
          const res = await scanEmail(txtContent)
          setResult(res)
        } catch (err) {
          const errorDetail = err.response?.data?.detail || "Could not analyze the text file.";
          alert(errorDetail);
        }
      }
      reader.readAsText(file)
    }
  }

  const getEmailStatusVisuals = (status) => {
    switch (status?.toLowerCase()) {
      case 'phishing': return { color: 'text-danger-500', bg: 'bg-danger-500/10', border: 'border-danger-500/20', icon: ShieldAlert, label: 'Malicious Email' }
      case 'suspicious': return { color: 'text-warn-500', bg: 'bg-warn-500/10', border: 'border-warn-500/20', icon: AlertTriangle, label: 'Suspicious Email' }
      default: return { color: 'text-safe-500', bg: 'bg-safe-500/10', border: 'border-safe-500/20', icon: ShieldCheck, label: 'Safe Email' }
    }
  }

  const visuals = result ? getEmailStatusVisuals(result.overall_label) : null

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Raw Email Header & Body Analysis</h2>
        <p className="text-sm text-slate-500 mb-6">Paste the email text or drag/upload a file to check for NLP phishing indicators.</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.txt" 
          onChange={handleFileSelect} 
        />

        <div 
          className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 text-center cursor-pointer
            ${isHovering ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100'}`}
          onDragOver={(e) => { e.preventDefault(); setIsHovering(true) }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm text-brand-600">
            <Upload size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload or drag and drop .pdf or .txt here</p>
          <p className="text-xs text-slate-500 mb-6">or paste raw content below</p>

          <textarea
            value={content}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setContent(e.target.value)}
            className="textarea-field min-h-[200px]"
            placeholder="Return-Path: <spoofed@lloydsbanks.com>&#10;Received: from mail.attacker.net...&#10;&#10;Dear Customer,&#10;Your account has been restricted..."
            disabled={loading}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <button onClick={handleAnalyse} disabled={!content.trim() || loading} className="btn-primary">
            <Cpu size={16} /> {loading ? 'Analysing...' : 'Run NLP Analysis'}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Threat Score Visualizer */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 text-center border-t-2" style={{ borderTopColor: visuals.color.replace('text-', '') }}>
              <div className={`mx-auto w-16 h-16 rounded-full ${visuals.bg} flex items-center justify-center mb-4`}>
                <visuals.icon size={32} className={visuals.color} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{visuals.label}</h3>
              <p className="text-xs text-slate-500">Combined NLP & Embedded URL Check</p>

              <div className="divider my-6" />

              <div className="text-left space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 uppercase font-semibold">Combined Risk Index</span>
                    <span className="text-slate-800 font-mono">{result.overall_score_pct} / 100</span>
                  </div>
                  <div className="score-bar-track">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        result.overall_score > 0.7 ? 'bg-danger-500' : result.overall_score > 0.4 ? 'bg-warn-400' : 'bg-safe-500'
                      }`}
                      style={{ width: `${Math.max(5, result.overall_score_pct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 text-sm border-t border-slate-100 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">NLP Engine</span>
                    <span className="text-slate-800 font-medium">Logistic Regression</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Embedded links</span>
                    <span className="text-slate-800 font-mono font-medium">
                      {result.extracted_urls?.length || 0} found
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flags Summary */}
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-brand-400" />
                Security Indicators Breakdown
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Flags Column */}
                <div>
                  <h4 className="text-xs font-bold text-danger-500 uppercase tracking-widest mb-3">Threat Indicators ({result.red_flags?.length || 0})</h4>
                  <div className="space-y-3">
                    {result.red_flags && result.red_flags.length > 0 ? (
                      result.red_flags.map((flag, idx) => (
                        <div key={idx} className="p-3 bg-danger-500/5 border border-danger-500/10 rounded-xl">
                          <p className="text-xs font-bold text-danger-600 capitalize">{flag.flag_name.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">{flag.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No threat indicators detected.</p>
                    )}
                  </div>
                </div>

                {/* Green Flags Column */}
                <div>
                  <h4 className="text-xs font-bold text-safe-500 uppercase tracking-widest mb-3">Safety Indicators ({result.green_flags?.length || 0})</h4>
                  <div className="space-y-3">
                    {result.green_flags && result.green_flags.length > 0 ? (
                      result.green_flags.map((flag, idx) => (
                        <div key={idx} className="p-3 bg-safe-500/5 border border-safe-500/10 rounded-xl">
                          <p className="text-xs font-bold text-safe-600 capitalize">{flag.flag_name.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-snug">{flag.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No special safety indicators detected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded URLs Table */}
            {result.extracted_urls && result.extracted_urls.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Embedded URLs Scan Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-bold text-slate-500 uppercase py-2">URL / Link</th>
                        <th className="text-center text-xs font-bold text-slate-500 uppercase py-2">Verdict</th>
                        <th className="text-right text-xs font-bold text-slate-500 uppercase py-2">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.extracted_urls.map((url, idx) => (
                        <tr key={idx} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-sm font-mono text-slate-700 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={url.input_value}>
                            {url.input_value}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                              url.label === 'phishing' ? 'bg-danger-500/20 text-danger-500 border border-danger-500/30' : 'bg-safe-500/20 text-safe-500 border border-safe-500/30'
                            }`}>
                              {url.label}
                            </span>
                          </td>
                          <td className="py-3 text-right text-sm font-bold text-slate-800 font-mono">
                            {url.score_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Explanation Summary */}
            <AIExplanation explanation={result.explanation} loading={loading} />
          </div>
        </div>
      )}
    </div>
  )
}
