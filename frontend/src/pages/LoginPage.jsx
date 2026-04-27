import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, X } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-graphite-900 text-slate-300 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Back to Home Link */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors">
        <ArrowRight size={16} className="rotate-180" /> Back to Platform
      </Link>

      <div className="w-full max-w-md relative z-10 px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-6">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Sign In</h1>
          <p className="text-slate-400 text-lg">Enter your credentials to access PhishGuard UK.</p>
        </div>

        <div className="bg-midnight-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider">Password</label>
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
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white text-base font-mono focus:border-brand-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
            <p className="text-base text-slate-400">
              Not registered? <Link to="/register" className="text-white font-bold hover:text-brand-400 transition-colors">Create Account</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-graphite-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-midnight-900 border border-white/10 rounded-2xl p-8 max-w-md w-full relative">
            <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Recover Password</h3>
            <p className="text-sm text-slate-400 mb-6">Enter your email address to receive recovery instructions.</p>
            
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-brand-500 focus:outline-none"
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
    </div>
  )
}
