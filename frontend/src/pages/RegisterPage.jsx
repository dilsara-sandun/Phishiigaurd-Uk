import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register, verifyOtp }       = useAuth()
  const navigate                      = useNavigate()
  const [loading, setLoading]         = useState(false)
  const [showOtp, setShowOtp]         = useState(false)
  const [otp, setOtp]                 = useState('')
  const [verifying, setVerifying]     = useState(false)

  // Password strength helpers
  const hasUpper  = /[A-Z]/.test(password)
  const hasDigit  = /\d/.test(password)
  const hasLength = password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const success = await register(email, password, confirmPassword)
    setLoading(false)
    if (success) {
      toast.success('Account created! Please verify your email.')
      setShowOtp(true)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code from your email')
      return
    }
    setVerifying(true)
    const success = await verifyOtp(email, otp)
    setVerifying(false)
    if (success) {
      toast.success('Email verified! You can now sign in.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-graphite-900 text-slate-300 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back link */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors">
        <ArrowRight size={16} className="rotate-180" /> Back to Home
      </Link>

      <div className="w-full max-w-md relative z-10 px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-6">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Create Account</h1>
          <p className="text-slate-400 text-base">Join PhishGuard UK and start detecting phishing threats.</p>
        </div>

        {/* Accepted email info banner */}
        <div className="flex items-start gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3 mb-6">
          <Info size={16} className="text-brand-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Any valid email is accepted —{' '}
            <span className="text-white font-medium">Gmail, Outlook, Yahoo</span>,
            university (e.g. <span className="text-white font-medium">@wlv.ac.uk</span>),
            or a corporate / banking domain.
            No institutional address required.
          </p>
        </div>

        <div className="bg-midnight-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-name"
                  type="text"
                  required
                  placeholder="e.g. Sandun Perera"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="you@gmail.com  or  you@yourbank.co.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white text-base font-mono focus:border-brand-500 focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Live password strength hints */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1 mt-2">
                  {[
                    { ok: hasLength, label: 'At least 8 characters' },
                    { ok: hasUpper,  label: 'One uppercase letter'  },
                    { ok: hasDigit,  label: 'One number'            },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 size={12} className={ok ? 'text-emerald-400' : 'text-slate-600'} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full bg-graphite-900 border rounded-xl py-4 pl-12 pr-12 text-white text-base font-mono focus:outline-none transition-colors ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-white/10 focus:border-brand-500'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center my-1 leading-relaxed">
              By creating an account, you agree to PhishGuard UK's{' '}
              <span className="underline cursor-pointer">Terms of Use</span> and{' '}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>

            <button
              id="register-submit"
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && confirmPassword !== password)}
              className="mt-2 w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-base text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:text-brand-400 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtp && (
        <div className="fixed inset-0 z-50 bg-graphite-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-midnight-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 mb-4">
              <Shield size={24} className="text-brand-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verify Your Email</h3>
            <p className="text-sm text-slate-400 mb-2">A 6-digit code has been sent to:</p>
            <p className="text-white font-semibold mb-4 break-all">{email}</p>
            <p className="text-xs text-slate-500 mb-6">
              Check your inbox and spam folder. The code expires in 10 minutes.
            </p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="0 0 0 0 0 0"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 px-4 text-white text-2xl text-center font-mono font-bold tracking-[0.5em] focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Confirm & Activate Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="text-xs font-medium text-slate-500 hover:text-white transition-colors"
              >
                ← Back to registration form
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
