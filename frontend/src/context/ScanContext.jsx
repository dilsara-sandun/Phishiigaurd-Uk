import React, { createContext, useState } from 'react'
import { scanUrl as apiScanUrl } from '../services/scanService'
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

  return (
    <ScanContext.Provider value={{ scanUrl, loading, error }}>
      {children}
    </ScanContext.Provider>
  )
}
