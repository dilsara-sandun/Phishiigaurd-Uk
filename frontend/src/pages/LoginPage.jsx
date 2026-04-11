import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const { login }               = useAuth()
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-navy-950 bg-mesh items-center justify-center p-6">
      
      <div className="w-full max-w-md glass-card p-8 animate-fade-in relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <Shield size={28} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">PhishGuard UK</h2>
        <p className="text-center text-slate-400 text-sm mb-8">Sign in to your analyst dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="label">Work Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                required
                className="input-field pl-11"
                placeholder="analyst@bank.co.uk"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="password"
                required
                className="input-field pl-11 font-mono tracking-wider"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>Access Dashboard <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Don't have an account? </span>
          <Link to="/register" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
            Request access
          </Link>
        </div>
      </div>
    </div>
  )
}
