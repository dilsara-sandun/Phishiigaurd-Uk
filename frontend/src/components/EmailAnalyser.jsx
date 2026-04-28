import React, { useState, useRef } from 'react'
import { FileText, Upload, ShieldAlert, Cpu } from 'lucide-react'
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
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setContent(`[PDF Uploaded: ${file.name}]\n\nProcessing PDF document via AI...`)
      try {
        const res = await scanEmailFile(file)
        setResult(res)
        // Set the explanation text in the content box for visual feedback
        setContent(`[PDF Processed: ${file.name}]\n\nThe text has been successfully extracted and analyzed by the PhishGuard AI pipeline. See results below.`)
      } catch (err) {
        setContent('')
      }
    } else {
      readFile(file)
    }
  }

  const readFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => setContent(e.target.result)
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Raw Email Header & Body Analysis</h2>
        <p className="text-sm text-slate-500 mb-6">Paste the raw EML content or email headers to detect SPF/DKIM/DMARC failures and NLP-based phishing hooks.</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".eml,.txt,.pdf" 
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
          <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload or drag and drop .eml, .txt, or .pdf here</p>
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
        <div className="animate-fade-in space-y-6">
          <div className="glass-card flex flex-col md:flex-row p-6 gap-6 md:items-center">
             <div className="flex-1">
               <h3 className="text-2xl font-extrabold text-slate-800 mb-1">
                 {result.overall_label === 'phishing' ? 'Phishing Detected' : result.overall_label === 'suspicious' ? 'Suspicious Email' : 'Safe Email'}
               </h3>
               <p className="text-sm font-medium text-slate-500">Combined NLP & Embedded URL Threat Check</p>
             </div>
             <div className="flex flex-col md:items-end bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
               <span className="text-4xl font-black text-brand-600">{result.overall_score_pct}%</span>
               <span className="text-xs text-slate-500 font-bold tracking-wider uppercase mt-1">Threat Level</span>
             </div>
          </div>
          <AIExplanation explanation={result.explanation} loading={loading} />
        </div>
      )}
    </div>
  )
}
