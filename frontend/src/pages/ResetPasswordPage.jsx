import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  
  const [token, setToken] = useState(tokenFromUrl)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const success = await resetPassword(token, newPassword)
    setLoading(false)
    if (success) {
      navigate('/login')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#060d1f', padding: '1.5rem'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24,
        padding: '3rem 2.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 30px rgba(99,102,241,0.4)',
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>New Password</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Enter your reset code and choose a secure new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Reset Code</label>
            <input
              type="text"
              required
              placeholder="Enter the code from your email"
              value={token}
              onChange={e => setToken(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: '2.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={eyeButtonStyle}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.85rem', marginTop: '0.5rem',
              background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 25px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? 'Updating...' : <><span style={{marginRight: '8px'}}>Update Password</span><ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600,
  marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em'
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.85rem 1.1rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff',
  fontSize: '0.95rem', outline: 'none',
}

const eyeButtonStyle = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#475569'
}
