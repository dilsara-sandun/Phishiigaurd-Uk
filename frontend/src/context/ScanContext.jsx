import React, { createContext, useState } from 'react'
import { scanUrl as apiScanUrl, scanDomain as apiScanDomain, scanEmail as apiScanEmail, scanEmailFile as apiScanEmailFile } from '../services/scanService'
import toast from 'react-hot-toast'

export const ScanContext = createContext(null)

export const ScanProvider = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const scanUrl = async (url) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiScanUrl(url)
      setLoading(false)
      return result
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || 'Failed to scan URL'
      setError(msg)
      toast.error(msg)
      throw err
    }
  }

  const scanDomain = async (domain) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiScanDomain(domain)
      setLoading(false)
      return result
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || 'Failed to scan Domain'
      setError(msg)
      toast.error(msg)
      throw err
    }
  }

  const scanEmail = async (text) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiScanEmail(text)
      setLoading(false)
      return result
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || 'Failed to scan Email'
      setError(msg)
      toast.error(msg)
      throw err
    }
  }

  const scanEmailFile = async (file) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiScanEmailFile(file)
      setLoading(false)
      return result
    } catch (err) {
      setLoading(false)
      const msg = err.response?.data?.detail || 'Failed to process email file'
      setError(msg)
      toast.error(msg)
      throw err
    }
  }

  return (
    <ScanContext.Provider value={{ scanUrl, scanDomain, scanEmail, scanEmailFile, loading, error }}>
      {children}
    </ScanContext.Provider>
  )
}
