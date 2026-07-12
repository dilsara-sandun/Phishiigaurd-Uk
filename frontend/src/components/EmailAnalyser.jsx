import React, { useState, useRef } from "react"
import { FileText, Upload, ShieldAlert, Cpu, CheckCircle, AlertTriangle, ShieldCheck, Mail, Shield, FileWarning, Eye, Trash2, RotateCcw } from "lucide-react"
import { useScan } from "@/hooks/useScan"
import AIExplanation from "./AIExplanation"

function FileTypeWarningModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden animate-fade-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-400" />
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <FileWarning size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg leading-tight">Invalid File Type</h3>
              <p className="text-slate-500 text-sm mt-1">Attachment rejected by PhishGuard security policy.</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200/80 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-red-700">Please double check the document type</p>
            <p className="text-xs text-red-600/80 mt-1.5 leading-relaxed">
              The Email Analyser only accepts <strong>PDF files (.pdf)</strong> as attachments.
              For other content, paste the raw text directly into the text area below.
            </p>
          </div>
          <button onClick={onClose} id="file-warning-close-btn"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmailAnalyser() {
  const [content, setContent] = useState("")
  const [attachedFile, setAttachedFile] = useState(null)
  const [isHovering, setIsHovering] = useState(false)
  const [showFileWarning, setShowFileWarning] = useState(false)
  const { scanEmail, scanEmailFile, loading } = useScan()
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleAnalyse = async () => {
    if (attachedFile) {
      try {
        const res = await scanEmailFile(attachedFile)
        setResult(res)
      } catch (err) {
        alert(err.response?.data?.detail || "Could not analyze the file. Please check again.")
      }
    } else if (content.trim()) {
      const res = await scanEmail(content)
      setResult(res)
    }
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
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileUpload = async (file) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) { setShowFileWarning(true); return }
    
    setAttachedFile(file)
    setResult(null)
    
    try {
      const res = await scanEmailFile(file)
      setResult(res)
    } catch (err) {
      alert(err.response?.data?.detail || "Could not analyze the file. Please check again.")
    }
  }

  const handleRemoveFile = () => {
    setAttachedFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleViewPdf = () => {
    if (attachedFile) {
      const fileUrl = URL.createObjectURL(attachedFile)
      window.open(fileUrl, "_blank")
    }
  }

  const handleReset = () => {
    setContent("")
    setAttachedFile(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getEmailStatusVisuals = (status) => {
    switch (status?.toLowerCase()) {
      case "phishing":   return { color: "text-danger-500", bg: "bg-danger-500/10", border: "border-danger-500/20", icon: ShieldAlert,  label: "Malicious Email" }
      case "suspicious": return { color: "text-warn-500",   bg: "bg-warn-500/10",   border: "border-warn-500/20",   icon: AlertTriangle, label: "Suspicious Email" }
      default:           return { color: "text-safe-500",   bg: "bg-safe-500/10",   border: "border-safe-500/20",   icon: ShieldCheck,   label: "Safe Email" }
    }
  }

  const visuals = result ? getEmailStatusVisuals(result.overall_label) : null
  const charCount = content.length
  const tokenCount = Math.ceil(charCount / 4.0)

  return (
    <div className="space-y-6">
      {showFileWarning && <FileTypeWarningModal onClose={() => setShowFileWarning(false)} />}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Raw Email Header & Body Analysis</h2>
            <p className="text-sm text-slate-500">Paste raw email text below, or upload a <strong>PDF (.pdf)</strong> file to check indicators.</p>
          </div>
          {(content || attachedFile || result) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <RotateCcw size={12} /> Clear & Reset
            </button>
          )}
        </div>
        
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,application/pdf" onChange={handleFileSelect} />
        
        {!attachedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 text-center cursor-pointer mb-4 ${isHovering ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/50 hover:bg-slate-100"}`}
            onDragOver={(e) => { e.preventDefault(); setIsHovering(true) }}
            onDragLeave={() => setIsHovering(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm text-brand-600"><Upload size={20} /></div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1.5">
              <FileText size={12} className="text-red-500" />
              <span className="font-semibold text-red-600">PDF files only (.pdf)</span>
            </p>
            <p className="text-xs text-slate-400 mb-6">or paste raw email content directly below</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-brand-500/20 rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 truncate max-w-xs md:max-w-md">{attachedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(attachedFile.size)} • PDF Document</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewPdf}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Eye size={12} /> View PDF
              </button>
              <button
                onClick={handleRemoveFile}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`textarea-field min-h-[200px] ${attachedFile ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder={attachedFile ? "PDF document is attached. Remove it to analyze plain text instead." : "Return-Path: <spoofed@lloydsbanks.com>\nReceived: from mail.attacker.net...\n\nDear Customer,\nYour account has been restricted..."}
            disabled={loading || !!attachedFile}
          />
          {!attachedFile && (
            <div className="absolute bottom-3 right-3 text-[10px] bg-slate-200/80 backdrop-blur-sm px-2 py-1 rounded-md text-slate-500 font-mono">
              {charCount} chars | ~{tokenCount} tokens
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleAnalyse} disabled={(!content.trim() && !attachedFile) || loading} className="btn-primary">
            <Cpu size={16} /> {loading ? "Analysing..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 text-center border-t-2" style={{ borderTopColor: visuals.color.replace("text-", "") }}>
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
                    <div className={`h-full rounded-full transition-all duration-1000 ${result.overall_score > 0.7 ? "bg-danger-500" : result.overall_score > 0.4 ? "bg-warn-400" : "bg-safe-500"}`}
                      style={{ width: `${Math.max(5, result.overall_score_pct)}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 text-sm border-t border-slate-100 mt-4">
                  <div className="flex justify-between items-center"><span className="text-slate-500">NLP Engine</span><span className="text-slate-800 font-medium">Logistic Regression</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Embedded links</span><span className="text-slate-800 font-mono font-medium">{result.extracted_urls?.length || 0} found</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2"><Shield size={18} className="text-brand-400" />Security Indicators Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-danger-500 uppercase tracking-widest mb-3">Threat Indicators ({result.red_flags?.length || 0})</h4>
                  <div className="space-y-3">
                    {result.red_flags?.length > 0 ? result.red_flags.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-danger-500/5 border border-danger-500/10 rounded-xl">
                        <p className="text-xs font-bold text-danger-600 capitalize">{flag.flag_name.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">{flag.description}</p>
                      </div>
                    )) : <p className="text-xs text-slate-400 italic">No threat indicators detected.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-safe-500 uppercase tracking-widest mb-3">Safety Indicators ({result.green_flags?.length || 0})</h4>
                  <div className="space-y-3">
                    {result.green_flags?.length > 0 ? result.green_flags.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-safe-500/5 border border-safe-500/10 rounded-xl">
                        <p className="text-xs font-bold text-safe-600 capitalize">{flag.flag_name.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">{flag.description}</p>
                      </div>
                    )) : <p className="text-xs text-slate-400 italic">No special safety indicators detected.</p>}
                  </div>
                </div>
              </div>
            </div>
            {result.extracted_urls?.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-4">Embedded URLs Scan Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-100"><th className="text-left text-xs font-bold text-slate-500 uppercase py-2">URL / Link</th><th className="text-center text-xs font-bold text-slate-500 uppercase py-2">Verdict</th><th className="text-right text-xs font-bold text-slate-500 uppercase py-2">Risk Score</th></tr></thead>
                    <tbody>
                      {result.extracted_urls.map((url, idx) => (
                        <tr key={idx} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-sm font-mono text-slate-700 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={url.input_value}>{url.input_value}</td>
                          <td className="py-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${url.label === "phishing" ? "bg-danger-500/20 text-danger-500 border border-danger-500/30" : "bg-safe-500/20 text-safe-500 border border-safe-500/30"}`}>{url.label}</span></td>
                          <td className="py-3 text-right text-sm font-bold text-slate-800 font-mono">{url.score_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <AIExplanation explanation={result.explanation} loading={loading} />
          </div>
        </div>
      )}
    </div>
  )
}
