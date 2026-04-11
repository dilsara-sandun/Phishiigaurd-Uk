import api from './api'

export const login = async (email, password) => {
  const payload = { email, password }
  const response = await api.post('/auth/login', payload)
  return response.data
}

export const register = async (email, password) => {
  const payload = { email, password }
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
