// PhishGuard UK - Popup Script v2.0
// Supports: Website analysis (existing) + Gmail email analysis (new)

const BACKEND_URL = 'http://127.0.0.1:8000';

/** Escape a value for safe HTML interpolation (prevents XSS). */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── On popup open: detect Gmail ───────────────────────────────────────────────

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isGmail = tab.url && tab.url.includes('mail.google.com');

    if (isGmail) {
      // Ask content script if an email is currently open
      chrome.tabs.sendMessage(tab.id, { action: 'isGmailEmail' }, (resp) => {
        if (chrome.runtime.lastError) return; // content script not ready yet
        if (resp && resp.isOpen) {
          showGmailEmailSection();
        }
      });
    }
  } catch (e) {
    // Non-critical — just don't show Gmail section
  }
})();

function showGmailEmailSection() {
  const gmailSection = document.getElementById('gmailSection');
  if (gmailSection) gmailSection.style.display = 'block';
}


// ── Website scan (existing) ───────────────────────────────────────────────────

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const initialView = document.getElementById('initialView');
  const loaderView = document.getElementById('loaderView');
  const resultView = document.getElementById('resultView');

  initialView.style.display = 'none';
  loaderView.style.display = 'block';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'analyzePage' }, async (pageData) => {
      if (chrome.runtime.lastError || !pageData) {
        alert('PhishGuard: Could not extract page data.\n\nPlease refresh the page (F5) and try again.\n\nReason: ' + (chrome.runtime.lastError?.message || 'Content script not ready'));
        resetUI();
        return;
      }
      try {
        const response = await fetch(`${BACKEND_URL}/api/extension/analyse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageData)
        });
        if (!response.ok) throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        const result = await response.json();
        renderSiteResults(result);
      } catch (error) {
        console.error('[PhishGuard] Fetch error:', error);
        alert('PhishGuard scan failed.\n\nError: ' + error.message + '\n\nMake sure:\n1. Backend is running on port 8000\n2. You refreshed the page before scanning');
        resetUI();
      }
    });
  } catch (error) {
    console.error('Extension error:', error);
    resetUI();
  }
});

function renderSiteResults(result) {
  const loaderView = document.getElementById('loaderView');
  const resultView = document.getElementById('resultView');

  const statusBanner = document.getElementById('statusBanner');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const scorePct = document.getElementById('scorePct');
  const hostingVal = document.getElementById('hostingVal');
  const ipVal = document.getElementById('ipVal');
  const techVal = document.getElementById('techVal');
  const secVal = document.getElementById('secVal');
  const explanationText = document.getElementById('explanationText');
  const flagsList = document.getElementById('flagsList');

  loaderView.style.display = 'none';
  resultView.style.display = 'block';

  statusBanner.className = `status-banner ${result.label}`;

  if (result.label === 'legitimate') {
    statusText.textContent = 'TRUSTED';
    scorePct.textContent = `${100 - result.score_pct}% SECURE`;
  } else if (result.label === 'suspicious') {
    statusText.textContent = 'SUSPICIOUS';
    scorePct.textContent = `${result.score_pct}% RISK`;
  } else {
    statusText.textContent = 'PHISHING';
    scorePct.textContent = `${result.score_pct}% THREAT`;
  }

  if (result.label === 'phishing') {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
  } else if (result.label === 'legitimate') {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  } else {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  }

  hostingVal.textContent = result.hosting || 'Cloud Hosted';
  ipVal.textContent = result.server_ip || 'Hidden/Proxy';
  const tech = result.tech_stack || [];
  techVal.textContent = tech.length > 0 ? tech[0] : 'Standard Web';
  const hasSecurity = result.green_flags.some(f => f.flag_name === 'valid_ssl_certificate' || f.flag_name === 'ssl_certificate_present');
  secVal.textContent = hasSecurity ? 'Verified SSL' : 'Insecure';
  secVal.style.color = hasSecurity ? '#22c55e' : '#ef4444';

  if (result.label === 'phishing') {
    explanationText.innerHTML = `<span style="color:#ef4444;font-weight:bold;">⚠️ CRITICAL:</span> ${esc(result.explanation)}`;
  } else {
    explanationText.textContent = result.explanation;
  }

  flagsList.innerHTML = '';
  result.green_flags.forEach(f => {
    const div = document.createElement('div');
    div.className = 'flag green';
    const icon = document.createElement('span');
    icon.textContent = '\u2705';
    const desc = document.createElement('span');
    desc.textContent = f.description;
    div.appendChild(icon);
    div.append(' ');
    div.appendChild(desc);
    flagsList.appendChild(div);
  });
  result.red_flags.forEach(f => {
    const div = document.createElement('div');
    div.className = 'flag red';
    const icon = document.createElement('span');
    icon.textContent = '\u274c';
    const desc = document.createElement('span');
    desc.textContent = f.description;
    div.appendChild(icon);
    div.append(' ');
    div.appendChild(desc);
    flagsList.appendChild(div);
  });
}


// ── Gmail email analysis ──────────────────────────────────────────────────────

document.getElementById('gmailAnalyzeBtn').addEventListener('click', async () => {
  const gmailLoader = document.getElementById('gmailLoader');
  const gmailResults = document.getElementById('gmailResults');
  const gmailError = document.getElementById('gmailError');

  gmailLoader.style.display = 'block';
  gmailResults.style.display = 'none';
  gmailError.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Step 1: Extract email data from Gmail DOM via content script
    const emailData = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'analyzeGmailEmail' }, (data) => {
        if (chrome.runtime.lastError || !data) {
          reject(new Error('Could not read email from Gmail. Please make sure an email is open.'));
        } else {
          resolve(data);
        }
      });
    });

    if (!emailData.subject && !emailData.body) {
      throw new Error('No email content found. Please open an email in Gmail first.');
    }

    // Step 2: Send to backend for analysis
    const response = await fetch(`${BACKEND_URL}/api/extension/mail-analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: emailData.subject || '',
        sender: emailData.sender || '',
        body: emailData.body || '',
        attachments: emailData.attachmentNames || [],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.detail || `Backend error ${response.status}`);
    }

    const result = await response.json();
    renderGmailResults(result, emailData);

  } catch (err) {
    gmailLoader.style.display = 'none';
    gmailError.style.display = 'block';
    gmailError.textContent = `⚠️ ${err.message}`;
  }
});

function riskColor(label) {
  if (label === 'phishing') return '#ef4444';
  if (label === 'suspicious') return '#f59e0b';
  return '#22c55e';
}

function riskIcon(label) {
  if (label === 'phishing') return '🚨';
  if (label === 'suspicious') return '⚠️';
  return '✅';
}

function attachRiskColor(level) {
  if (level === 'critical') return '#ef4444';
  if (level === 'high') return '#f97316';
  if (level === 'medium') return '#f59e0b';
  return '#22c55e';
}

function attachRiskLabel(level) {
  if (level === 'critical') return '🔴 CRITICAL';
  if (level === 'high') return '🟠 HIGH';
  if (level === 'medium') return '🟡 MEDIUM';
  return '✅ SAFE';
}

function renderGmailResults(result, emailData) {
  const gmailLoader = document.getElementById('gmailLoader');
  const gmailResults = document.getElementById('gmailResults');

  gmailLoader.style.display = 'none';
  gmailResults.style.display = 'block';

  const color = riskColor(result.overall_label);
  const icon = riskIcon(result.overall_label);

  // Verdict banner — only safe constants (color strings from JS fns, score %) are interpolated
  document.getElementById('gmailVerdict').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:12px;
      background:${color}18;border:1px solid ${color}44;margin-bottom:12px;">
      <span style="font-size:22px">${icon}</span>
      <div style="flex:1">
        <div style="font-weight:800;font-size:13px;color:${color};text-transform:uppercase;letter-spacing:.08em">
          ${esc(result.overall_label)}
        </div>
        <div style="font-size:11px;color:#94a3b8">From: ${esc(emailData.sender || 'Unknown')}</div>
        <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">
          ${esc(emailData.subject || '(No Subject)')}
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:18px;color:${color}">
        ${esc(result.overall_score_pct)}%
      </div>
    </div>
  `;

  // AI Explanation
  document.getElementById('gmailExplanation').textContent = result.explanation || '';

  // Flags
  const flagsEl = document.getElementById('gmailFlags');
  flagsEl.innerHTML = '';
  (result.red_flags || []).forEach(f => {
    const d = document.createElement('div');
    d.className = 'flag red';
    const icon = document.createElement('span');
    icon.textContent = '\u274c';
    const desc = document.createElement('span');
    desc.textContent = f.description;
    d.appendChild(icon);
    d.appendChild(desc);
    flagsEl.appendChild(d);
  });
  (result.green_flags || []).forEach(f => {
    const d = document.createElement('div');
    d.className = 'flag green';
    const icon = document.createElement('span');
    icon.textContent = '\u2705';
    const desc = document.createElement('span');
    desc.textContent = f.description;
    d.appendChild(icon);
    d.appendChild(desc);
    flagsEl.appendChild(d);
  });

  // Attachment risk cards
  const attachEl = document.getElementById('gmailAttachments');
  const attachments = result.attachment_results || [];
  if (attachments.length > 0) {
    attachEl.style.display = 'block';
    attachEl.innerHTML = `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">
      📎 Attachments (${attachments.length})</div>`;
    attachments.forEach(a => {
      const c = attachRiskColor(a.risk_level);
      const lbl = attachRiskLabel(a.risk_level);
      const card = document.createElement('div');
      card.style.cssText = `background:${c}12;border:1px solid ${c}40;border-radius:8px;padding:10px 12px;margin-bottom:6px;`;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:700;color:white;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">${esc(a.filename)}</span>
          <span style="font-size:10px;font-weight:800;color:${c};white-space:nowrap;margin-left:8px">${esc(lbl)}</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;line-height:1.4">${esc(a.description)}</div>
      `;
      attachEl.appendChild(card);
    });
  } else {
    attachEl.style.display = 'none';
  }

  // URLs
  const urlsEl = document.getElementById('gmailUrls');
  const urls = result.extracted_urls || [];
  if (urls.length > 0) {
    urlsEl.style.display = 'block';
    urlsEl.innerHTML = `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;">
      🔗 Links Found (${urls.length})</div>`;
    urls.slice(0, 5).forEach(u => {
      const c = riskColor(u.label);
      const item = document.createElement('div');
      item.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);margin-bottom:4px;`;
      const displayUrl = u.url.length > 55 ? u.url.slice(0, 55) + '\u2026' : u.url;
      item.innerHTML = `
        <span style="background:${c};color:white;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;white-space:nowrap">${esc(u.label.toUpperCase())}</span>
        <span style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(displayUrl)}</span>
      `;
      urlsEl.appendChild(item);
    });
  } else {
    urlsEl.style.display = 'none';
  }
}


// ── UI helpers ────────────────────────────────────────────────────────────────

function resetUI() {
  document.getElementById('initialView').style.display = 'block';
  document.getElementById('loaderView').style.display = 'none';
  document.getElementById('resultView').style.display = 'none';
}
