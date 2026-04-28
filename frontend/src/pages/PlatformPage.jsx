import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Layers, Brain, Code, Globe, ArrowRight, Terminal, CheckCircle2 } from 'lucide-react';

export default function PlatformPage() {
  const [activeSection, setActiveSection] = useState('platform');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['platform', 'ai-engine', 'api-docs', 'about-us'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-brand-500/30">
      
      {/* Navbar (Simplified for secondary page) */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-50/90 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Shield size={18} className="text-brand-500" />
            <span className="text-white font-bold tracking-tight">PhishGuard UK</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Access Console</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12 relative">
        
        {/* Left Sticky Navigator */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="sticky top-32">
            <h4 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-6">Documentation</h4>
            <nav className="flex flex-col gap-2">
              {[
                { id: 'platform', label: 'Platform Architecture', icon: Layers },
                { id: 'ai-engine', label: 'AI Engine & XAI', icon: Brain },
                { id: 'api-docs', label: 'API Integration', icon: Code },
                { id: 'about-us', label: 'Trust & Mission', icon: Globe },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                    activeSection === id 
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={16} className={activeSection === id ? 'text-brand-400' : 'text-slate-500'} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 max-w-4xl space-y-32 pb-32">
          
          {/* Platform Section */}
          <section id="platform" className="scroll-mt-32">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-slate-200 mb-6">
              <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">System Overview</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-6">
              A full-stack phishing detection platform built for speed, trust, and scale.
            </h1>
            <p className="text-lg text-slate-500 mb-12 leading-relaxed">
              PhishGuard UK combines frontend intelligence, asynchronous scanning APIs, threat feed synchronization, and analyst-friendly reporting in one secure workflow.
            </p>
            
            {/* Diagram Placeholder */}
            <div className="w-full h-80 bg-white border border-white/5 rounded-2xl mb-12 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               {/* <img src="/platform-stack.png" alt="Architecture Stack" className="absolute inset-0 w-full h-full object-cover opacity-80" /> */}
               <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 to-transparent" />
               <Layers size={64} className="text-brand-500/50 mb-4 relative z-10" />
               <span className="text-slate-500 font-mono text-sm relative z-10">React 18 &middot; FastAPI &middot; PostgreSQL</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "React SPA Dashboard with Tailwind",
                "FastAPI asynchronous backend",
                "PostgreSQL functional indexing",
                "JWT authentication & bcrypt",
                "APScheduler background jobs",
                "DNS & WHOIS enrichment layer"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 border border-white/5 p-4 rounded-xl">
                  <CheckCircle2 size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AI Engine Section */}
          <section id="ai-engine" className="scroll-mt-32">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-slate-200 mb-6">
              <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">Intelligence Core</span>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-6">
              Machine learning that explains every phishing verdict.
            </h2>
            <p className="text-lg text-slate-500 mb-12 leading-relaxed">
              The platform analyzes URL structure, domain behavior, and email language patterns, then translates model reasoning into plain-English insights.
            </p>

            <div className="w-full h-80 bg-white border border-white/5 rounded-2xl mb-12 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               {/* <img src="/ai-pipeline.png" alt="AI Pipeline" className="absolute inset-0 w-full h-full object-cover opacity-80" /> */}
               <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 to-transparent" />
               <Brain size={64} className="text-brand-500/50 mb-4 relative z-10" />
               <span className="text-slate-500 font-mono text-sm relative z-10">Data Extraction &rarr; Inference &rarr; XAI</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "PhiUSIIL training dataset",
                "Lexical & structural extraction",
                "XGBoost fast inference",
                "Logistic Regression + TF-IDF",
                "SHAP explainability engine",
                "Ollama/Gemini narrative summaries"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 border border-white/5 p-4 rounded-xl">
                  <CheckCircle2 size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* API Docs Section */}
          <section id="api-docs" className="scroll-mt-32">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-slate-200 mb-6">
              <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">Integration</span>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-6">
              Developer-first APIs for real-time scanning.
            </h2>
            <p className="text-lg text-slate-500 mb-12 leading-relaxed">
              Integrate phishing checks into browsers, dashboards, mail workflows, and SOC tools through secure, documented endpoints.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-12">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="ml-4 text-xs font-mono text-slate-500">api/v1/scan</span>
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 bg-white/50 p-3 rounded-lg border border-white/5">
                    <span className="text-brand-400 font-mono text-sm font-bold bg-brand-500/10 px-2 py-1 rounded">POST</span>
                    <span className="text-slate-600 font-mono text-sm">/api/url/scan</span>
                    <span className="ml-auto text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Bearer Auth</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white/50 p-3 rounded-lg border border-white/5">
                    <span className="text-brand-400 font-mono text-sm font-bold bg-brand-500/10 px-2 py-1 rounded">POST</span>
                    <span className="text-slate-600 font-mono text-sm">/api/email/analyze</span>
                    <span className="ml-auto text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Bearer Auth</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white/50 p-3 rounded-lg border border-white/5">
                    <span className="text-green-400 font-mono text-sm font-bold bg-green-500/10 px-2 py-1 rounded">GET</span>
                    <span className="text-slate-600 font-mono text-sm">/api/intel/history</span>
                    <span className="ml-auto text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">Bearer Auth</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                "JWT access & refresh flow",
                "Scan URL endpoint",
                "Scan email endpoint",
                "Threat history endpoint",
                "Rate limiting middleware",
                "Swagger/OpenAPI readiness"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 border border-white/5 p-4 rounded-xl">
                  <CheckCircle2 size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* About Us Section */}
          <section id="about-us" className="scroll-mt-32">
            <div className="bg-gradient-to-br from-midnight-900 to-graphite-900 border border-white/5 rounded-3xl p-10 lg:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-slate-200 mb-8 relative z-10">
                <span className="text-brand-400 text-xs font-semibold uppercase tracking-wider">Mission</span>
              </div>
              
              <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-8 relative z-10">
                Built to make phishing defense understandable.
              </h2>
              
              <p className="text-xl text-slate-500 mb-12 leading-relaxed relative z-10 font-medium">
                PhishGuard UK was designed as a practical security platform that combines machine learning accuracy with transparent explanations for real users.
              </p>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 relative z-10">
                {[
                  "UK cybersecurity focus",
                  "Explainable AI methodology",
                  "Safer decision-making",
                  "Analyst clarity",
                  "Academic project credibility"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <span className="text-slate-600 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
