import React, { createContext, useState, useEffect } from 'react'
import { login as apiLogin, register as apiRegister, getMe, verifyOtp as apiVerifyOtp, forgotPassword as apiForgotPassword, resetPassword as apiResetPassword } from '../services/authService'
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
      localStorage.setItem('token', data.access_token)
      // re-fetch user info
      const userData = await getMe()
      setUser(userData)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed')
      return false
    }
  }

  const register = async (email, password) => {
    try {
      await apiRegister(email, password)
      return true
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed')
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

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, register, verifyOtp, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
