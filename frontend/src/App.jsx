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
import LandingPage from './pages/LandingPage'
import PlatformPage from './pages/PlatformPage'
import BlogPage from './pages/BlogPage'
import GamePage from './pages/GamePage'
import PageAnalyzer from './pages/PageAnalyzer'
import AccountSettingsPage from './pages/AccountSettingsPage'
import MLResultsPage from './pages/MLResultsPage'

export default function App() {
  return (
    <AuthProvider>
      <ScanProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/test-knowledge" element={<GamePage />} />
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
            <Route path="dashboard" element={<OverviewDashboard />} />
            <Route path="analysis" element={<AnalysisCentre />} />
            <Route path="analyzer" element={<PageAnalyzer />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
            <Route path="ml-results" element={<MLResultsPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ScanProvider>
    </AuthProvider>
  )
}
