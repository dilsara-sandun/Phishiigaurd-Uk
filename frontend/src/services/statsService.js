import api from './api'

export const getStats = async () => {
  const response = await api.get('/scan/stats')
  return response.data
}
