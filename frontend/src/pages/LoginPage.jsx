import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Shield, Mail, Lock, ArrowRight, Eye, EyeOff, X,
  Smartphone, KeyRound, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── 2FA mode constants ────────────────────────────────────────────────────────
const MODE_TOTP  = 'totp'   // Microsoft Authenticator / TOTP app
const MODE_EMAIL = 'email'  // Email OTP fallback

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  // Forgot password
  const [showForgot, setShowForgot]     = useState(false)
  const [forgotEmail, setForgotEmail]   = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  // 2FA state
  const [show2FA, setShow2FA]         = useState(false)
  const [twoFAMode, setTwoFAMode]     = useState(MODE_TOTP)  // or MODE_EMAIL
  const [totpAvailable, setTotpAvailable] = useState(false)
  const [loginEmail, setLoginEmail]   = useState('')

  // Unified 6-digit code state
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)

  // Input refs for auto-focusing
  const codeRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ]

  const { login, verifyLogin, verifyLoginTotp, forgotPassword } = useAuth()
  const navigate = useNavigate()

  // Auto-focus first input when the 2FA modal opens
  useEffect(() => {
    if (show2FA) {
      setCode(['', '', '', '', '', ''])
      setTimeout(() => codeRefs[0].current?.focus(), 150)
    }
  }, [show2FA, twoFAMode])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result?.requires_2fa) {
      setLoginEmail(result.email)
      const hasTOTP = result.totp_available ?? false
      setTotpAvailable(hasTOTP)
      setTwoFAMode(hasTOTP ? MODE_TOTP : MODE_EMAIL)
      setCode(['', '', '', '', '', ''])
      setShow2FA(true)
    } else if (result?.success) {
      navigate('/dashboard')
    }
  }

  // Unified Verify (TOTP or Email OTP)
  const handleVerify2FA = async (e) => {
    if (e) e.preventDefault()
    const codeString = code.join('')
    if (codeString.length !== 6 || !/^\d{6}$/.test(codeString)) {
      return toast.error('Please enter the 6-digit verification code')
    }
    
    setVerifying(true)
    let success = false
    if (twoFAMode === MODE_TOTP) {
      success = await verifyLoginTotp(loginEmail, codeString)
    } else {
      success = await verifyLogin(loginEmail, codeString)
    }
    setVerifying(false)
    
    if (success) {
      toast.success(twoFAMode === MODE_TOTP ? 'Signed in with authenticator!' : 'Device verified successfully!')
      navigate('/dashboard')
    }
  }

  const handleCodeChange = (index, value) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '').slice(-1)
    
    const newCode = [...code]
    newCode[index] = cleaned
    setCode(newCode)

    // Focus next box if digit entered
    if (cleaned && index < 5) {
      codeRefs[index + 1].current?.focus()
    }
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const newCode = [...code]
        newCode[index - 1] = ''
        setCode(newCode)
        codeRefs[index - 1].current?.focus()
      } else {
        const newCode = [...code]
        newCode[index] = ''
        setCode(newCode)
      }
    }
  }

  const handleCodePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 0) return

    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      if (i < pastedData.length) {
        newCode[i] = pastedData[i]
      }
    }
    setCode(newCode)

    // Focus last filled box
    const focusIndex = Math.min(pastedData.length, 5)
    codeRefs[focusIndex].current?.focus()

    // Auto submit if 6 digits are pasted
    if (pastedData.length === 6) {
      // Small delay so state updates are committed before submit
      setTimeout(() => {
        const submitBtn = document.getElementById('2fa-submit-btn')
        if (submitBtn) submitBtn.click()
      }, 150)
    }
  }

  // Switch from TOTP → email OTP (send email OTP request)
  const switchToEmailOTP = async () => {
    setTwoFAMode(MODE_EMAIL)
    setCode(['', '', '', '', '', ''])
    toast('Sending email verification code…', { icon: '✉️' })
    try {
      const result = await login(email, password)
      if (result?.requires_2fa) {
        toast.success('Verification code sent to your email.')
      }
    } catch {
      toast.error('Failed to send email code. Please try again.')
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setSendingReset(true)
    const success = await forgotPassword(forgotEmail)
    setSendingReset(false)
    if (success) setShowForgot(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back link */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowRight size={16} className="rotate-180" /> Back to Platform
      </Link>

      <div className="w-full max-w-md relative z-10 px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-6">
            <Shield size={28} className="text-slate-800" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-3">Sign In</h1>
          <p className="text-slate-500 text-lg">Enter your credentials to access PhishGuard UK.</p>
        </div>

        <div className="bg-white/80 border border-slate-200 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" required placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-black text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-sm font-medium text-brand-400 hover:text-brand-300">
                  Recover Password
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'} required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 text-black text-base font-mono focus:border-brand-500 focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="mt-4 w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-base text-slate-500">
              Not registered? <Link to="/register" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">Create Account</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ─────────────────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-slate-50/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full relative">
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Recover Password</h3>
            <p className="text-sm text-slate-500 mb-6">Enter your email address to receive recovery instructions.</p>
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required placeholder="you@example.com"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-black text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button type="submit" disabled={sendingReset}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm disabled:opacity-50">
                {sendingReset ? 'Initiating Recovery...' : 'Send Recovery Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 2FA Verification Modal ────────────────────────────────────────────── */}
      {show2FA && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-brand-500/20 rounded-2xl p-8 max-w-md w-full relative shadow-[0_0_60px_rgba(6,182,212,0.12)] animate-in fade-in zoom-in-95">
            <button onClick={() => setShow2FA(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg
                ${twoFAMode === MODE_TOTP
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/30'
                  : 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-500/30'}`}>
                {twoFAMode === MODE_TOTP
                  ? <Smartphone size={32} className="text-white" />
                  : <Mail size={32} className="text-white" />}
              </div>
            </div>

            {/* Header Titles */}
            <h3 className="text-2xl font-bold text-slate-800 text-center mb-1 tracking-tight">
              {twoFAMode === MODE_TOTP ? 'Authenticator Verification' : 'Email Verification'}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-2">
              {twoFAMode === MODE_TOTP ? (
                <>Open <strong>Microsoft Authenticator</strong> and enter the 6-digit code for <strong>PhishGuard UK</strong>.</>
              ) : (
                <>We've sent a 6-digit verification code to <strong>{loginEmail}</strong>.</>
              )}
            </p>
            <p className="text-xs text-center text-slate-400 mb-6">
              Signing in as <span className="font-mono text-slate-600">{loginEmail}</span>
            </p>

            {/* Verification Form */}
            <form onSubmit={handleVerify2FA} className="flex flex-col gap-6">
              {/* Unified 6 visual digit boxes */}
              <div className="flex justify-between gap-2" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={codeRefs[i]}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    className={`w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-black text-2xl font-black focus:ring-2 focus:outline-none transition-all ${
                      twoFAMode === MODE_TOTP ? 'focus:border-purple-500 focus:ring-purple-500/20' : 'focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                  />
                ))}
              </div>

              {twoFAMode === MODE_TOTP && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                  <Shield size={14} className="text-purple-500 shrink-0" />
                  <p className="text-xs text-purple-700 leading-normal">
                    Codes refresh every 30 seconds. Tap the first box to paste copied codes.
                  </p>
                </div>
              )}

              <button id="2fa-submit-btn" type="submit"
                disabled={verifying || code.join('').length !== 6}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md ${
                  twoFAMode === MODE_TOTP
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-purple-500/20'
                    : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-brand-500/20'
                }`}>
                {verifying
                  ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : <><Shield size={18} /><span>Verify &amp; Sign In</span></>}
              </button>
            </form>

            {/* Bottom Swappers */}
            {twoFAMode === MODE_TOTP ? (
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 mb-2">Don't have access to your authenticator?</p>
                <button onClick={switchToEmailOTP}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                  <RefreshCw size={13} />
                  Use email verification code instead
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-center text-slate-400 mt-5">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button onClick={() => { setShow2FA(false) }} className="text-brand-500 hover:underline">
                    try signing in again
                  </button>.
                </p>

                {totpAvailable && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <button onClick={() => { setTwoFAMode(MODE_TOTP); setCode(['', '', '', '', '', '']) }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-500 hover:text-purple-600 transition-colors">
                      <Smartphone size={13} />
                      Use Authenticator App instead
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
