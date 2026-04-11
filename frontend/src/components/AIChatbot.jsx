import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, x, Send, Shield, Bot, User, Minimize2, Maximize2, X } from 'lucide-react'
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
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bot size={28} color="#fff" />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      width: isMinimized ? '200px' : '380px',
      height: isMinimized ? '60px' : '500px',
      display: 'flex', flexDirection: 'column',
      background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      zIndex: 1000, overflow: 'hidden', transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem', background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff'
      }}>
        <Shield size={20} />
        <span style={{ fontWeight: 700, flex: 1, fontSize: '0.9rem' }}>PhishGuard AI Expert</span>
        <button onClick={() => setIsMinimized(!isMinimized)} style={headerBtnStyle}>
          {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
        <button onClick={() => setIsOpen(false)} style={headerBtnStyle}>
          <X size={16} />
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Chat area */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 12,
                  background: m.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                  color: m.role === 'user' ? '#fff' : '#e2e8f0',
                  fontSize: '0.88rem', lineHeight: 1.5,
                  boxShadow: m.role === 'user' ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                AI is thinking...
              </div>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 2.8rem 0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#fff', fontSize: '0.88rem', outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: (loading || !input.trim()) ? '#475569' : '#6366f1'
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
  width: 60, height: 60, borderRadius: '50%',
  background: 'linear-gradient(135deg,#4f46e5,#3b82f6)',
  border: 'none', cursor: 'pointer', zIndex: 1000,
  boxShadow: '0 8px 30px rgba(99,102,241,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'transform 0.2s',
}

const headerBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
