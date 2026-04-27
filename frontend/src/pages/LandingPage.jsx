import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Scan, Mail, Network, ArrowRight, BookOpen, ChevronRight } from 'lucide-react';


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-graphite-900 text-slate-300 font-sans selection:bg-brand-500/30">
      
      {/* Sticky Top Navbar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-graphite-900/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-white font-extrabold tracking-tight text-xl">PhishGuard UK</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-white font-medium text-sm transition-colors">Home</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">Platform</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">AI Engine</Link>
            <Link to="/platform" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">API Docs</Link>
            <Link to="/blog" className="text-slate-400 hover:text-white font-medium text-sm transition-colors">Blog</Link>
            <Link to="/test-knowledge" className="text-brand-400 font-bold text-sm transition-colors border border-brand-500/30 px-3 py-1 rounded-full bg-brand-500/10 hover:bg-brand-500/20">Test Knowledge</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Sign In</Link>
            <Link to="/register" className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all">
              Deploy Node
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative overflow-hidden pt-24 pb-32">
        {/* Animated background glow & particles */}
        <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute top-1/4 -right-64 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        {/* Floating particles background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 bg-brand-400/30 rounded-full animate-pulse" style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-brand-300 text-xs font-semibold tracking-wider uppercase">Enterprise Intelligence v2.4</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-8">
              Detect phishing <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-600 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                before users click.
              </span>
            </h1>
            
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-xl">
              The ultimate AI-powered threat intelligence platform protecting UK financial institutions from zero-day phishing attacks. Analyze URLs, emails, and domains in milliseconds.
            </p>
            
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/register" className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-graphite-900 font-bold hover:bg-slate-100 transition-colors">
                Start Analyzing <ArrowRight size={18} />
              </Link>
              <Link to="/platform" className="px-6 py-3.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors">
                View Architecture
              </Link>
            </div>
          </div>

          {/* Right 3D Object Showcase */}
          <div className="relative h-[600px] flex items-center justify-center">
            {/* Fallback rendering if 3D image isn't available */}
            <div className="absolute w-[400px] h-[400px] border border-white/5 bg-midnight-900/50 rounded-full backdrop-blur-3xl flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.15)]">
               <Shield size={120} className="text-brand-500 opacity-80" style={{ filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.6))' }} />
               {/* Orbital rings */}
               <div className="absolute inset-0 border border-brand-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
               <div className="absolute inset-4 border border-brand-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>
          </div>
        </div>
      </main>

      {/* 3 Premium Bento Cards */}
      <section className="py-24 max-w-7xl mx-auto px-6 border-t border-white/5 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">Precision Analysis at Scale</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Detect sophisticated phishing attacks across multiple vectors using advanced machine learning models trained on global threat feeds.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/[0.04] transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Scan size={120} className="text-brand-500" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-midnight-800 border border-white/10 flex items-center justify-center mb-6 shadow-lg relative z-10">
              <Scan size={24} className="text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Deep URL Scanning</h3>
            <p className="text-slate-400 text-sm leading-relaxed relative z-10">Extracts 27 structural and lexical features from target URLs in milliseconds, processed by our proprietary XGBoost classifier.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/[0.04] transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Mail size={120} className="text-brand-500" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-midnight-800 border border-white/10 flex items-center justify-center mb-6 shadow-lg relative z-10">
              <Mail size={24} className="text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Semantic Email Analysis</h3>
            <p className="text-slate-400 text-sm leading-relaxed relative z-10">Evaluates email payload intent using NLP and TF-IDF vectorization to identify urgent language, suspicious links, and spoofing attempts.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-gradient-to-br from-brand-900/40 to-midnight-900 border border-brand-500/20 rounded-3xl p-8 backdrop-blur-xl group relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)]">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Network size={120} className="text-brand-500" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-6 shadow-lg relative z-10">
              <Zap size={24} className="text-brand-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Explainable AI (XAI)</h3>
            <p className="text-slate-300 text-sm leading-relaxed relative z-10">Every detection includes SHAP-value breakdowns, allowing security analysts to see exactly which features triggered the phishing verdict.</p>
          </div>
        </div>
      </section>

      {/* Asymmetric Full-Width Section Teasers */}
      <section className="border-t border-white/5 bg-midnight-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Big Feature Block */}
            <div className="lg:col-span-2 bg-graphite-900 border border-white/5 rounded-3xl p-10 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Platform Architecture</h3>
                <p className="text-slate-400 max-w-lg mb-8">Built on React 18 and FastAPI, heavily optimized with asynchronous processing and PostgreSQL functional indexing to support massive ingestion loads without breaking a sweat.</p>
              </div>
              <Link to="/platform" className="inline-flex items-center gap-2 text-brand-400 font-semibold hover:text-brand-300 transition-colors w-fit">
                Explore the Tech Stack <ArrowRight size={16} />
              </Link>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="bg-graphite-900 border border-white/5 rounded-3xl p-8 flex-1">
                <h3 className="text-lg font-bold text-white mb-2">API Documentation</h3>
                <p className="text-slate-400 text-sm mb-6">REST endpoints ready for enterprise integration.</p>
                <Link to="/platform" className="text-sm font-semibold text-white hover:text-brand-400 transition-colors">View Docs &rarr;</Link>
              </div>
              <div className="bg-graphite-900 border border-white/5 rounded-3xl p-8 flex-1">
                <h3 className="text-lg font-bold text-white mb-2">About PhishGuard UK</h3>
                <p className="text-slate-400 text-sm mb-6">Academic rigor meets production-grade software.</p>
                <Link to="/platform" className="text-sm font-semibold text-white hover:text-brand-400 transition-colors">Read Mission &rarr;</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Test Your Knowledge CTA */}
      <section className="border-t border-white/5 bg-graphite-900 py-24 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-midnight-900 border border-emerald-500/20 rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield size={200} />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Interactive Simulation</span>
              </div>
              
              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6">Can you spot a fake?</h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Cybercriminals are getting smarter. Put your skills to the test with our interactive phishing simulation. We'll show you URLs from major UK Banks, and you have to identify the real ones.
              </p>
              
              <Link to="/test-knowledge" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all">
                Start Challenge <ArrowRight size={20} />
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
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">See how PhishGuard UK can integrate with your existing SOC tools and provide explainable AI threat detection in real-time.</p>
          
          <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto" onSubmit={(e) => { e.preventDefault(); alert('Demo request submitted successfully!'); }}>
            <input 
              type="email" 
              required 
              placeholder="Enter your corporate email" 
              className="flex-1 bg-graphite-800 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
            />
            <button type="submit" className="px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold whitespace-nowrap shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all">
              Request Demo
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-4">We'll set up a sandbox environment tailored to your architecture.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm bg-graphite-900">
        <p>&copy; {new Date().getFullYear()} PhishGuard UK. Final Year Project.</p>
      </footer>
    </div>
  );
}
