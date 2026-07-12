import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Shield, Smartphone, CheckCircle, XCircle, KeyRound,
  RefreshCw, Copy, AlertTriangle, Lock, ChevronRight,
  Eye, EyeOff, Mail, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const STEP_IDLE     = 'idle'
const STEP_SCANNING = 'scanning'
const STEP_CONFIRM  = 'confirm'
const STEP_DONE     = 'done'

// Strip SQL injection characters from any user input before sending
function sanitize(val) {
  return val
    .replace(/['"`;\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\b(OR|AND|DROP|SELECT|INSERT|DELETE|UPDATE|EXEC|UNION)\b/gi, '')
    .trim()
}

// Amber "Are you sure?" confirmation modal
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">This action requires confirmation</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 bg-amber-50/60 border border-amber-100 rounded-xl p-4 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all">Cancel</button>
            <button onClick={onConfirm} id="confirm-change-btn" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm transition-all shadow-md">Yes, Continue</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Email OTP modal (6 digit boxes)
function OTPModal({ email, onVerify, onCancel, loading }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  useEffect(() => { setTimeout(() => refs[0].current?.focus(), 150) }, [])
  const handleChange = (i, val) => {
    const c = val.replace(/\D/g, '').slice(-1)
    const n = [...otp]; n[i] = c; setOtp(n)
    if (c && i < 5) refs[i + 1].current?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const n = [...otp]; n[i - 1] = ''; setOtp(n)
      refs[i - 1].current?.focus()
    }
  }
  const submit = () => { const code = otp.join(''); if (code.length !== 6) return toast.error('Enter the 6-digit code'); onVerify(code) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-purple-500" />
        <div className="p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-3"><Mail size={20} className="text-brand-600" /></div>
            <h3 className="font-black text-slate-800 text-lg">Email Verification</h3>
            <p className="text-xs text-slate-500 mt-1">A 6-digit code was sent to <strong>{email}</strong></p>
          </div>
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((d, i) => (
              <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                className="w-10 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors bg-slate-50 text-slate-800" />
            ))}
          </div>
          <button onClick={submit} disabled={loading} id="otp-verify-btn"
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Verify & Apply Changes'}
          </button>
          <button onClick={onCancel} className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// Password strength bar
function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 12 characters', ok: password.length >= 12 },
    { label: 'Uppercase letter',        ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',        ok: /[a-z]/.test(password) },
    { label: 'Number',                  ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const bar = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-yellow-400' : 'bg-safe-500'
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1">{[1,2,3,4].map(i => <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= score ? bar : 'bg-slate-200'}`} />)}</div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c, i) => (
          <div key={i} className={`text-[10px] flex items-center gap-1 ${c.ok ? 'text-safe-600' : 'text-slate-400'}`}>
            {c.ok ? <CheckCircle size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-300" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AccountSettingsPage() {
  const { user, setupTotp, confirmTotp, disableTotp, logout } = useAuth()

  // TOTP
  const [step, setStep]               = useState(STEP_IDLE)
  const [qrData, setQrData]           = useState(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [confirming, setConfirming]   = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [showSecret, setShowSecret]   = useState(false)
  const [disabling, setDisabling]     = useState(false)
  const confirmRef = useRef(null)
  const totpEnabled = user?.totp_enabled ?? false

  // Email change
  const [newEmail, setNewEmail]             = useState('')
  const [confirmEmail, setConfirmEmail]     = useState('')
  const [emailLoading, setEmailLoading]     = useState(false)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  const [showEmailOTP, setShowEmailOTP]     = useState(false)

  // Password change
  const [currentPwd, setCurrentPwd]         = useState('')
  const [newPwd, setNewPwd]                 = useState('')
  const [confirmPwd, setConfirmPwd]         = useState('')
  const [showCurPwd, setShowCurPwd]         = useState(false)
  const [showNewPwd, setShowNewPwd]         = useState(false)
  const [pwdLoading, setPwdLoading]         = useState(false)
  const [showPwdConfirm, setShowPwdConfirm] = useState(false)

  useEffect(() => { if (step === STEP_CONFIRM) setTimeout(() => confirmRef.current?.focus(), 150) }, [step])

  // TOTP handlers
  const handleStartSetup = async () => { setTotpLoading(true); const data = await setupTotp(); setTotpLoading(false); if (data) { setQrData(data); setStep(STEP_SCANNING) } }
  const handleConfirmTotp = async e => { e.preventDefault(); const code = confirmCode.replace(/\D/g,'').slice(0,6); if (code.length!==6) return toast.error('Enter the 6-digit code'); setConfirming(true); const ok = await confirmTotp(code); setConfirming(false); if (ok) { setStep(STEP_DONE); setConfirmCode(''); setQrData(null) } }
  const handleDisable = async () => { if (!window.confirm('Remove the Authenticator App? You will use email OTP instead.')) return; setDisabling(true); await disableTotp(); setDisabling(false); setStep(STEP_IDLE) }
  const handleCopySecret = () => { if (qrData?.secret) { navigator.clipboard.writeText(qrData.secret); toast.success('Secret key copied') } }

  // Email change
  const emailValidate = email => { const s = sanitize(email); const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!re.test(s)) return 'Enter a valid email address.'; if (s !== email) return 'Email contains invalid characters.'; return null }
  const handleRequestEmailChange = () => {
    const err = emailValidate(newEmail)
    if (err) return toast.error(err)
    if (newEmail !== confirmEmail) return toast.error('Email addresses do not match.')
    if (newEmail.toLowerCase() === user?.email?.toLowerCase()) return toast.error('New email is same as current email.')
    setShowEmailConfirm(true)
  }
  const handleConfirmEmailRequest = async () => {
    setShowEmailConfirm(false); setEmailLoading(true)
    try { await axios.post('/api/auth/profile/request-update', { email: sanitize(newEmail) }, { withCredentials: true }); toast.success('Verification code sent to your current email.'); setShowEmailOTP(true) }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to send verification code.') }
    setEmailLoading(false)
  }
  const handleVerifyEmailOTP = async otp => {
    setEmailLoading(true)
    try { await axios.post('/api/auth/profile/confirm-update', { email: sanitize(newEmail), otp }, { withCredentials: true }); toast.success('Email updated! Logging out...'); setShowEmailOTP(false); setTimeout(() => logout(), 2000) }
    catch (err) { const detail = err.response?.data?.detail || 'Verification failed.'; const locked = err.response?.status === 423; toast.error(locked ? `Account locked: ${detail}` : detail); if (locked) setTimeout(() => logout(), 2500) }
    setEmailLoading(false)
  }

  // Password change
  const handleRequestPasswordChange = () => {
    if (!currentPwd) return toast.error('Enter your current password.')
    if (newPwd.length < 12) return toast.error('Password must be at least 12 characters.')
    if (!/[A-Z]/.test(newPwd)) return toast.error('Password needs an uppercase letter.')
    if (!/[a-z]/.test(newPwd)) return toast.error('Password needs a lowercase letter.')
    if (!/[0-9]/.test(newPwd)) return toast.error('Password needs a number.')
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match.')
    setShowPwdConfirm(true)
  }
  const handleConfirmPasswordChange = async () => {
    setShowPwdConfirm(false); setPwdLoading(true)
    try { await axios.post('/api/auth/change-password', { current_password: sanitize(currentPwd), new_password: sanitize(newPwd) }, { withCredentials: true }); toast.success('Password changed! Logging out...'); setTimeout(() => logout(), 2000) }
    catch (err) { const detail = err.response?.data?.detail || 'Password change failed.'; const locked = err.response?.status === 423; toast.error(locked ? `Account locked: ${detail}` : detail); if (locked) setTimeout(() => logout(), 2500) }
    setPwdLoading(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 pb-16">
      {showEmailConfirm && <ConfirmModal title="Are you sure about this change?" message={`You are changing your email to "${newEmail}". A verification code will be sent to your current email, and you will be logged out after the update.`} onConfirm={handleConfirmEmailRequest} onCancel={() => setShowEmailConfirm(false)} />}
      {showEmailOTP && <OTPModal email={user?.email} loading={emailLoading} onVerify={handleVerifyEmailOTP} onCancel={() => setShowEmailOTP(false)} />}
      {showPwdConfirm && <ConfirmModal title="Are you sure about this change?" message="You are about to change your account password. A confirmation email will be sent and you will be logged out automatically." onConfirm={handleConfirmPasswordChange} onCancel={() => setShowPwdConfirm(false)} />}

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 border border-brand-500/20"><Lock size={20} /></div>
        <div><h1 className="text-2xl font-black tracking-tight text-slate-900">Account Security Settings</h1><p className="text-slate-400 text-xs mt-0.5">Manage your identity credentials, multi-factor settings, and node authorization.</p></div>
      </div>

      {/* Identity Cards */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4"><Shield size={16} className="text-brand-500" /><h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Account Identity</h2></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-brand-500/20 hover:shadow-md transition-all">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Email Address</p>
            <p className="font-mono text-slate-800 text-xs truncate" title={user?.email}>{user?.email || '—'}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-brand-500/20 hover:shadow-md transition-all">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Access Role</p>
            <p className="font-bold text-slate-800 text-sm capitalize">{user?.role || '—'}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-brand-500/20 hover:shadow-md transition-all">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">Account Status</p>
            <p className="text-safe-600 font-bold flex items-center gap-1.5 text-xs">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-safe-500" /></span>
              Verified & Active
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-brand-500/20 hover:shadow-md transition-all">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">2FA Method</p>
            <p className="font-bold flex items-center gap-1.5 text-xs">
              {totpEnabled ? <><span className="w-2 h-2 rounded-full bg-purple-500" />Authenticator</> : <><span className="w-2 h-2 rounded-full bg-brand-500" />Email OTP</>}
            </p>
          </div>
        </div>
      </div>

      {/* Change Email */}
      <div className="glass-card p-5 border-t-4 border-t-brand-500/60">
        <div className="flex items-center gap-2 mb-1"><Mail size={18} className="text-brand-500" /><h2 className="text-base font-black text-slate-800">Change Email Address</h2></div>
        <p className="text-xs text-slate-500 mb-5 ml-6">You will receive a verification code and will be automatically logged out after changing your email.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" id="new-email-input" value={newEmail} onChange={e => setNewEmail(e.target.value.slice(0,320))} placeholder="new@example.com" className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" id="confirm-email-input" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value.slice(0,320))} placeholder="Confirm email" className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:border-brand-500 focus:outline-none transition-colors" />
            </div>
          </div>
        </div>
        <button onClick={handleRequestEmailChange} disabled={emailLoading || !newEmail || !confirmEmail} id="update-email-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50">
          {emailLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Save size={14} />Update Email Address</>}
        </button>
      </div>

      {/* Change Password */}
      <div className="glass-card p-5 border-t-4 border-t-purple-500/60">
        <div className="flex items-center gap-2 mb-1"><KeyRound size={18} className="text-purple-500" /><h2 className="text-base font-black text-slate-800">Change Password</h2></div>
        <p className="text-xs text-slate-500 mb-5 ml-6">A confirmation email is sent after a successful change. You will be logged out automatically.</p>
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type={showCurPwd ? 'text' : 'password'} id="current-password-input" value={currentPwd} onChange={e => setCurrentPwd(e.target.value.slice(0,72))} placeholder="Enter current password" className="w-full pl-9 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-mono focus:border-purple-500 focus:outline-none transition-colors" />
            <button type="button" onClick={() => setShowCurPwd(!showCurPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showCurPwd ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showNewPwd ? 'text' : 'password'} id="new-password-input" value={newPwd} onChange={e => setNewPwd(e.target.value.slice(0,72))} placeholder="Min. 12 characters" className="w-full pl-9 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-mono focus:border-purple-500 focus:outline-none transition-colors" />
              <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showNewPwd ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
            </div>
            {newPwd && <PasswordStrength password={newPwd} />}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showNewPwd ? 'text' : 'password'} id="confirm-password-input" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value.slice(0,72))} placeholder="Repeat new password" className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-mono focus:border-purple-500 focus:outline-none transition-colors" />
            </div>
            {confirmPwd && newPwd !== confirmPwd && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle size={10}/>Passwords do not match</p>}
            {confirmPwd && newPwd === confirmPwd && newPwd && <p className="text-xs text-safe-600 mt-1.5 flex items-center gap-1"><CheckCircle size={10}/>Passwords match</p>}
          </div>
        </div>
        <button onClick={handleRequestPasswordChange} disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd} id="update-password-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-md disabled:opacity-50">
          {pwdLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><KeyRound size={14}/>Update Password</>}
        </button>
      </div>

      {/* TOTP */}
      <div className="glass-card p-5 border-t-4 border-t-purple-500/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2"><Smartphone size={18} className="text-purple-500"/>Authenticator App (2FA)</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl ml-6">Secure your account with time-based tokens from Microsoft Authenticator.</p>
          </div>
          {totpEnabled && step === STEP_IDLE && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-safe-500/10 text-safe-600 rounded-full text-xs font-black border border-safe-500/20 whitespace-nowrap self-start md:self-auto">
              <CheckCircle size={12}/>Enabled & Active
            </span>
          )}
        </div>

        {totpEnabled && step === STEP_IDLE && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-safe-500/5 border border-safe-500/10 rounded-xl">
              <CheckCircle size={18} className="text-safe-500 shrink-0 mt-0.5"/>
              <div><p className="font-bold text-slate-800 text-sm">Authenticator protection active</p><p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Your identity is locked with secondary time-based tokens. Email verification is only an administrative backup.</p></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button onClick={handleStartSetup} disabled={totpLoading} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-semibold transition-all"><RefreshCw size={14}/>Reset Authenticator</button>
              <button onClick={handleDisable} disabled={disabling} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-all"><XCircle size={14}/>{disabling ? 'Deactivating...' : 'Remove Authenticator App'}</button>
            </div>
          </div>
        )}

        {!totpEnabled && step === STEP_IDLE && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
              <div><p className="font-bold text-amber-800 text-sm">Lower protection status</p><p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Your account relies on email-based OTP. Activate the authenticator app for hardware-backed verification tokens.</p></div>
            </div>
            <button onClick={handleStartSetup} disabled={totpLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50">
              {totpLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : <><Smartphone size={15}/>Activate Authenticator App<ChevronRight size={13}/></>}
            </button>
          </div>
        )}

        {step === STEP_SCANNING && qrData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Setup Guide</h3>
                <ol className="text-xs text-slate-600 space-y-3">
                  {['Open Microsoft Authenticator or Google Authenticator.','Add a new account — choose "Work/school" or "Other".','Scan the QR code on this screen.','Confirm the code is registered then click Verify.'].map((t,i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-lg bg-purple-500/10 text-purple-600 text-xs font-bold border border-purple-500/20 flex items-center justify-center mt-0.5">{i+1}</span>
                      <span className="leading-normal">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col items-center justify-center p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <img src={`data:image/png;base64,${qrData.qr_code_base64}`} alt="TOTP QR Code" className="w-36 h-36"/>
                </div>
                <div className="mt-3 w-full">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black text-center mb-1.5">Manual Entry Key</p>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                    <code className="flex-1 text-[10px] font-mono text-slate-600 overflow-hidden text-ellipsis">{showSecret ? qrData.secret : '••••••••••••••••••••••••••••••••'}</code>
                    <button onClick={() => setShowSecret(!showSecret)} className="text-slate-400 hover:text-slate-600">{showSecret ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                    <button onClick={handleCopySecret} className="text-slate-400 hover:text-slate-600"><Copy size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleConfirmTotp} className="flex gap-2 flex-1">
                <input ref={confirmRef} type="text" inputMode="numeric" maxLength={6} value={confirmCode} onChange={e => setConfirmCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit code" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 text-sm focus:border-purple-500 focus:outline-none transition-colors"/>
                <button type="submit" id="confirm-totp-btn" disabled={confirming || confirmCode.length !== 6} className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all disabled:opacity-50">{confirming ? '...' : 'Verify'}</button>
              </form>
              <button onClick={() => setStep(STEP_IDLE)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium transition-all">Cancel</button>
            </div>
          </div>
        )}

        {step === STEP_DONE && (
          <div className="flex items-center gap-3 p-4 bg-safe-500/5 border border-safe-500/10 rounded-xl">
            <CheckCircle size={20} className="text-safe-500"/>
            <p className="text-sm font-bold text-safe-700">Authenticator app successfully activated!</p>
          </div>
        )}
      </div>
    </div>
  )
}
