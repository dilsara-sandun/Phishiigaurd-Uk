import React from 'react'
import { Sparkles, Bot, AlertCircle } from 'lucide-react'
import DOMPurify from 'dompurify'

export default function AIExplanation({ explanation, loading }) {
  if (loading) {
    return (
      <div className="glass-card p-5 animate-pulse-slow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
             <Bot size={16} className="text-brand-400" />
          </div>
          <div className="h-4 bg-white/[0.08] rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.06] rounded w-full" />
          <div className="h-3 bg-white/[0.06] rounded w-5/6" />
          <div className="h-3 bg-white/[0.06] rounded w-4/6" />
        </div>
      </div>
    )
  }

  if (!explanation) return null

  // Process the explanation text if it comes in markdown-like format from Ollama
  // Simple heuristic: Bold "**" to highlighting, lists to actual lists.
  const formattedSections = explanation.split('\n\n').filter(Boolean)

  return (
    <div className="glass-card overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600/20 to-transparent p-4 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shadow-glow">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Threat Analysis</h3>
          <p className="text-xs text-brand-200">Powered by local Phi-3 engine</p>
        </div>
      </div>

      <div className="p-5 text-sm text-slate-300 leading-relaxed font-sans space-y-4">
        {formattedSections.map((section, idx) => {
          if (section.trim().startsWith('-')) {
             const listItems = section.split('\n').map(l => l.replace(/^- /, '').trim()).filter(Boolean)
             return (
               <ul key={idx} className="list-disc list-outside ml-4 space-y-1.5 text-slate-300">
                 {listItems.map((item, i) => (
                    <li key={i}>{item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')}</li>
                 ))}
               </ul>
             )
          }
          
          let parsedText = section.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
          
          if (section.toLowerCase().includes('recommendation') || section.toLowerCase().includes('action')) {
             return (
               <div key={idx} className="bg-safe-500/10 border border-safe-500/20 rounded-lg p-3 flex gap-3 mt-4">
                 <AlertCircle size={16} className="text-safe-400 flex-shrink-0 mt-0.5" />
                 <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedText) }} />
               </div>
             )
          }

          return <p key={idx} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parsedText) }} />
        })}
      </div>
    </div>
  )
}
