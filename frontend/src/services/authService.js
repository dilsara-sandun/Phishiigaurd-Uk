import api from './api'

export const login = async (email, password) => {
  const payload = { email, password }
  const response = await api.post('/auth/login', payload)
  return response.data
}

export const verifyLoginOtp = async (email, otp) => {
  const response = await api.post('/auth/verify-login', { email, otp })
  return response.data
}

export const verifyLoginTotp = async (email, totp_code) => {
  const response = await api.post('/auth/verify-login-totp', { email, totp_code })
  return response.data
}

export const register = async (email, password, confirmPassword) => {
  const payload = {
    email,
    password,
    confirm_password: confirmPassword ?? password,
  }
  const response = await api.post('/auth/register', payload)
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const verifyOtp = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp })
  return response.data
}

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email })
  return response.data
}

export const resetPassword = async (token, new_password) => {
  const response = await api.post('/auth/reset-password', { token, new_password })
  return response.data
}

// ── TOTP / Authenticator App ──────────────────────────────────────────────────

export const setupTotp = async () => {
  const response = await api.post('/auth/totp/setup')
  return response.data   // { provisioning_uri, qr_code_base64, secret }
}

export const confirmTotp = async (totp_code) => {
  const response = await api.post('/auth/totp/confirm', { totp_code })
  return response.data
}

export const disableTotp = async () => {
  const response = await api.delete('/auth/totp/disable')
  return response.data
}

export const getTotpStatus = async () => {
  const response = await api.get('/auth/totp/status')
  return response.data   // { totp_enabled: bool }
}
