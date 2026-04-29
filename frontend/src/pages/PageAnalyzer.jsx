import React, { useState, useEffect } from 'react';
import { Layout, Search, Server, Cpu, Globe, AlertTriangle, ShieldCheck, Clock, ExternalLink } from 'lucide-react';
import { getHistory } from '@/services/scanService';

export default function PageAnalyzer() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPageScans = async () => {
    try {
      const data = await getHistory();
      // Filter for scans coming from the extension (we set scan_type='domain' for these)
      const pageScans = data.filter(s => s.scan_type === 'domain').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setScans(pageScans);
    } catch (err) {
      console.error('Failed to load page scans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageScans();
    const interval = setInterval(fetchPageScans, 10000); // Poll every 10s for "real-time" feel
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-[2000px] mx-auto px-4 2xl:px-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl font-black text-black">
            Enterprise Page Analyzer
          </h1>
          <p className="text-slate-800 font-medium mt-2">
            Real-time technical metadata and AI security reports from the PhishGuard Browser Extension.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
          <span className="text-sm font-bold text-brand-400 uppercase tracking-widest">Live Monitoring Active</span>
        </div>
      </div>

      {loading && scans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse">Awaiting data from extension...</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="glass-card p-20 text-center">
          <Globe className="w-16 h-16 text-slate-700 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-300 mb-2">No Active Page Scans</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Use the PhishGuard Extension on any website to see the technical deep-dive and AI reports here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {scans.map((scan) => (
            <div key={scan.id} className="glass-card overflow-hidden group hover:border-brand-500/30 transition-all border-l-4 border-l-brand-500">
              <div className="p-6 2xl:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                       <h3 className="text-xl font-bold text-white truncate max-w-md">{new URL(scan.input_value).hostname}</h3>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                         scan.label === 'phishing' ? 'bg-danger-500/20 text-danger-400 border border-danger-500/30' :
                         scan.label === 'legitimate' ? 'bg-safe-500/20 text-safe-400 border border-safe-500/30' :
                         'bg-warn-500/20 text-warn-400 border border-warn-500/30'
                       }`}>
                         {scan.label}
                       </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                      <Clock size={12} /> {new Date(scan.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-brand-400">{(scan.score * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Threat Score</div>
                  </div>
                </div>

                {/* Technical Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-brand-400 mb-2">
                      <Server size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Infrastructure</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 truncate">{scan.feature_values?.hosting || 'Unknown'}</div>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                      <Globe size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Server IP</span>
                    </div>
                    <div className="text-sm font-mono font-medium text-slate-200">{scan.feature_values?.ip || '0.0.0.0'}</div>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-safe-400 mb-2">
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">SSL Issuer</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 truncate">{scan.feature_values?.ssl_issuer || 'None'}</div>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Cpu size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Primary Tech</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 truncate">
                      {Array.isArray(scan.feature_values?.tech) && scan.feature_values.tech.length > 0 
                        ? scan.feature_values.tech[0] 
                        : 'Standard'}
                    </div>
                  </div>
                </div>

                {/* Expert Report */}
                <div className="p-5 bg-brand-500/5 rounded-2xl border border-brand-500/10 mb-6">
                  <div className="flex items-center gap-2 text-brand-400 mb-3 font-bold text-xs uppercase tracking-widest">
                    <FileSearch size={14} /> Expert Analysis Report
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300 italic">
                    "{scan.explanation}"
                  </p>
                </div>

                {/* Tech Badges */}
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(scan.feature_values?.tech) && scan.feature_values.tech.map((t, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded border border-white/5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-900/50 border-t border-white/5 flex items-center justify-between">
                <a href={scan.input_value} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-brand-400 flex items-center gap-2 uppercase font-bold">
                  Visit Scanned Page <ExternalLink size={10} />
                </a>
                <span className="text-[10px] text-slate-600 font-mono">ID: {scan.id.slice(0,8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
