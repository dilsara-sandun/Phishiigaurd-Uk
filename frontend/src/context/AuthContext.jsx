import React, { createContext, useState, useEffect } from 'react'
import {
  login as apiLogin,
  verifyLoginOtp as apiVerifyLoginOtp,
  verifyLoginTotp as apiVerifyLoginTotp,
  register as apiRegister,
  getMe,
  verifyOtp as apiVerifyOtp,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  setupTotp as apiSetupTotp,
  confirmTotp as apiConfirmTotp,
  disableTotp as apiDisableTotp,
  getTotpStatus as apiGetTotpStatus,
} from '../services/authService'
import toast from 'react-hot-toast'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const userData = await getMe()
          setUser(userData)
          setIsAuthenticated(true)
        } catch (error) {
          localStorage.removeItem('token')
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password)
      if (data.requires_2fa) {
        return {
          requires_2fa: true,
          email: data.email,
          totp_available: data.totp_available ?? false,
        }
      }
      // Fallback if 2FA is ever disabled
      localStorage.setItem('token', data.access_token)
      const userData = await getMe()
      setUser(userData)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed')
      return { success: false }
    }
  }

  // Email OTP verification
  const verifyLogin = async (email, otp) => {
    try {
      const data = await apiVerifyLoginOtp(email, otp)
      localStorage.setItem('token', data.access_token)
      const userData = await getMe()
      setUser(userData)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed')
      return false
    }
  }

  // TOTP verification (Microsoft Authenticator)
  const verifyLoginTotp = async (email, totp_code) => {
    try {
      const data = await apiVerifyLoginTotp(email, totp_code)
      localStorage.setItem('token', data.access_token)
      const userData = await getMe()
      setUser(userData)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid authenticator code')
      return false
    }
  }

  const register = async (email, password, confirmPassword) => {
    try {
      await apiRegister(email, password, confirmPassword)
      return true
    } catch (error) {
      const detail = error.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join('; ')
        : detail || 'Registration failed'
      toast.error(msg)
      return false
    }
  }

  const verifyOtp = async (email, otp) => {
    try {
      await apiVerifyOtp(email, otp)
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'OTP verification failed')
      return false
    }
  }

  const forgotPassword = async (email) => {
    try {
      await apiForgotPassword(email)
      toast.success('Reset link sent to your email')
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset link')
      return false
    }
  }

  const resetPassword = async (token, new_password) => {
    try {
      await apiResetPassword(token, new_password)
      toast.success('Password reset successful')
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reset failed')
      return false
    }
  }

  // ── TOTP / Authenticator ────────────────────────────────────────────────────

  const setupTotp = async () => {
    try {
      return await apiSetupTotp()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate QR code')
      return null
    }
  }

  const confirmTotp = async (totp_code) => {
    try {
      await apiConfirmTotp(totp_code)
      // Refresh user profile to get updated totp_enabled flag
      const userData = await getMe()
      setUser(userData)
      toast.success('Authenticator app enabled successfully!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid code. Please try again.')
      return false
    }
  }

  const disableTotp = async () => {
    try {
      await apiDisableTotp()
      const userData = await getMe()
      setUser(userData)
      toast.success('Authenticator app removed. Email OTP will be used.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disable authenticator')
      return false
    }
  }

  const getTotpStatus = async () => {
    try {
      return await apiGetTotpStatus()
    } catch {
      return { totp_enabled: false }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading,
      login, verifyLogin, verifyLoginTotp,
      register, verifyOtp,
      forgotPassword, resetPassword,
      setupTotp, confirmTotp, disableTotp, getTotpStatus,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
