import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, Building, ArrowRight, Eye, EyeOff, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [org, setOrg]           = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const { register, verifyOtp } = useAuth()
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [showOtp, setShowOtp]   = useState(false)
  const [otp, setOtp]           = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await register(email, password)
    setLoading(false)
    if (success) {
      toast.success('Node registration successful! Please verify your email.')
      setShowOtp(true)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit verification code')
      return
    }
    setVerifying(true)
    const success = await verifyOtp(email, otp)
    setVerifying(false)
    if (success) {
      toast.success('Node verified successfully! You can now access the platform.')
      navigate('/login')
    }
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
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Deploy a Node</h1>
          <p className="text-slate-400 text-lg">Register your institution to access PhishGuard UK.</p>
        </div>

        <div className="bg-midnight-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Institution Name</label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lloyds Banking Group"
                  value={org}
                  onChange={e => setOrg(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Corporate Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="security@lloyds.co.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-graphite-900 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-base focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Master Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
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

            <p className="text-[11px] text-slate-500 text-center my-1 leading-relaxed">
              By deploying a node, you agree to PhishGuard UK's institutional terms of use and data processing agreement.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full py-4.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Initialize Node <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-base text-slate-400">
              Already have a node? <Link to="/login" className="text-white font-bold hover:text-brand-400 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtp && (
        <div className="fixed inset-0 z-50 bg-graphite-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-midnight-900 border border-white/10 rounded-2xl p-8 max-w-md w-full relative text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 mb-4">
              <Shield size={24} className="text-brand-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verify Identity</h3>
            <p className="text-sm text-slate-400 mb-8">
              We've sent a 6-digit verification code to <br/><strong className="text-white">{email}</strong>
            </p>
            
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <input
                type="text"
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
                {verifying ? 'Verifying Identity...' : 'Confirm Registration'}
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="text-xs font-medium text-slate-500 hover:text-white transition-colors mt-2"
              >
                Cancel and return to form
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
