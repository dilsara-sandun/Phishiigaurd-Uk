import { useState, useEffect } from 'react'
import { getNews } from '../services/newsService'

export const useNews = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true)
      const data = await getNews()
      setNews(data)
      setLoading(false)
    }

    fetchNews()
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchNews, 300000)
    return () => clearInterval(intervalId)
  }, [])

  return { news, loading }
}
