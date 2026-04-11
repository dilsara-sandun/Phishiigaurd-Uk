import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ScanProvider } from './context/ScanContext'

import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OverviewDashboard from './pages/OverviewDashboard'
import AnalysisCentre from './pages/AnalysisCentre'
import HistoryPage from './pages/HistoryPage'
import SupportPage from './pages/SupportPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function App() {
  return (
    <AuthProvider>
      <ScanProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<OverviewDashboard />} />
            <Route path="analysis" element={<AnalysisCentre />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ScanProvider>
    </AuthProvider>
  )
}
