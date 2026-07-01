import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Shield, Smartphone, CheckCircle, XCircle, KeyRound,
  RefreshCw, Copy, AlertTriangle, Lock, ChevronRight, Eye, EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Step constants ─────────────────────────────────────────────────────────────
const STEP_IDLE     = 'idle'
const STEP_SCANNING = 'scanning'  // QR shown, waiting for user to scan
const STEP_CONFIRM  = 'confirm'   // user enters first code to activate
const STEP_DONE     = 'done'

export default function AccountSettingsPage() {
  const { user, setupTotp, confirmTotp, disableTotp } = useAuth()

  // TOTP setup state
  const [step, setStep] = useState(STEP_IDLE)
  const [qrData, setQrData]     = useState(null)   // { qr_code_base64, secret, provisioning_uri }
  const [confirmCode, setConfirmCode] = useState('')
  const [confirming, setConfirming]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [showSecret, setShowSecret]   = useState(false)
  const [disabling, setDisabling]     = useState(false)
  const confirmRef = useRef(null)

  // Determine initial TOTP status from user object
  const totpEnabled = user?.totp_enabled ?? false

  // Auto-focus confirm input when entering confirm step
  useEffect(() => {
    if (step === STEP_CONFIRM) {
      setTimeout(() => confirmRef.current?.focus(), 150)
    }
  }, [step])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStartSetup = async () => {
    setLoading(true)
    const data = await setupTotp()
    setLoading(false)
    if (data) {
      setQrData(data)
      setStep(STEP_SCANNING)
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    const code = confirmCode.replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) return toast.error('Enter the 6-digit code from your authenticator app')
    setConfirming(true)
    const ok = await confirmTotp(code)
    setConfirming(false)
    if (ok) {
      setStep(STEP_DONE)
      setConfirmCode('')
      setQrData(null)
    }
  }

  const handleDisable = async () => {
    if (!window.confirm('Are you sure you want to remove the Authenticator App? You will use email OTP for future logins.')) return
    setDisabling(true)
    await disableTotp()
    setDisabling(false)
    setStep(STEP_IDLE)
  }

  const handleCopySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret)
      toast.success('Secret key copied to clipboard')
    }
  }

  const handleCodeInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setConfirmCode(val)
    if (val.length === 6) {
      setTimeout(() => document.getElementById('confirm-totp-btn')?.click(), 100)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 pb-16">

      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 border border-brand-500/20">
          <Lock size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black">Account Security Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your identity credentials, multi-factor settings, and node authorization.</p>
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="glass-card p-8">
        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2.5">
          <Shield size={20} className="text-brand-500" /> Account Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-brand-500/20 hover:shadow-md transition-all duration-300">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Email Address</p>
            <p className="text-black font-bold truncate" title={user?.email}>{user?.email || '—'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-brand-500/20 hover:shadow-md transition-all duration-300">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Access Role</p>
            <p className="text-black font-bold capitalize">{user?.role || '—'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-brand-500/20 hover:shadow-md transition-all duration-300">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Account Status</p>
            <p className="text-safe-600 font-bold flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-safe-500"></span>
              </span>
              Verified &amp; Active
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-brand-500/20 hover:shadow-md transition-all duration-300">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">2FA Status</p>
            <p className="text-black font-bold flex items-center gap-1.5">
              {totpEnabled ? (
                <><span className="w-2 h-2 rounded-full bg-purple-500"></span> Authenticator</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-brand-500"></span> Email OTP</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── TOTP Panel ──────────────────────────────────────────────────────────── */}
      <div className="glass-card p-8 border-t-4 border-t-purple-500/80 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
              <Smartphone size={22} className="text-purple-500" /> Authenticator App (2FA)
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Secure your account by generating multi-factor tokens locally on your phone.
              We recommend using Microsoft Authenticator.
            </p>
          </div>

          {totpEnabled && step === STEP_IDLE && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-safe-500/10 text-safe-600 rounded-full text-xs font-black border border-safe-500/20 whitespace-nowrap self-start md:self-auto">
              <CheckCircle size={12} /> Enabled &amp; Active
            </span>
          )}
        </div>

        {/* ── State: TOTP already enabled, idle ──────────────────────────────── */}
        {totpEnabled && step === STEP_IDLE && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-5 bg-safe-500/5 border border-safe-500/10 rounded-2xl">
              <CheckCircle size={22} className="text-safe-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 text-sm">Authenticator protection active</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your identity is locked with secondary time-based tokens. When logging in, you will be prompted for your authenticator app code. Email verification is only available as an administrative backup.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleStartSetup}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-semibold transition-all duration-150"
              >
                <RefreshCw size={15} /> Reset Authenticator Configuration
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-all duration-150"
              >
                <XCircle size={15} /> {disabling ? 'Deactivating...' : 'Remove Authenticator App'}
              </button>
            </div>
          </div>
        )}

        {/* ── State: TOTP disabled, offer setup ──────────────────────────────── */}
        {!totpEnabled && step === STEP_IDLE && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 text-sm">Lower protection status</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your account is protected by email-based verification, which is susceptible to mail delays and email interception attacks. Activate your authenticator app for instantaneous local verification tokens.
                </p>
              </div>
            </div>

            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <><Smartphone size={16} /> Activate Authenticator App<ChevronRight size={14} /></>
              )}
            </button>
          </div>
        )}

        {/* ── State: QR code shown ────────────────────────────────────────────── */}
        {step === STEP_SCANNING && qrData && (
          <div className="space-y-8">
            {/* Steps Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Setup Guide</h3>
                <ol className="text-sm text-slate-600 space-y-4">
                  {[
                    'Open Microsoft Authenticator or Google Authenticator on your mobile device.',
                    'Add a new account and choose "Work or school account" or "Other account".',
                    'Scan the visual QR code pattern displayed on this screen.',
                    'Verify the key has been registered, then click "I\'ve scanned it" to confirm.',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 text-xs font-bold border border-purple-500/20 flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-normal">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src={`data:image/png;base64,${qrData.qr_code_base64}`}
                    alt="TOTP QR Code — scan with Microsoft Authenticator"
                    className="w-44 h-44"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-4 max-w-xs">
                  Having trouble scanning? Type the secret key manually into your app instead.
                </p>
              </div>
            </div>

            {/* Manual Secret Key */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 text-center">Manual Entry Key</p>
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-white/5 rounded-xl">
                <KeyRound size={16} className="text-slate-500 shrink-0" />
                <span className={`flex-1 font-mono text-sm tracking-widest text-cyan-400 text-center select-all ${showSecret ? '' : 'blur-sm select-none'}`}>
                  {qrData.secret}
                </span>
                <button onClick={() => setShowSecret(s => !s)} className="text-slate-500 hover:text-slate-300">
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={handleCopySecret} className="text-slate-500 hover:text-cyan-400 transition-colors">
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                🔒 Security notice: Store this key securely. Never expose it online.
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={() => setStep(STEP_CONFIRM)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              >
                I've Scanned the QR Code →
              </button>
              <button
                onClick={() => { setStep(STEP_IDLE); setQrData(null) }}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        )}

        {/* ── State: Confirm first code ────────────────────────────────────────── */}
        {step === STEP_CONFIRM && (
          <div className="space-y-6 max-w-md mx-auto py-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 mx-auto mb-3">
                <Shield size={24} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Verify App Sync</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Enter the 6-digit verification token currently active in your authenticator app.
              </p>
            </div>

            <form onSubmit={handleConfirm} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  ref={confirmRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={confirmCode}
                  onChange={handleCodeInput}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-purple-500 text-black text-3xl font-mono tracking-[0.4em] text-center py-4 rounded-2xl outline-none transition-colors"
                />
              </div>

              <button
                id="confirm-totp-btn"
                type="submit"
                disabled={confirming || confirmCode.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle size={16} /> Confirm &amp; Save Setup</>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(STEP_SCANNING)}
                className="text-xs text-slate-500 hover:text-slate-800 text-center mt-2 transition-colors"
              >
                ← View QR code again
              </button>
            </form>
          </div>
        )}

        {/* ── State: Done (just enabled) ──────────────────────────────────────── */}
        {step === STEP_DONE && (
          <div className="flex flex-col items-center gap-5 py-6 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-safe-500/10 border border-safe-500/20 flex items-center justify-center text-safe-500">
              <CheckCircle size={36} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-850 text-xl">Verification App Synchronized!</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Your Microsoft Authenticator configurations are locked in. Future log-in attempts will require a token from your mobile device.
              </p>
            </div>
            <button
              onClick={() => setStep(STEP_IDLE)}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-bold border border-purple-200/50 hover:bg-purple-50 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw size={13} /> Back to Security Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Security recommendations card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
          <Shield size={20} className="text-brand-400" /> Key Security Guidelines
        </h3>
        <ul className="space-y-3.5 text-sm text-slate-400">
          {[
            'Prioritize using mobile authenticator tokens over SMS or email verification codes.',
            'Never share your manual authenticator setup secret with any representative or system.',
            'Store a record of your TOTP secret inside a securely locked credentials vault or physical record.',
            'Maintain active contact info for rapid institutional recovery in the event of hardware loss.',
            'Deploy distinct passphrases across active node endpoints to prevent credentials stuffing.',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-brand-400 shrink-0 font-bold text-base mt-0.5">✓</span>
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
