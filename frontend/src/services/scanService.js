import api from './api'

export const scanUrl = async (url) => {
  const response = await api.post('/scan/url', { url })
  return response.data
}

export const getHistory = async (limit = 50) => {
  const response = await api.get('/scan/history', { params: { limit } })
  return response.data
}

export const scanDomain = async (domain) => {
  const response = await api.post('/scan/domain', { domain })
  return response.data
}

export const scanEmail = async (text) => {
  const response = await api.post('/scan/email', { text })
  return response.data
}

export const scanEmailFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/scan/email/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
