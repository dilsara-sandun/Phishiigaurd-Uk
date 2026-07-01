import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Scan, Mail, Network, ArrowRight, BookOpen, ChevronRight } from 'lucide-react';


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-brand-500/30">
      
      {/* Sticky Top Navbar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-black/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-white font-black tracking-tighter text-xl">PhishGuard UK</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-white font-bold text-sm transition-colors">Home</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-bold text-sm transition-colors">Platform</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-bold text-sm transition-colors">AI Engine</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-bold text-sm transition-colors">API Docs</Link>
            <Link to="/blog" className="text-slate-400 hover:text-white font-bold text-sm transition-colors">Blog</Link>
            <Link to="/test-knowledge" className="text-fuchsia-400 font-black text-sm transition-all border border-fuchsia-500/30 px-4 py-1.5 rounded-full bg-fuchsia-500/10 hover:bg-fuchsia-500/20">Test Knowledge</Link>
          </div>
          
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-bold transition-colors">Sign In</Link>
            <Link to="/register" className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-black shadow-lg hover:scale-105 transition-all">
              Deploy Node
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative overflow-hidden pt-24 pb-40 bg-[#020205]">
        {/* iPhone-style Neon Glowing Blobs */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/4 -left-64 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Floating particles background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Content */}
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
              <span className="text-white text-[10px] font-black tracking-[0.2em] uppercase">Enterprise Intelligence v2.4</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] mb-12 hover:scale-[1.02] transition-transform duration-700 cursor-default group">
              Detect <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-500 to-blue-500 drop-shadow-[0_0_50px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_80px_rgba(168,85,247,0.8)] transition-all">
                phishing
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0 font-medium">
              The ultimate AI-powered threat intelligence platform protecting UK financial institutions from zero-day phishing attacks. Analyze URLs, emails, and domains in milliseconds.
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <Link to="/register" className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Start Analyzing <ArrowRight size={20} />
              </Link>
              <Link to="/platform" className="px-8 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all backdrop-blur-sm">
                View Architecture
              </Link>
            </div>
          </div>

          {/* Right Dashboard Visualization */}
          <div className="relative h-[650px] flex items-center justify-center">
            {/* Glass Dashboard Panel */}
            <div className="relative w-full max-w-[550px] aspect-[4/3] bg-white/[0.02] border border-white/10 rounded-[2.5rem] backdrop-blur-3xl p-10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden group">
              {/* iPhone style reflection/glow */}
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/20 blur-[80px] rounded-full group-hover:translate-x-20 transition-transform duration-1000" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Shield size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Real-time Monitor</div>
                    <div className="text-white font-bold text-base tracking-tight">Security Node #042</div>
                  </div>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                  System Active
                </div>
              </div>

              {/* Data Visualization Grid */}
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-8 hover:bg-white/[0.08] transition-all">
                  <div className="text-[12px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4">Threat Score</div>
                  <div className="text-5xl font-black text-fuchsia-400 tracking-tighter">0.02</div>
                  <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 w-[2%]" />
                  </div>
                </div>
                <div className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-8 hover:bg-white/[0.08] transition-all">
                  <div className="text-[12px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4">Confidence</div>
                  <div className="text-5xl font-black text-white tracking-tighter">99.8%</div>
                  <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[99.8%]" />
                  </div>
                </div>
              </div>

              {/* Live URL Scan Feed */}
              <div className="space-y-5">
                {[
                  { url: "hsbc.co.uk/personal/login", status: "LEGIT", color: "text-emerald-400" },
                  { url: "secure-hsbc-verify.net", status: "PHISHING", color: "text-red-400" },
                  { url: "amazon.co.uk/gp/home", status: "LEGIT", color: "text-emerald-400" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] transition-all cursor-default">
                    <div className="flex items-center gap-5 overflow-hidden">
                      <div className={`w-3.5 h-3.5 rounded-full shadow-[0_0_15px_currentColor] ${item.status === 'LEGIT' ? 'text-emerald-500 bg-emerald-500' : 'text-red-500 bg-red-500'}`} />
                      <div className="text-sm font-mono text-slate-300 truncate tracking-tight">{item.url}</div>
                    </div>
                    <div className={`${item.color} text-[12px] font-black tracking-[0.2em] px-4 py-1.5 rounded-lg bg-white/5`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Stats Cards */}
            <div className="absolute -top-6 -right-12 bg-white/10 border border-white/20 p-6 rounded-[2rem] backdrop-blur-2xl shadow-2xl animate-[float_6s_ease-in-out_infinite]">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Scans</div>
              <div className="text-2xl font-black text-white tracking-tight">2.4M+</div>
            </div>
            
            <div className="absolute -bottom-10 -left-12 bg-white/10 border border-white/20 p-6 rounded-[2rem] backdrop-blur-2xl shadow-2xl animate-[float_7s_ease-in-out_infinite_1s]">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={16} className="text-fuchsia-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blocked</span>
              </div>
              <div className="text-2xl font-black text-red-500 tracking-tight shadow-[0_0_20px_rgba(239,68,68,0.3)]">18.2K</div>
            </div>

            {/* Neon background decorative rings */}
            <div className="absolute w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none -z-10" />
            <div className="absolute w-[500px] h-[500px] border border-white/10 rounded-full pointer-events-none -z-10 animate-pulse" />
          </div>
        </div>
      </main>

      {/* 3 Premium Bento Cards */}
      <section className="py-32 w-full relative z-10 overflow-hidden bg-[#0a0a1a]">
        {/* Neon spheres background */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-pulse-slow"></div>
        <div className="absolute top-40 -left-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-60"></div>
        <div className="absolute -bottom-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-screen filter blur-[90px] opacity-50"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter hover:scale-105 transition-transform duration-500 cursor-default">
              Precision Analysis at Scale
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
              Detect sophisticated phishing attacks across multiple vectors using advanced machine learning models trained on global threat feeds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white/10 border border-white/20 rounded-3xl p-10 backdrop-blur-xl hover:bg-white/15 transition-all group relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-30 transition-opacity">
                <Scan size={140} className="text-blue-400" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 shadow-lg relative z-10">
                <Scan size={32} className="text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Deep URL Scanning</h3>
              <p className="text-slate-300 text-base leading-relaxed relative z-10">Extracts 27 structural and lexical features from target URLs in milliseconds, processed by our proprietary XGBoost classifier.</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/10 border border-white/20 rounded-3xl p-10 backdrop-blur-xl hover:bg-white/15 transition-all group relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-30 transition-opacity">
                <Mail size={140} className="text-fuchsia-400" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 shadow-lg relative z-10">
                <Mail size={32} className="text-fuchsia-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Semantic Email Analysis</h3>
              <p className="text-slate-300 text-base leading-relaxed relative z-10">Evaluates email payload intent using NLP and TF-IDF vectorization to identify urgent language, suspicious links, and spoofing attempts.</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/10 border border-white/20 rounded-3xl p-10 backdrop-blur-xl hover:bg-white/15 transition-all group relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-30 transition-opacity">
                <Network size={140} className="text-pink-400" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-8 shadow-lg relative z-10">
                <Zap size={32} className="text-pink-300" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Explainable AI (XAI)</h3>
              <p className="text-slate-300 text-base leading-relaxed relative z-10">Every detection includes SHAP-value breakdowns, allowing security analysts to see exactly which features triggered the phishing verdict.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Full-Width Section Teasers */}
      <section className="border-t border-white/5 bg-[#05050a] py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Big Feature Block */}
            <div className="lg:col-span-2 bg-gradient-to-br from-orange-600 via-fuchsia-600 to-purple-800 rounded-[2.5rem] p-12 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:scale-[1.03] hover:shadow-[0_40px_100px_rgba(168,85,247,0.2)] transition-all duration-700 cursor-default">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000" />
              <div className="relative z-10">
                <h3 className="text-5xl font-black text-white mb-6 tracking-tighter">PhishGuard Intelligence Hub</h3>
                <p className="text-white/90 text-xl max-w-xl mb-10 font-medium leading-relaxed">
                  Combines XGBoost-powered lexical checking, TF-IDF semantic evaluations, and dynamic DNS heuristics to detect phishing threats across URLs, email payloads, and domains in real-time.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-3 px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-black transition-all w-fit relative z-10">
                Explore Scan Tools <ArrowRight size={20} />
              </Link>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-10 flex-1 hover:bg-white/[0.05] transition-all">
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">API Documentation</h3>
                <p className="text-slate-400 text-base mb-8 font-medium">REST endpoints ready for enterprise integration.</p>
                <Link to="/platform" className="text-sm font-black text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-2">View Docs <ChevronRight size={16} /></Link>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-10 flex-1 hover:bg-white/[0.05] transition-all">
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">About PhishGuard UK</h3>
                <p className="text-slate-400 text-base mb-8 font-medium">Academic rigor meets production-grade software.</p>
                <Link to="/platform" className="text-sm font-black text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-2">Read Mission <ChevronRight size={16} /></Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Test Your Knowledge CTA */}
      <section className="border-t border-white/5 bg-[#020205] py-32 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-fuchsia-500/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden shadow-[0_20px_50px_rgba(249,115,22,0.3)] group hover:scale-[1.02] hover:shadow-[0_40px_100px_rgba(249,115,22,0.2)] transition-all duration-700 cursor-default">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
              <Shield size={280} className="text-white" />
            </div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 mb-8 backdrop-blur-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Interactive Simulation</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[1.1]">
                Can you <br/>spot a fake?
              </h2>
              <p className="text-xl text-white/90 mb-10 leading-relaxed font-medium">
                Cybercriminals are getting smarter. Put your skills to the test with our interactive phishing simulation. We'll show you URLs from major UK Banks, and you have to identify the real ones.
              </p>
              
              <Link to="/test-knowledge" className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-orange-600 font-black text-xl shadow-xl hover:scale-105 transition-all">
                Start Challenge <ArrowRight size={24} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Request a Demo Section */}
      <section className="border-t border-white/5 bg-gradient-to-b from-midnight-900 to-graphite-900 py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
            <Zap size={14} className="text-brand-400" />
            <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">Enterprise Access</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">Ready to secure your institution?</h2>
          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">See how PhishGuard UK can integrate with your existing SOC tools and provide explainable AI threat detection in real-time.</p>
          
          <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Demo request submitted successfully!'); }}>
            <input 
              type="email" 
              required 
              placeholder="Enter your corporate email" 
              className="flex-1 bg-white border border-slate-200 rounded-xl px-6 py-4 text-slate-800 placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
            />
            <button type="submit" className="px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold whitespace-nowrap shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
              Request Demo
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-4">We'll set up a sandbox environment tailored to your architecture.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 text-center text-slate-500 text-sm bg-[#020205]">
        <div className="max-w-7xl mx-auto px-6">
           <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-white font-black tracking-tighter text-lg">PhishGuard UK</span>
           </div>
           <p className="font-medium text-slate-600">&copy; {new Date().getFullYear()} PhishGuard UK. Final Year Project. Designed for Enterprise Security.</p>
        </div>
      </footer>
    </div>
  );
}
