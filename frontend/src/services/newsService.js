import axios from 'axios'

// We bypass our base API here because we're calling Hacker News directly
export const getNews = async () => {
  try {
    const response = await axios.get('https://hn.algolia.com/api/v1/search?query=phishing+OR+malware+OR+ransomware&tags=story&hitsPerPage=10')
    
    // Map HN format to our expected format
    return response.data.hits.map((hit) => ({
      id: hit.objectID,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      domain: hit.url ? new URL(hit.url).hostname.replace('www.', '') : 'news.ycombinator.com',
      time_ago: Math.floor((Date.now() - new Date(hit.created_at).getTime()) / 3600000) + 'h ago'
    }))
  } catch (error) {
    console.error("Failed to fetch news", error)
    return []
  }
}
