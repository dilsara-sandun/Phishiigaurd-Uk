import React, { useState, useEffect } from 'react';
import { Server, Cpu, Globe, ShieldCheck, Clock, ExternalLink, FileSearch, Trash2, Zap, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { getHistory } from '@/services/scanService';

const getHostname = (urlStr) => {
  if (!urlStr) return 'Unknown Domain';
  try {
    const formatted = urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`;
    return new URL(formatted).hostname;
  } catch {
    return urlStr;
  }
};

export default function PageAnalyzer() {
  const [activeScan, setActiveScan] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Fetch only NEW page scans created AFTER the user clicked Clear
  const fetchPageScan = async () => {
    try {
      const data = await getHistory(10);
      const clearedTimeStr = localStorage.getItem('phishguard_page_analyzer_cleared_time');
      const clearedTime = clearedTimeStr ? parseInt(clearedTimeStr, 10) : 0;

      const pageScans = data
        .filter(s => s.scan_type === 'domain' || s.scan_type === 'url')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Filter out any scans that occurred BEFORE the user clicked Clear
      const freshScans = pageScans.filter(s => new Date(s.created_at).getTime() > clearedTime);

      if (freshScans.length > 0) {
        setActiveScan(freshScans[0]);
      } else {
        setActiveScan(null);
      }
    } catch (err) {
      console.error('Failed to load page scan data', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchPageScan();
    const interval = setInterval(async () => {
      try {
        const data = await getHistory(5);
        const clearedTimeStr = localStorage.getItem('phishguard_page_analyzer_cleared_time');
        const clearedTime = clearedTimeStr ? parseInt(clearedTimeStr, 10) : 0;

        const pageScans = data
          .filter(s => s.scan_type === 'domain' || s.scan_type === 'url')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const freshScans = pageScans.filter(s => new Date(s.created_at).getTime() > clearedTime);

        if (freshScans.length > 0) {
          setActiveScan((prev) => {
            if (!prev || new Date(freshScans[0].created_at) > new Date(prev.created_at)) {
              return freshScans[0];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error polling extension scans', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearAnalysis = () => {
    // Record current timestamp so old database scans won't reappear on reload/navigation
    localStorage.setItem('phishguard_page_analyzer_cleared_time', Date.now().toString());
    setActiveScan(null);
  };

  // Generate AI Recommendations based on safety classification
  const getAIRecommendations = (label) => {
    if (label === 'phishing') {
      return [
        { title: 'Immediate Tab Closure', desc: 'Close this browser tab immediately to prevent credential harvesting or malicious script execution.', icon: ShieldAlert, color: 'text-red-600' },
        { title: 'Zero Data Entry', desc: 'Never enter login credentials, banking PINs, OTP codes, or personal data on this domain.', icon: AlertTriangle, color: 'text-red-600' },
        { title: 'Credential Revocation', desc: 'If credentials were entered, immediately reset your password on the official bank platform.', icon: ShieldCheck, color: 'text-amber-600' },
        { title: 'Report Security Incident', desc: 'Notify your IT Security / SOC team or Bank Fraud Prevention department about this malicious URL.', icon: Lightbulb, color: 'text-blue-600' }
      ];
    } else if (label === 'legitimate') {
      return [
        { title: 'Verified Authentic Domain', desc: 'Domain signature and SSL issuer match verified legitimate infrastructure.', icon: CheckCircle2, color: 'text-emerald-600' },
        { title: 'Address Bar Verification', desc: 'Always check that the exact domain matches your official bookmark before logging in.', icon: Globe, color: 'text-blue-600' },
        { title: 'Enable Multi-Factor Auth', desc: 'Ensure 2FA / Passkeys are enabled on your account for secondary protection.', icon: ShieldCheck, color: 'text-emerald-600' },
        { title: 'Workstation Hygiene', desc: 'Log out explicitly when accessing online banking from shared or public computers.', icon: Lightbulb, color: 'text-slate-600' }
      ];
    } else {
      return [
        { title: 'Proceed With Caution', desc: 'This domain exhibits non-standard structural or hosting characteristics.', icon: AlertTriangle, color: 'text-amber-600' },
        { title: 'Verify Official URL', desc: 'Cross-reference this website link with official directory sources or trusted bookmarks.', icon: Globe, color: 'text-blue-600' },
        { title: 'Refrain from Downloads', desc: 'Do not download executable attachments or consent to suspicious browser extension prompts.', icon: ShieldAlert, color: 'text-amber-600' }
      ];
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 2xl:px-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Zap className="text-brand-600 fill-brand-600/20" size={28} /> Enterprise Page Analyzer
          </h1>
          <p className="text-slate-600 font-medium mt-1 text-sm">
            Real-time technical metadata, AI security reports, and actionable safety recommendations from the PhishGuard Extension.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeScan && (
            <button
              onClick={handleClearAnalysis}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
              title="Clear current site analysis"
            >
              <Trash2 size={14} /> Clear Analysis
            </button>
          )}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Live Extension Sync</span>
          </div>
        </div>
      </div>

      {/* Main Single Real-Time Page Analysis View */}
      {loadingInitial ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-24 text-center shadow-sm">
          <RefreshCw className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Awaiting live page scan from browser extension...</p>
        </div>
      ) : activeScan ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden border-l-4 border-l-brand-600 transition-all">
          <div className="p-6 md:p-8">
            {/* Header / Domain Overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 truncate max-w-xl" title={activeScan.input_value}>
                    {getHostname(activeScan.input_value)}
                  </h2>
                  <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                    activeScan.label === 'phishing' ? 'bg-red-50 text-red-700 border-red-200' :
                    activeScan.label === 'legitimate' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {activeScan.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                  <Clock size={14} className="text-slate-400" /> Analyzed on {new Date(activeScan.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900">{(activeScan.score * 100).toFixed(0)}%</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Threat Score</div>
                </div>
                <button
                  onClick={handleClearAnalysis}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Clear analysis card"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Technical Infrastructure Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Server size={14} className="text-blue-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Infrastructure</span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate" title={activeScan.feature_values?.hosting || 'Unknown'}>
                  {activeScan.feature_values?.hosting || 'Unknown Cloud'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Globe size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Server IP</span>
                </div>
                <div className="text-sm font-mono font-bold text-slate-900 truncate" title={activeScan.feature_values?.ip || '0.0.0.0'}>
                  {activeScan.feature_values?.ip || '0.0.0.0'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">SSL Issuer</span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate" title={activeScan.feature_values?.ssl_issuer || 'None'}>
                  {activeScan.feature_values?.ssl_issuer || 'None'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700 mb-2">
                  <Cpu size={14} className="text-purple-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Primary Tech</span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate" title={Array.isArray(activeScan.feature_values?.tech) && activeScan.feature_values.tech.length > 0 ? activeScan.feature_values.tech[0] : 'Standard Web Application'}>
                  {Array.isArray(activeScan.feature_values?.tech) && activeScan.feature_values.tech.length > 0 
                    ? activeScan.feature_values.tech[0] 
                    : 'Standard Web Application'}
                </div>
              </div>
            </div>

            {/* AI Expert Analysis Report */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 mb-6">
              <div className="flex items-center gap-2 text-slate-900 mb-2.5 font-black text-xs uppercase tracking-wider">
                <FileSearch size={16} className="text-brand-600" /> AI Expert Security Analysis Report
              </div>
              <p className="text-sm leading-relaxed text-slate-700 font-medium">
                "{activeScan.explanation}"
              </p>
            </div>

            {/* AI Powered Recommendations Section */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 mb-6">
              <div className="flex items-center gap-2 text-slate-900 mb-4 font-black text-xs uppercase tracking-wider">
                <Lightbulb size={16} className="text-amber-500" /> AI Safety Recommendations & Action Plan
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAIRecommendations(activeScan.label).map((rec, idx) => {
                  const IconComp = rec.icon;
                  return (
                    <div key={idx} className="p-3.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <IconComp size={16} className={rec.color} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{rec.title}</h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-snug">{rec.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Technology Stack Tags */}
            {Array.isArray(activeScan.feature_values?.tech) && activeScan.feature_values.tech.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Detected Stack:</span>
                {activeScan.feature_values.tech.map((t, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between text-xs">
            <a
              href={activeScan.input_value.startsWith('http') ? activeScan.input_value : `https://${activeScan.input_value}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1.5 transition-colors"
            >
              Visit Scanned Site ({getHostname(activeScan.input_value)}) <ExternalLink size={13} />
            </a>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-slate-500 font-mono font-medium">Scan ID: {activeScan.id}</span>
              <button
                onClick={handleClearAnalysis}
                className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Clear Analysis
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Active Page Scan</h2>
          <p className="text-slate-600 max-w-md mx-auto text-sm">
            Open any webpage with your PhishGuard Browser Extension to view real-time technical page analysis, AI security reports, and safety recommendations here.
          </p>
        </div>
      )}
    </div>
  );
}
