import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

const QUESTION_BANK = [
  {
    bank: "Amazon",
    options: [
      { url: "amazon-security-alert.com", isLegit: false },
      { url: "login-amazon-verify.net", isLegit: false },
      { url: "amazon.co.uk", isLegit: true },
      { url: "amzon-support.co.uk", isLegit: false },
      { url: "amazon.service-help.com", isLegit: false }
    ],
    hint: "Official Amazon UK uses the standard .co.uk domain without hyphens."
  },
  {
    bank: "Netflix (Password Reset)",
    options: [
      { url: "netflix-payment-update.com", isLegit: false },
      { url: "netflix.com", isLegit: true },
      { url: "netflix.billing-verify.net", isLegit: false },
      { url: "netflx-support.com", isLegit: false },
      { url: "secure-netflix-login.com", isLegit: false }
    ],
    hint: "Netflix always uses netflix.com natively. Watch out for misspelled words like 'netflx'."
  },
  {
    bank: "Binance (Crypto Wallet)",
    options: [
      { url: "binance-wallet-verify.net", isLegit: false },
      { url: "login-binance-secure.com", isLegit: false },
      { url: "binance.support-ticket.com", isLegit: false },
      { url: "binance.com", isLegit: true },
      { url: "binance-crypto-bonus.net", isLegit: false }
    ],
    hint: "Binance operates globally on binance.com."
  },
  {
    bank: "PayPal",
    options: [
      { url: "paypal-security-auth.com", isLegit: false },
      { url: "secure-paypal-login.net", isLegit: false },
      { url: "paypal.com", isLegit: true },
      { url: "paypaI-verification.com", isLegit: false },
      { url: "paypal.account-update.com", isLegit: false }
    ],
    hint: "Scammers often use uppercase 'i' to mimic a lowercase 'L' (e.g., paypaI). The real domain is paypal.com."
  },
  {
    bank: "Royal Mail (Delivery Scam)",
    options: [
      { url: "royalmail.com", isLegit: true },
      { url: "royalmail-delivery-fee.com", isLegit: false },
      { url: "royal-mail-tracking-update.net", isLegit: false },
      { url: "royalmail.reschedule-parcel.com", isLegit: false },
      { url: "post-royalmail-uk.com", isLegit: false }
    ],
    hint: "Royal Mail operates purely on royalmail.com. Scammers often register domains referencing 'delivery-fee'."
  },
  {
    bank: "Microsoft 365 (Auth)",
    options: [
      { url: "microsoft-secure-login.net", isLegit: false },
      { url: "office365-password-reset.com", isLegit: false },
      { url: "login.microsoftonline.com", isLegit: true },
      { url: "login.microsoft-verify.com", isLegit: false },
      { url: "ms-auth-portal.com", isLegit: false }
    ],
    hint: "Microsoft's official enterprise login portal is login.microsoftonline.com."
  },
  {
    bank: "HMRC (Tax Rebate)",
    options: [
      { url: "hmrc-tax-refund.co.uk", isLegit: false },
      { url: "gov-uk-tax-rebate.com", isLegit: false },
      { url: "gov.uk", isLegit: true },
      { url: "hmrc.secure-portal.net", isLegit: false },
      { url: "gov.uk-verify-identity.com", isLegit: false }
    ],
    hint: "All official UK government services, including HMRC, are hosted under gov.uk."
  },
  {
    bank: "Apple ID",
    options: [
      { url: "apple-id-security-lock.com", isLegit: false },
      { url: "appleid.apple.com", isLegit: true },
      { url: "secure-apple-verify.net", isLegit: false },
      { url: "apple.support-recovery.com", isLegit: false },
      { url: "icloud-login-auth.com", isLegit: false }
    ],
    hint: "Apple ID login is hosted on a subdomain of the primary apple.com domain."
  },
  {
    bank: "Facebook (Security Alert)",
    options: [
      { url: "facebook-security-team.com", isLegit: false },
      { url: "fb-account-verify.net", isLegit: false },
      { url: "facebook.login-help.com", isLegit: false },
      { url: "facebook.com", isLegit: true },
      { url: "secure-facebook-meta.com", isLegit: false }
    ],
    hint: "Facebook notifications will direct you to facebook.com."
  },
  {
    bank: "HSBC Bank",
    options: [
      { url: "secure-hsbc-login.com", isLegit: false },
      { url: "hsbc-auth.co.uk", isLegit: false },
      { url: "hsbc.verify-pay.uk", isLegit: false },
      { url: "hsbc-security-alert.com", isLegit: false },
      { url: "hsbc.co.uk", isLegit: true }
    ],
    hint: "HSBC's official UK domain is hsbc.co.uk."
  }
];

export default function GamePage() {
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'feedback', 'end'
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [questions, setQuestions] = useState([]);

  const startGame = () => {
    // Shuffle options for each question
    const shuffledQuestions = QUESTION_BANK.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    })).sort(() => Math.random() - 0.5).slice(0, 10); // Take 10 random questions

    setQuestions(shuffledQuestions);
    setScore(0);
    setCurrentQIndex(0);
    setGameState('playing');
  };

  const handleSelect = (option) => {
    if (gameState !== 'playing') return;
    
    setSelectedOption(option);
    if (option.isLegit) {
      setScore(prev => prev + 1);
    }
    
    setGameState('feedback');
    
    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setGameState('playing');
      } else {
        setGameState('end');
      }
    }, 2000);
  };

  const getScoreMessage = () => {
    if (score === 10) return { title: "Excellent!", text: "You have a flawless eye for legitimate URLs. You are highly secure.", color: "text-emerald-400" };
    if (score >= 7) return { title: "Good Job", text: "You spotted most of the fakes, but there's still room for improvement.", color: "text-brand-400" };
    return { title: "Needs Improvement", text: "You fell for several phishing attempts. Always verify domain names carefully!", color: "text-red-400" };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans selection:bg-brand-500/30 flex flex-col">
      
      {/* Minimal Navbar */}
      <nav className="w-full backdrop-blur-xl bg-slate-50/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
              <Shield size={20} className="text-slate-800" />
            </div>
            <span className="text-slate-800 font-extrabold tracking-tight text-xl group-hover:text-brand-300 transition-colors">PhishGuard UK</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            &larr; Back to Platform
          </Link>
        </div>
      </nav>

      {/* Game Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 backdrop-blur-xl">
          
          {gameState === 'start' && (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-brand-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Test Your Knowledge</h1>
              <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto">
                Phishing attacks often rely on slightly altered domain names. We will show you 5 URLs related to major brands, banks, and services. Your task is to identify the <strong className="text-emerald-400">legitimate</strong> one.
              </p>
              <button 
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2 mx-auto"
              >
                Start Simulation <ArrowRight size={20} />
              </button>
            </div>
          )}

          {(gameState === 'playing' || gameState === 'feedback') && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <span className="text-sm font-bold text-slate-500 tracking-widest uppercase">Target: {questions[currentQIndex].bank}</span>
                <span className="text-sm font-bold bg-white/5 px-3 py-1 rounded-full text-brand-400">
                  Question {currentQIndex + 1} of 10
                </span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 text-center leading-tight">
                Which URL is <span className="text-emerald-400">legitimate</span>?
              </h2>

              <div className="flex flex-col gap-4">
                {questions[currentQIndex].options.map((option, idx) => {
                  let buttonClass = "w-full p-5 rounded-xl border text-left flex items-center justify-between font-mono text-lg transition-all duration-300 ";
                  
                  if (gameState === 'playing') {
                    buttonClass += "bg-white border-slate-200 text-slate-600 hover:border-brand-500/50 hover:bg-white/5 cursor-pointer";
                  } else {
                    // Feedback state
                    buttonClass += "cursor-default ";
                    if (option.isLegit) {
                      buttonClass += "bg-emerald-900/30 border-emerald-500/50 text-emerald-400 scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                    } else if (selectedOption === option && !option.isLegit) {
                      buttonClass += "bg-red-900/30 border-red-500/50 text-red-400";
                    } else {
                      buttonClass += "bg-white/50 border-white/5 text-slate-600 opacity-50";
                    }
                  }

                  return (
                    <button 
                      key={idx}
                      onClick={() => handleSelect(option)}
                      disabled={gameState !== 'playing'}
                      className={buttonClass}
                    >
                      <span className="truncate flex-1">https://{option.url}/login</span>
                      {gameState === 'feedback' && option.isLegit && <CheckCircle className="text-emerald-500 ml-4 shrink-0" />}
                      {gameState === 'feedback' && selectedOption === option && !option.isLegit && <XCircle className="text-red-500 ml-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {gameState === 'feedback' && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4">
                  {selectedOption.isLegit ? (
                    <p className="text-emerald-400 font-bold text-lg flex items-center justify-center gap-2">
                      <CheckCircle size={20} /> Correct!
                    </p>
                  ) : (
                    <p className="text-red-400 font-bold text-lg flex items-center justify-center gap-2">
                      <XCircle size={20} /> Incorrect. Phishing link detected.
                    </p>
                  )}
                  <p className="text-slate-500 text-sm mt-2">{questions[currentQIndex].hint}</p>
                </div>
              )}
            </div>
          )}

          {gameState === 'end' && (
            <div className="text-center animate-in fade-in zoom-in duration-500">
              <div className="mb-8 relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="60" className="stroke-white/10" strokeWidth="8" fill="none" />
                  <circle 
                    cx="64" cy="64" r="60" 
                    className={`${getScoreMessage().color.replace('text-', 'stroke-')}`} 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="377" 
                    strokeDashoffset={377 - (377 * score) / 10} 
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <span className={`absolute text-4xl font-extrabold ${getScoreMessage().color}`}>{score}/10</span>
              </div>
              
              <h1 className={`text-3xl font-bold mb-4 ${getScoreMessage().color}`}>{getScoreMessage().title}</h1>
              <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto">
                {getScoreMessage().text}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-white border border-slate-200 hover:bg-graphite-700 text-white font-bold transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <RefreshCw size={18} /> Retry Simulation
                </button>
                <Link 
                  to="/register"
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] w-full sm:w-auto justify-center"
                >
                  Deploy Node Platform
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
