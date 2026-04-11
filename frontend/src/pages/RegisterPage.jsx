import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, Building, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [org, setOrg]           = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const { register }            = useAuth()
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.endsWith('.uk') && !email.endsWith('.com')) {
      toast.error('Must use a valid corporate email address')
      return
    }
    setLoading(true)
    const success = await register(email, password)
    setLoading(false)
    if (success) {
      toast.success('Registration successful. You can now login.')
      navigate('/login')
    }
  }

  const features = [
    'Instant phishing URL analysis',
    'Real-time UK threat intelligence feed',
    'AI-powered detection engine',
    'Full audit trail & compliance reports',
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#060d1f' }}>

      {/* ── Left Panel – Register Form ── */}
      <div style={{
        width: '500px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2.5rem',
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Logo + header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.8rem' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>PhishGuard UK</div>
              <div style={{ color: '#475569', fontSize: '0.78rem' }}>Node Onboarding Portal</div>
            </div>
          </div>

          <h2 style={{
            fontSize: '1.65rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.3px', marginBottom: '0.4rem',
          }}>Create your account</h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.8rem' }}>
            Register your institution to start protecting against phishing threats.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Institution */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Institution Name
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  id="register-org"
                  type="text"
                  required
                  placeholder="e.g. Lloyds Banking Group"
                  value={org}
                  onChange={e => setOrg(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Corporate Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="security@lloyds.co.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Master Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  id="register-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '2.8rem', fontFamily: 'monospace', letterSpacing: '0.08em' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Terms notice */}
            <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.2rem 0' }}>
              By registering, you agree to PhishGuard UK's institutional terms of use and data processing agreement.
            </p>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#4f46e5,#3b82f6)',
                border: 'none', borderRadius: 10, color: '#fff',
                fontSize: '0.92rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 24px rgba(79,70,229,0.4)',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <><span>Submit Registration</span><ArrowRight size={17} /></>
              )}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#475569' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right Panel – Hero Image ── */}
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
          src="/register-hero.jpg"
          alt="Cybersecurity concept"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        />
        {/* Dark overlay, heavier on left to blend with form panel */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, rgba(6,13,31,0.9) 0%, rgba(6,13,31,0.55) 40%, rgba(6,13,31,0.75) 100%)',
        }} />

        {/* Content overlay */}
        <div style={{
          position: 'relative', zIndex: 10,
          padding: '2.5rem', maxWidth: '480px', textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '1.8rem', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.3px', marginBottom: '0.75rem', lineHeight: 1.25,
          }}>
            Defend Your Institution<br />
            <span style={{ color: '#60a5fa' }}>Against Modern Phishing</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '2.2rem' }}>
            Join UK financial institutions and enterprises already protected by PhishGuard's intelligent threat detection platform.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
            {features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2.5rem',
            flexWrap: 'wrap',
          }}>
            {[['99.7%', 'Detection Rate'], ['<50ms', 'Analysis Speed'], ['500+', 'UK Nodes']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{val}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.72rem 1rem 0.72rem 2.4rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#e2e8f0',
  fontSize: '0.88rem', outline: 'none',
  transition: 'border-color 0.2s',
}
