import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Shield, Bot, User, Minimize2, Maximize2, X } from 'lucide-react'
import api from '../services/api'

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm PhishGuard AI, your security assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true)
      setIsMinimized(false)
    }
    window.addEventListener('open-chatbot', handleOpenChatbot)
    return () => {
      window.removeEventListener('open-chatbot', handleOpenChatbot)
    }
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const resp = await api.post('/ai/chat', { message: input })
      const aiMsg = { role: 'assistant', content: resp.data.response }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errMsg = { role: 'assistant', content: "I'm having trouble connecting to my brain. Please check your connection or try again later." }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={fabStyle}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={pulseDot} />
        <Bot size={28} color="#fff" />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      width: isMinimized ? '220px' : '380px',
      height: isMinimized ? '60px' : '500px',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(6, 182, 212, 0.35)',
      borderRadius: 20,
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), 0 0 30px rgba(6, 182, 212, 0.15)',
      zIndex: 1000, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, #06b6d4, #4f46e5)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <Shield size={20} className="text-cyan-200" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.3px' }}>PhishGuard AI Expert</span>
          {!isMinimized && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={greenIndicatorDot} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Online 24/7 (Gemini)</span>
            </div>
          )}
        </div>
        <button onClick={() => setIsMinimized(!isMinimized)} style={headerBtnStyle} title="Minimize/Maximize">
          {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
        <button onClick={() => setIsOpen(false)} style={headerBtnStyle} title="Close">
          <X size={16} />
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Chat area */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  padding: '0.75rem 1.1rem', borderRadius: 14,
                  background: m.role === 'user' 
                    ? 'linear-gradient(135deg, #4f46e5, #6366f1)' 
                    : 'rgba(255,255,255,0.06)',
                  color: m.role === 'user' ? '#fff' : '#f1f5f9',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  boxShadow: m.role === 'user' ? '0 4px 15px rgba(99,102,241,0.35)' : 'none',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.03)'
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', paddingLeft: '4px' }}>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                AI is processing...
              </div>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ask PhishGuard AI anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                style={{
                  width: '100%', padding: '0.85rem 3rem 0.85rem 1.1rem',
                  background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 12, color: '#fff', fontSize: '0.85rem', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.65)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)'}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: (loading || !input.trim()) ? '#475569' : '#06b6d4',
                  transition: 'color 0.2s',
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

const fabStyle = {
  position: 'fixed', bottom: '2rem', right: '2rem',
  width: 65, height: 65, borderRadius: '50%',
  background: 'linear-gradient(135deg,#06b6d4,#4f46e5)',
  border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', zIndex: 1000,
  boxShadow: '0 8px 32px rgba(6, 182, 212, 0.45), inset 0 2px 4px rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}

const pulseDot = {
  position: 'absolute', top: 2, right: 2,
  width: 14, height: 14, borderRadius: '50%',
  background: '#10b981', border: '2.5px solid #0f172a',
  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
}

const greenIndicatorDot = {
  width: 6, height: 6, borderRadius: '50%',
  background: '#10b981', display: 'inline-block',
  boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
}

const headerBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px',
}
