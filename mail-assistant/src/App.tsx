import { useState } from 'react';
import './App.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlagItem {
  flag_type: 'red' | 'green';
  flag_name: string;
  description: string;
}

interface UrlSummary {
  url: string;
  label: string;
  score_pct: number;
}

interface DomainIntel {
  domain: string;
  registrar: string | null;
  domain_age_days: number | null;
  ssl_issuer: string | null;
  hosted_country: string | null;
  has_mx: boolean;
  label: string;
  score_pct: number;
}

interface AttachmentResult {
  filename: string;
  risk_level: 'critical' | 'high' | 'medium' | 'safe' | 'unknown';
  description: string;
}

interface AnalysisResult {
  overall_label: string;
  overall_score_pct: number;
  security_score_pct: number;
  sender_domain: string;
  red_flags: FlagItem[];
  green_flags: FlagItem[];
  extracted_urls: UrlSummary[];
  domain_intel: DomainIntel | null;
  explanation: string;
  attachment_results: AttachmentResult[];
  scanned_at: string;
}

interface EmailMeta {
  subject: string;
  sender: string;
  attachmentCount: number;
  attachmentNames: string[];
}

// ─── Config ──────────────────────────────────────────────────────────────────
// Using a relative path so Vite's proxy forwards it correctly (HTTPS→HTTP)
const API = '/api/extension/mail-analyse';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const labelColor = (l: string) =>
  l === 'phishing' ? '#ef4444' : l === 'suspicious' ? '#f59e0b' : '#22c55e';

const labelBg = (l: string) =>
  l === 'phishing' ? 'rgba(239,68,68,0.1)' : l === 'suspicious' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';

const labelIcon = (l: string) =>
  l === 'phishing' ? '🚨' : l === 'suspicious' ? '⚠️' : '✅';

const scoreGradient = (pct: number) => {
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#22c55e';
  return `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.06) 0)`;
};

const domainAge = (days: number | null): string => {
  if (days === null) return 'Unknown';
  if (days < 30) return `${days}d ⚠️ Very new!`;
  if (days < 365) return `${days}d (< 1 year)`;
  return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
};

// ─── App ─────────────────────────────────────────────────────────────────────

type Screen = 'idle' | 'reading' | 'scanning' | 'done' | 'error';

export default function App() {
  const [screen, setScreen] = useState<Screen>('idle');
  const [meta, setMeta] = useState<EmailMeta | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'domain' | 'links' | 'attachments'>('summary');

  // ── Read email from Outlook via Office.js ───────────────────────────────────
  const readEmail = (): Promise<{ subject: string; sender: string; body: string; attachmentCount: number; attachmentNames: string[] }> =>
    new Promise((resolve, reject) => {
      const Office = (window as unknown as { Office: typeof globalThis.Office }).Office;
      if (!Office?.context?.mailbox?.item) {
        return reject('Please open an email first, then click Analyze.');
      }
      const item = Office.context.mailbox.item as Office.MessageRead;
      const subject = item.subject ?? '(No Subject)';
      const sender = item.from?.emailAddress ?? '';
      const attachments: Office.AttachmentDetails[] = item.attachments ?? [];
      const attachmentCount = attachments.length;
      // Collect only the filename (name property) — never the content
      const attachmentNames: string[] = attachments.map((a: Office.AttachmentDetails) => a.name ?? '');

      item.body.getAsync(Office.CoercionType.Text, (res: Office.AsyncResult<string>) => {
        if (res.status !== Office.AsyncResultStatus.Succeeded) {
          return reject('Could not read email body. Please try again.');
        }
        resolve({ subject, sender, body: res.value ?? '', attachmentCount, attachmentNames });
      });
    });

  // ── Analyze ─────────────────────────────────────────────────────────────────────────
  const analyze = async () => {
    setError('');
    setResult(null);
    setActiveTab('summary');

    try {
      setScreen('reading');
      const { subject, sender, body, attachmentCount, attachmentNames } = await readEmail();
      setMeta({ subject, sender, attachmentCount, attachmentNames });

      setScreen('scanning');
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, sender, body, attachments: attachmentNames }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail ?? `Server error ${res.status}. Is the PhishGuard backend running?`);
      }

      setResult(await res.json());
      setScreen('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error occurred.');
      setScreen('error');
    }
  };

  const reset = () => {
    setScreen('idle');
    setResult(null);
    setMeta(null);
    setError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container">

      {/* Header */}
      <header className="header">
        <div className="logo-row">
          <span className="shield">🛡️</span>
          <div>
            <h1>PhishGuard</h1>
            <p className="subtitle">AI Mail Assistant</p>
          </div>
          {screen === 'done' && (
            <button className="btn-reset" onClick={reset} title="Analyze another email">↩ Reset</button>
          )}
        </div>
      </header>

      <main>

        {/* ── IDLE ── */}
        {screen === 'idle' && (
          <div className="idle-view fade-in">
            <div className="instructions">
              <div className="step">
                <span className="step-num">1</span>
                <span>Click any email in your <strong>Outlook, University, or Gmail</strong> inbox to open it</span>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <span>Click the button below — PhishGuard will analyze it instantly</span>
              </div>
            </div>

            <div className="gmail-note">
              <strong>📬 Gmail users:</strong> The Analyze button only appears in the Outlook ribbon for <em>Exchange/Outlook accounts</em>. For Gmail, open the email in Outlook and use this task pane button below.
            </div>

            {error && <div className="error-card">⚠️ {error}</div>}

            <button id="analyze-btn" className="btn-primary" onClick={analyze}>
              🔍 Analyze Current Email
            </button>
          </div>
        )}

        {/* ── READING ── */}
        {screen === 'reading' && (
          <div className="scanning-state fade-in">
            <div className="spinner" />
            <p>Reading email from Outlook…</p>
          </div>
        )}

        {/* ── SCANNING ── */}
        {screen === 'scanning' && meta && (
          <div className="scanning-state fade-in">
            <div className="spinner accent-spin" />
            <p className="scan-title">Running AI analysis…</p>
            <p className="scan-sub">Checking email content, links & sender domain</p>
            <div className="email-preview-mini">
              <strong>{meta.subject || '(No Subject)'}</strong>
              <span>{meta.sender || 'Unknown sender'}</span>
              {meta.attachmentCount > 0 && <span className="attach-note">📎 {meta.attachmentCount} attachment(s)</span>}
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {screen === 'error' && (
          <div className="fade-in">
            <div className="error-card">⚠️ {error}</div>
            <button className="btn-secondary mt" onClick={reset}>← Try Again</button>
          </div>
        )}

        {/* ── DONE: Results ── */}
        {screen === 'done' && result && meta && (
          <div className="results fade-in">

            {/* Email meta */}
            <div className="email-meta-card">
              <div className="meta-row"><span className="meta-label">From</span><span className="meta-value">{meta.sender || 'Unknown'}</span></div>
              <div className="meta-row">
                <span className="meta-label">Domain</span>
                <span className="domain-chip" style={{ background: labelBg(result.domain_intel?.label ?? 'legitimate'), color: labelColor(result.domain_intel?.label ?? 'legitimate') }}>
                  {result.sender_domain || '—'}
                </span>
              </div>
              <div className="meta-row"><span className="meta-label">Subject</span><span className="meta-value">{meta.subject || '(No Subject)'}</span></div>
              {meta.attachmentCount > 0 && (
                <div className="meta-row"><span className="meta-label">Attach.</span><span className="attach-chip">📎 {meta.attachmentCount} file(s)</span></div>
              )}
            </div>

            {/* Verdict banner */}
            <div className="verdict-banner" style={{ borderColor: labelColor(result.overall_label), background: labelBg(result.overall_label) }}>
              <span className="verdict-icon">{labelIcon(result.overall_label)}</span>
              <div style={{ flex: 1 }}>
                <div className="verdict-label" style={{ color: labelColor(result.overall_label) }}>
                  {result.overall_label.toUpperCase()}
                </div>
                <div className="verdict-sub">AI Phishing Verdict</div>
              </div>
              <div className="verdict-score">
                <span style={{ color: labelColor(result.overall_label) }}>{result.overall_score_pct}%</span>
                <span className="verdict-score-label">risk</span>
              </div>
            </div>

            {/* Score rings */}
            <div className="scores-row">
              {[
                { label: 'Risk Score', pct: result.overall_score_pct, invert: false },
                { label: 'Security Score', pct: result.security_score_pct, invert: true },
              ].map(s => (
                <div className="score-card" key={s.label}>
                  <div className="score-ring" style={{ background: scoreGradient(s.invert ? 100 - s.pct : s.pct) }}>
                    <div className="score-inner">
                      <span className="score-num">{s.pct}</span>
                      <span className="score-unit">%</span>
                    </div>
                  </div>
                  <p className="score-title">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
              {(['summary', 'domain', 'links'] as const).map(t => (
                <button
                  key={t}
                  className={`tab ${activeTab === t ? 'active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'summary' && '📋 Summary'}
                  {t === 'domain' && `🌐 Domain${result.domain_intel ? '' : ''}`}
                  {t === 'links' && `🔗 Links (${result.extracted_urls.length})`}
                </button>
              ))}
            </div>

            {/* ── Tab: Summary ── */}
            {activeTab === 'summary' && (
              <div className="tab-content fade-in">
                {result.explanation && (
                  <div className="section">
                    <h3>🤖 AI Conclusion</h3>
                    <p className="explanation-text">{result.explanation}</p>
                  </div>
                )}

                {result.red_flags.length > 0 && (
                  <div className="section">
                    <h3>🚩 Red Flags <span className="count-badge danger">{result.red_flags.length}</span></h3>
                    <ul className="flags-list">
                      {result.red_flags.map((f, i) => (
                        <li key={i} className="flag-item red-flag">
                          <strong>{f.flag_name.replace(/_/g, ' ')}</strong>
                          <span>{f.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.green_flags.length > 0 && (
                  <div className="section">
                    <h3>✅ Safe Signals <span className="count-badge safe">{result.green_flags.length}</span></h3>
                    <ul className="flags-list">
                      {result.green_flags.map((f, i) => (
                        <li key={i} className="flag-item green-flag">
                          <strong>{f.flag_name.replace(/_/g, ' ')}</strong>
                          <span>{f.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.red_flags.length === 0 && result.green_flags.length === 0 && (
                  <div className="no-flags">✅ No specific threat indicators detected in this email.</div>
                )}
              </div>
            )}

            {/* ── Tab: Domain ── */}
            {activeTab === 'domain' && (
              <div className="tab-content fade-in">
                {result.domain_intel ? (
                  <>
                    <div className="domain-verdict" style={{ borderColor: labelColor(result.domain_intel.label) }}>
                      <span className="dv-icon">{labelIcon(result.domain_intel.label)}</span>
                      <div>
                        <div className="dv-label" style={{ color: labelColor(result.domain_intel.label) }}>
                          Domain: {result.domain_intel.label.toUpperCase()}
                        </div>
                        <div className="dv-domain">{result.domain_intel.domain}</div>
                      </div>
                      <div className="dv-score" style={{ color: labelColor(result.domain_intel.label) }}>
                        {result.domain_intel.score_pct}%
                      </div>
                    </div>

                    <div className="intel-grid">
                      <div className="intel-card">
                        <span className="intel-icon">📅</span>
                        <div>
                          <div className="intel-label">Domain Age</div>
                          <div className="intel-value">{domainAge(result.domain_intel.domain_age_days)}</div>
                        </div>
                      </div>
                      <div className="intel-card">
                        <span className="intel-icon">🔒</span>
                        <div>
                          <div className="intel-label">SSL Certificate</div>
                          <div className="intel-value">{result.domain_intel.ssl_issuer ?? 'None / Unknown'}</div>
                        </div>
                      </div>
                      <div className="intel-card">
                        <span className="intel-icon">🏢</span>
                        <div>
                          <div className="intel-label">Registrar</div>
                          <div className="intel-value">{result.domain_intel.registrar ?? 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="intel-card">
                        <span className="intel-icon">🌍</span>
                        <div>
                          <div className="intel-label">Hosted In</div>
                          <div className="intel-value">{result.domain_intel.hosted_country ?? 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="intel-card">
                        <span className="intel-icon">📨</span>
                        <div>
                          <div className="intel-label">Mail Records (MX)</div>
                          <div className="intel-value" style={{ color: result.domain_intel.has_mx ? '#22c55e' : '#ef4444' }}>
                            {result.domain_intel.has_mx ? '✅ Present' : '❌ Missing'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="no-flags">⚠️ Could not retrieve domain intelligence for this sender. The domain may be private or unreachable.</div>
                )}
              </div>
            )}

            {/* ── Tab: Links ── */}
            {activeTab === 'links' && (
              <div className="tab-content fade-in">
                {result.extracted_urls.length > 0 ? (
                  <ul className="url-list">
                    {result.extracted_urls.map((u, i) => (
                      <li key={i} className="url-item">
                        <div className="url-top">
                          <span className="url-badge" style={{ background: labelColor(u.label) }}>
                            {u.label} {u.score_pct}%
                          </span>
                        </div>
                        <span className="url-text">{u.url.length > 70 ? u.url.slice(0, 70) + '…' : u.url}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-flags">✅ No embedded links found in this email.</div>
                )}
              </div>
            )}

            <button className="btn-secondary mt" onClick={reset}>🔄 Analyze Another Email</button>
          </div>
        )}
      </main>
    </div>
  );
}
