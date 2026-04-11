import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, Chrome, Facebook } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const { login, forgotPassword } = useAuth()
  const navigate                  = useNavigate()
  const [loading, setLoading]     = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) navigate('/dashboard')
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setSendingReset(true)
    const success = await forgotPassword(forgotEmail)
    setSendingReset(false)
    if (success) setShowForgot(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060d1f' }}>

      {/* ── Left Panel – Hero Image ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>
        {/* Background image */}
        <img
          src="/login-hero.jpg"
          alt="Phishing threat illustration"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        {/* Dark gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(6,13,31,0.78) 0%, rgba(6,13,31,0.45) 60%, rgba(6,13,31,0.82) 100%)',
        }} />

        {/* Branding text on top of image */}
        <div style={{
          position: 'relative', zIndex: 10,
          textAlign: 'center', padding: '2rem',
          maxWidth: '480px',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            boxShadow: '0 0 32px rgba(99,102,241,0.5)',
            marginBottom: '1.5rem',
          }}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '2.2rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.5px', marginBottom: '0.75rem', lineHeight: 1.2,
          }}>
            PhishGuard <span style={{ color: '#60a5fa' }}>UK</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', lineHeight: 1.6 }}>
            Advanced phishing threat intelligence for<br />UK financial institutions &amp; enterprises.
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            {['Real-time Detection', 'AI-Powered', 'UK Threat Intel'].map(chip => (
              <span key={chip} style={{
                padding: '0.3rem 0.85rem', borderRadius: 999,
                background: 'rgba(99,102,241,0.18)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600,
              }}>{chip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel – Login Form ── */}
      <div style={{
        width: '480px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2.5rem',
        background: 'rgba(255,255,255,0.03)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Form header */}
          <h2 style={{
            fontSize: '1.7rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.3px', marginBottom: '0.4rem',
          }}>Welcome back</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Sign in to your analyst account
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="analyst@bank.co.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: '#e2e8f0',
                    fontSize: '0.92rem', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.75rem 2.8rem 0.75rem 2.6rem',
                    fontFamily: 'monospace', letterSpacing: '0.1em',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: '#e2e8f0',
                    fontSize: '0.92rem', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#4f46e5,#3b82f6)',
                border: 'none', borderRadius: 10, color: '#fff',
                fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 24px rgba(79,70,229,0.4)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <><span>Access Dashboard</span><ArrowRight size={18} /></>
              )}
            </button>

            {/* Social Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}></div>
              <span style={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }}></div>
            </div>

            {/* Social Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => toast.error('Google login placeholder')}
                style={socialButtonStyle}
              >
                <Chrome size={18} color="#fff" />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => toast.error('Facebook login placeholder')}
                style={socialButtonStyle}
              >
                <Facebook size={18} color="#fff" />
                <span>Facebook</span>
              </button>
            </div>
          </form>

          <p style={{ marginTop: '1.8rem', textAlign: 'center', fontSize: '0.87rem', color: '#475569' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Request access
            </Link>
          </p>

          {/* Security note */}
          <div style={{
            marginTop: '2.5rem', padding: '0.8rem 1rem',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10, textAlign: 'center',
          }}>
            <p style={{ color: '#6366f1', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>
              🔒 &nbsp;Secured with multi-layer encryption &amp; MFA
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(6,13,31,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '2.5rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reset Password</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  type="email"
                  required
                  placeholder="analyst@bank.co.uk"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={sendingReset}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: sendingReset ? 'rgba(99,102,241,0.5)' : '#6366f1',
                  border: 'none', borderRadius: 10, color: '#fff',
                  fontSize: '0.95rem', fontWeight: 700, cursor: sendingReset ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingReset ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  color: '#475569', fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const socialButtonStyle = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
  padding: '0.7rem 1rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, color: '#94a3b8',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s',
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.75rem 1rem 0.75rem 2.6rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#e2e8f0',
  fontSize: '0.92rem', outline: 'none',
  transition: 'border-color 0.2s',
}
