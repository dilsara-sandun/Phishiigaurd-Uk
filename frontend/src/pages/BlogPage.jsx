import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const videoPosts = [
  {
    title: "What is Phishing? Explained",
    category: "Awareness Training",
    videoId: "GZc-CpV5Z1k",
    description: "A clear explanation of how phishing works and the standard methods attackers use to steal your data."
  },
  {
    title: "How to Spot a Phishing Email",
    category: "Corporate Security",
    videoId: "6EmD3k3Pb8Y", 
    description: "Learn the key red flags and indicators of compromise hidden inside malicious emails."
  },
  {
    title: "Spear Phishing vs Standard Phishing",
    category: "Threat Intel",
    videoId: "XBkzBrXlle0",
    description: "Understand the difference between bulk phishing and highly targeted spear-phishing attacks."
  },
  {
    title: "Business Email Compromise (BEC)",
    category: "Financial Security",
    videoId: "1jfm2E_wvBo",
    description: "Explore how BEC attacks unfold and why they cost organizations billions annually."
  },
  {
    title: "Social Engineering 101",
    category: "Psychology of Cyber",
    videoId: "aLH8wbosbsI",
    description: "Discover the psychological tactics cybercriminals use to manipulate employees."
  },
  {
    title: "Vishing and Smishing Threats",
    category: "Mobile Security",
    videoId: "XByR413U58o",
    description: "Voice and SMS phishing are rising rapidly. Learn how to defend against mobile threats."
  },
  {
    title: "The Anatomy of a Cyber Attack",
    category: "Cyber Forensics",
    videoId: "gqphN4io3VE",
    description: "A step-by-step breakdown of how a single click can compromise an entire network."
  },
  {
    title: "Ransomware Delivery via Phishing",
    category: "Malware Analysis",
    videoId: "X24TYI7pmHE",
    description: "How ransomware payloads are typically delivered through deceptive email attachments."
  },
  {
    title: "Protecting Your Digital Identity",
    category: "Best Practices",
    videoId: "kPaQ48A93FQ",
    description: "Crucial strategies for securing your personal and corporate credentials online."
  },
  {
    title: "The Psychology of a Scam",
    category: "Human Firewall",
    videoId: "FriZ0HOtDJU",
    description: "Why smart people fall for phishing attacks and how to build a cyber-resilient culture."
  }
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-brand-500/30">
      
      {/* Navbar (Light Theme) */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-slate-900 font-extrabold tracking-tight text-xl">PhishGuard UK</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors">Home</Link>
            <Link to="/platform" className="text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors">Platform</Link>
            <Link to="/platform" className="text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors">API Docs</Link>
            <Link to="/blog" className="text-brand-600 font-medium text-sm transition-colors">Blog</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">Sign In</Link>
            <Link to="/register" className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-md transition-all">
              Deploy Node
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        {/* Header matching the image */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-3xl md:text-4xl font-medium text-slate-800 leading-snug">
            Watch our short awareness videos to stay ahead of the latest phishing techniques and cybersecurity threats.
          </h1>
        </div>

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 gap-10">
          {videoPosts.map((post, i) => (
            <div key={i} className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
              {/* 16:9 Video Embed Container */}
              <div className="relative w-full pt-[56.25%] bg-slate-900">
                <iframe 
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${post.videoId}?rel=0`} 
                  title={post.title}
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              
              {/* Video Details */}
              <div className="p-8 flex flex-col flex-1">
                <span className="text-brand-600 text-xs font-bold tracking-widest uppercase mb-3">
                  {post.category}
                </span>
                <h3 className="text-slate-900 text-2xl font-bold leading-tight mb-3">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {post.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="border-t border-slate-200 py-12 text-center text-slate-500 text-sm bg-white">
        <p>&copy; {new Date().getFullYear()} PhishGuard UK. Final Year Project.</p>
      </footer>
    </div>
  );
}
