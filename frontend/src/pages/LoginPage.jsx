import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const { login, verifyLogin, forgotPassword } = useAuth()
  const navigate                  = useNavigate()
  const [loading, setLoading]     = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  // 2FA State
  const [show2FA, setShow2FA] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result?.requires_2fa) {
       setLoginEmail(result.email)
       setShow2FA(true)
    } else if (result?.success) {
       navigate('/dashboard')
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) return toast.error('Please enter the 6-digit code')
    
    setVerifying(true)
    const success = await verifyLogin(loginEmail, otpString)
    setVerifying(false)
    if (success) {
      toast.success('Device verified successfully!')
      navigate('/dashboard')
    }
  }

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1) // only allow 1 char
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setSendingReset(true)
    const success = await forgotPassword(forgotEmail)
    setSendingReset(false)
    if (success) setShowForgot(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Back to Home Link */}
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

        <div className="bg-white/80 border border-slate-200 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-800 text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} className="text-sm font-medium text-brand-400 hover:text-brand-300">Recover Password</button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-12 text-slate-800 text-base font-mono focus:border-brand-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-base text-slate-500">
              Not registered? <Link to="/register" className="text-white font-bold hover:text-brand-400 transition-colors">Create Account</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
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
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-800 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={sendingReset}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {sendingReset ? 'Initiating Recovery...' : 'Send Recovery Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Verification Modal */}
      {show2FA && (
        <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-brand-500/30 rounded-2xl p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(6,182,212,0.15)]">
            <button onClick={() => setShow2FA(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 transition-colors">
              <X size={20} />
            </button>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                <Shield size={32} className="text-brand-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Device Verification</h3>
            <p className="text-sm text-slate-500 text-center mb-8">
              We've sent a 6-digit verification code to <strong className="text-slate-800">{loginEmail}</strong>. 
              Please enter it below to complete sign-in.
            </p>
            
            <form onSubmit={handleVerify2FA} className="flex flex-col gap-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-800 text-2xl font-bold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={verifying || otp.join('').length !== 6}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center"
              >
                {verifying ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : 'Verify & Sign In'}
              </button>
            </form>
            <p className="text-xs text-center text-slate-500 mt-6">
              Didn't receive the email? Check your spam folder or try signing in again.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
