import React, { useState, useEffect } from 'react'
import { ShieldAlert, Globe2, Activity, Zap, Server, ShieldCheck, FileSearch } from 'lucide-react'
import StatCard from '../components/StatCard'
import RiskDonut from '../components/RiskDonut'
import BrandsBar from '../components/BrandsBar'
import NewsPanel from '../components/NewsPanel'
import { getStats } from '@/services/statsService'
import { useNews } from '@/hooks/useNews'

export default function OverviewDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { news, loading: newsLoading } = useNews()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to load stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
    // Refresh stats every 60s
    const intId = setInterval(fetchStats, 60000)
    return () => clearInterval(intId)
  }, [])

  const donutData = [
    { name: 'Phishing', value: stats?.scans_by_status?.phishing || 0 },
    { name: 'Suspicious', value: stats?.scans_by_status?.suspicious || 0 },
    { name: 'Legitimate', value: stats?.scans_by_status?.legitimate || 0 },
  ].filter(d => d.value > 0)

  // Map backend brands data to Recharts format
  let barData = []
  if (stats?.top_brands) {
     barData = Object.entries(stats.top_brands).map(([name, count]) => ({ name, count }))
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="page-title">National Phishing Overview</h1>
        <p className="page-sub">Live intelligence across the UK retail banking sector</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Scans (24h)"
          value={stats?.total_scans_24h}
          sub="from automated feeds"
          icon={Activity}
          loading={loading}
          accentClass="from-brand-500 to-brand-700"
        />
        <StatCard
          label="Confirmed Threats"
          value={stats?.total_phishing_24h}
          trend="+12%" trendDir="up"
          icon={ShieldAlert}
          loading={loading}
          accentClass="from-danger-500 to-danger-700"
        />
        <StatCard
          label="ML Engine Latency"
          value="240 ms"
          trend="-15ms" trendDir="down"
          icon={Zap}
          loading={false}
          accentClass="from-safe-400 to-safe-600"
        />
         <StatCard
          label="Active Monitored Brands"
          value={Object.keys(stats?.top_brands || {}).length || '—'}
          icon={Server}
          loading={loading}
          accentClass="from-warn-500 to-warn-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="glass-card p-5 h-[320px] flex flex-col">
              <h3 className="section-title flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-brand-400" /> Letigimacy Ratio
              </h3>
              <p className="text-xs text-slate-500 mb-2">Distribution of scanned URLs in the last 24h</p>
              <div className="flex-1 min-h-0">
                <RiskDonut data={donutData} />
              </div>
            </div>
            
            <div className="glass-card p-5 h-[320px] flex flex-col">
              <h3 className="section-title flex items-center gap-2 mb-1">
                <Globe2 size={16} className="text-brand-400" /> Targeted Brands
              </h3>
              <p className="text-xs text-slate-500 mb-2">Most spoofed corporate identities</p>
              <div className="flex-1 min-h-0">
                <BrandsBar data={barData} />
              </div>
            </div>

          </div>

          {/* Detailed Stats Panel */}
          <div className="glass-card p-5">
             <div className="flex items-center justify-between mb-4">
                <h3 className="section-title flex items-center gap-2">
                  <Activity size={16} className="text-brand-400" /> System Health
                </h3>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                  <p className="text-xs text-slate-500 mb-1">XGBoost Status</p>
                  <p className="text-sm font-semibold text-safe-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-safe-500 animate-pulse"></span> Online</p>
                </div>
                <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                  <p className="text-xs text-slate-500 mb-1">Phi-3 LLM Node</p>
                  <p className="text-sm font-semibold text-safe-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-safe-500 animate-pulse"></span> Local Active</p>
                </div>
                <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                  <p className="text-xs text-slate-500 mb-1">Threat Feed Sync</p>
                  <p className="text-sm font-semibold text-slate-200">12 mins ago</p>
                </div>
                <div className="p-3 bg-white/[0.04] rounded-xl border border-white/[0.05]">
                  <p className="text-xs text-slate-500 mb-1">API Rate Limit</p>
                  <p className="text-sm font-semibold text-slate-200">92% Remaining</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Feed */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 h-full flex flex-col">
            <h3 className="section-title flex items-center gap-2 mb-1">
              <FileSearch size={16} className="text-brand-400" /> Live Threat Feed
            </h3>
            <p className="text-xs text-slate-500 mb-4">Latest phishing alerts from Hacker News</p>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <NewsPanel news={news} loading={newsLoading} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
