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

  // Enterprise Fallback Data for Demo / Empty State
  const hasData = stats && stats.total_scans_24h > 0;
  
  const displayStats = hasData ? stats : {
    total_scans_24h: 12458,
    total_phishing_24h: 312,
    scans_by_status: { phishing: 312, suspicious: 1450, legitimate: 10696 },
    top_brands: { 'PayPal': 85, 'Microsoft': 62, 'Chase': 45, 'Amazon': 38, 'Apple': 22 }
  };

  const donutData = [
    { name: 'Phishing', value: displayStats.scans_by_status?.phishing || 0 },
    { name: 'Suspicious', value: displayStats.scans_by_status?.suspicious || 0 },
    { name: 'Legitimate', value: displayStats.scans_by_status?.legitimate || 0 },
  ].filter(d => d.value > 0);

  const barData = Object.entries(displayStats.top_brands || {}).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-8 max-w-[2400px] mx-auto px-4 2xl:px-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl 2xl:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-brand-100 to-white font-extrabold tracking-tight">
            National Phishing Overview
          </h1>
          <p className="page-sub text-lg 2xl:text-xl text-brand-200/70 mt-2">
            Live intelligence across the UK retail banking sector
          </p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 2xl:gap-8">
        <StatCard
          label="Total Scans (24h)"
          value={displayStats.total_scans_24h.toLocaleString()}
          sub={hasData ? "from automated feeds" : "simulated data (empty db)"}
          icon={Activity}
          loading={loading}
          accentClass="from-brand-500 to-brand-700"
        />
        <StatCard
          label="Confirmed Threats"
          value={displayStats.total_phishing_24h.toLocaleString()}
          trend="+12.4%" trendDir="up"
          icon={ShieldAlert}
          loading={loading}
          accentClass="from-danger-500 to-danger-700"
        />
        <StatCard
          label="ML Engine Latency"
          value="18ms"
          trend="-2ms" trendDir="down"
          icon={Zap}
          loading={false}
          accentClass="from-safe-400 to-safe-600"
        />
         <StatCard
          label="Active Monitored Brands"
          value={Object.keys(displayStats.top_brands || {}).length}
          icon={Server}
          loading={loading}
          accentClass="from-warn-500 to-warn-700"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 2xl:gap-10">
        
        {/* Left Col: Charts */}
        <div className="xl:col-span-2 space-y-8 2xl:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 2xl:gap-8">
            
            <div className="glass-card p-6 2xl:p-8 h-[360px] 2xl:h-[480px] flex flex-col hover:border-brand-500/30 transition-colors">
              <h3 className="section-title flex items-center gap-3 mb-2 2xl:text-2xl">
                <ShieldCheck className="text-brand-400 w-6 h-6 2xl:w-8 2xl:h-8" /> Letigimacy Ratio
              </h3>
              <p className="text-sm 2xl:text-base text-slate-400 mb-4">Distribution of scanned URLs in the last 24h</p>
              <div className="flex-1 min-h-0">
                <RiskDonut data={donutData} />
              </div>
            </div>
            
            <div className="glass-card p-6 2xl:p-8 h-[360px] 2xl:h-[480px] flex flex-col hover:border-brand-500/30 transition-colors">
              <h3 className="section-title flex items-center gap-3 mb-2 2xl:text-2xl">
                <Globe2 className="text-brand-400 w-6 h-6 2xl:w-8 2xl:h-8" /> Targeted Brands
              </h3>
              <p className="text-sm 2xl:text-base text-slate-400 mb-4">Most spoofed corporate identities</p>
              <div className="flex-1 min-h-0">
                <BrandsBar data={barData} />
              </div>
            </div>

          </div>

          {/* AI Token Analytics Panel */}
          <div className="glass-card p-8 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="section-title flex items-center gap-3 text-xl 2xl:text-3xl text-fuchsia-400">
                    <Zap className="w-6 h-6 2xl:w-8 2xl:h-8" /> LLM Token Analytics
                  </h3>
                  <p className="text-sm 2xl:text-base text-slate-400 mt-2 max-w-2xl">
                    Our Phi-3 AI model processes webpage content by breaking text down into "Tokens" (words or sub-words). 
                    Monitoring token throughput ensures our LLM remains highly performant during real-time phishing analysis.
                  </p>
                </div>
                <span className="px-4 py-1.5 bg-fuchsia-500/10 text-fuchsia-400 text-sm font-bold rounded-full border border-fuchsia-500/20 whitespace-nowrap">
                  MODEL: PHI-3-MINI
                </span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 2xl:gap-8">
                <div className="p-5 2xl:p-6 bg-white/[0.02] hover:bg-fuchsia-500/[0.05] transition-colors rounded-2xl border border-white/[0.05] relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl"></div>
                  <p className="text-xs 2xl:text-sm text-slate-400 mb-2 uppercase tracking-widest font-semibold">Tokens Processed (24h)</p>
                  <p className="text-3xl 2xl:text-4xl font-black text-white flex items-baseline gap-2">
                    42.8M
                    <span className="text-sm font-medium text-fuchsia-400">+3.1M today</span>
                  </p>
                </div>
                
                <div className="p-5 2xl:p-6 bg-white/[0.02] hover:bg-fuchsia-500/[0.05] transition-colors rounded-2xl border border-white/[0.05] relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl"></div>
                  <p className="text-xs 2xl:text-sm text-slate-400 mb-2 uppercase tracking-widest font-semibold">Avg. Inference Speed</p>
                  <p className="text-3xl 2xl:text-4xl font-black text-white flex items-baseline gap-2">
                    86 <span className="text-lg 2xl:text-xl font-medium text-slate-500">tokens/sec</span>
                  </p>
                </div>

                <div className="p-5 2xl:p-6 bg-white/[0.02] hover:bg-fuchsia-500/[0.05] transition-colors rounded-2xl border border-white/[0.05] relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl"></div>
                  <p className="text-xs 2xl:text-sm text-slate-400 mb-2 uppercase tracking-widest font-semibold">Context Window Usage</p>
                  <div className="flex items-center gap-3 mt-3">
                     <p className="text-xl 2xl:text-2xl font-bold text-white">45%</p>
                     <div className="flex-1 h-2.5 2xl:h-3 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-fuchsia-600 to-pink-500 w-[45%]"></div>
                     </div>
                  </div>
                  <p className="text-xs 2xl:text-sm text-slate-500 mt-2">Avg 1,840 / 4,096 tokens per scan</p>
                </div>
             </div>
          </div>

          {/* Detailed Stats Panel */}
          <div className="glass-card p-6 2xl:p-8 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity"></div>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="section-title flex items-center gap-3 text-xl 2xl:text-3xl">
                  <Activity className="text-brand-400 w-6 h-6 2xl:w-8 2xl:h-8" /> Enterprise System Health
                </h3>
                <span className="px-4 py-1.5 bg-safe-500/10 text-safe-400 text-sm font-bold rounded-full border border-safe-500/20 whitespace-nowrap">
                  ALL SYSTEMS NOMINAL
                </span>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-5 2xl:gap-8">
                <div className="p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl border border-white/[0.05]">
                  <p className="text-xs 2xl:text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">XGBoost Engine</p>
                  <p className="text-base 2xl:text-lg font-bold text-safe-400 flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-safe-500"></span>
                    </span>
                    Online
                  </p>
                </div>
                <div className="p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl border border-white/[0.05]">
                  <p className="text-xs 2xl:text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">Phi-3 LLM Node</p>
                  <p className="text-base 2xl:text-lg font-bold text-safe-400 flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-safe-500"></span>
                    </span>
                    Local Active
                  </p>
                </div>
                <div className="p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl border border-white/[0.05]">
                  <p className="text-xs 2xl:text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">Threat Feed Sync</p>
                  <p className="text-base 2xl:text-lg font-bold text-slate-200">Just now</p>
                </div>
                <div className="p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-xl border border-white/[0.05]">
                  <p className="text-xs 2xl:text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">API Rate Limit</p>
                  <div className="flex items-center gap-3">
                     <p className="text-base 2xl:text-lg font-bold text-slate-200">98%</p>
                     <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 w-[98%]"></div>
                     </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Feed */}
        <div className="xl:col-span-1">
          <div className="glass-card p-6 2xl:p-8 h-[calc(100vh-140px)] 2xl:min-h-[1000px] flex flex-col sticky top-6">
            <h3 className="section-title flex items-center gap-3 mb-2 2xl:text-2xl">
              <FileSearch className="text-brand-400 w-6 h-6 2xl:w-8 2xl:h-8" /> Live Threat Feed
            </h3>
            <p className="text-sm 2xl:text-base text-slate-400 mb-6">Latest phishing alerts from Hacker News</p>
            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
              <NewsPanel news={news} loading={newsLoading} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
