import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, Lock, Building, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [org, setOrg]           = useState('')
  const { register }            = useAuth()
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.endsWith('.uk') && !email.endsWith('.com')) {
      toast.error('Must use a valid corporate email address')
      return;
    }

    setLoading(true)
    const success = await register(email, password)
    setLoading(false)
    if (success) {
      toast.success('Registration successful. You can now login.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex bg-navy-950 bg-mesh items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in relative overflow-hidden">
        
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-navy border border-white/[0.08] flex items-center justify-center shadow-card">
            <Shield size={28} className="text-slate-300" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-2 tracking-tight">Node Onboarding</h2>
        <p className="text-center text-slate-400 text-sm mb-8">Register your institution with PhishGuard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Institution Name</label>
            <div className="relative">
              <Building size={18} className="absolute left-4 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                required
                className="input-field pl-11"
                placeholder="e.g. Lloyds Banking Group"
                value={org}
                onChange={e => setOrg(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Corporate Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                required
                className="input-field pl-11"
                placeholder="security@lloyds.co.uk"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Master Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="password"
                required
                minLength={8}
                className="input-field pl-11 font-mono tracking-wider"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-3">
            <button type="submit" disabled={loading} className="btn-secondary w-full justify-center bg-white/[0.04]">
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>Submit Registration <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Already registered? </span>
          <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
