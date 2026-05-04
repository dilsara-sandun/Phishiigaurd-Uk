// PhishGuard UK - Enterprise Analyzer Script

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const initialView = document.getElementById('initialView');
  const loaderView = document.getElementById('loaderView');
  const resultView = document.getElementById('resultView');
  
  // Transition to loader
  initialView.style.display = 'none';
  loaderView.style.display = 'block';

  try {
    // 1. Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Analyzing tab:", tab.url);
    
    // 2. Request data from content script
    chrome.tabs.sendMessage(tab.id, { action: "analyzePage" }, async (pageData) => {
      console.log("Data from content script:", pageData);
      if (chrome.runtime.lastError || !pageData) {
        console.error("Data extraction failed:", chrome.runtime.lastError);
        alert("PhishGuard: Could not extract page data. Please refresh the page and try again.");
        resetUI();
        return;
      }
      
      // 3. Send to Backend
      try {
        console.log("Sending to backend:", 'http://127.0.0.1:8000/api/extension/analyse');
        const response = await fetch('http://127.0.0.1:8000/api/extension/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pageData)
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);

        const result = await response.json();
        renderResults(result);
      } catch (error) {
        console.error('Backend connection failed:', error);
        alert('PhishGuard Core Engine is offline. Ensure your backend is running on port 8000.');
        resetUI();
      }
    });
  } catch (error) {
    console.error('Extension error:', error);
    resetUI();
  }
});

function renderResults(result) {
  const loaderView = document.getElementById('loaderView');
  const resultView = document.getElementById('resultView');
  
  // Elements
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

  // 1. Hide Loader, Show Results
  loaderView.style.display = 'none';
  resultView.style.display = 'block';

  // 2. Set Status Style
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
      // Scary warning for phishing
      explanationText.innerHTML = `<span style="color: #ef4444; font-weight: bold;">⚠️ CRITICAL SECURITY WARNING:</span> ${result.explanation}`;
  }
  
  // Icons based on label
  if (result.label === 'phishing') {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
  } else if (result.label === 'legitimate') {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  } else {
    statusIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  }

  // 3. Set Technical Grid
  hostingVal.textContent = result.hosting || 'Cloud Hosted';
  ipVal.textContent = result.server_ip || 'Hidden/Proxy';
  
  // Display primary tech or standard
  const tech = result.tech_stack || [];
  techVal.textContent = tech.length > 0 ? tech[0] : 'Standard Web';
  
  // DNS/Security logic
  const hasSecurity = result.green_flags.some(f => f.flag_name === 'valid_ssl_certificate');
  secVal.textContent = hasSecurity ? 'Verified SSL' : 'Insecure';
  secVal.style.color = hasSecurity ? '#22c55e' : '#ef4444';

  // 4. Set Explanation
  explanationText.textContent = result.explanation;

  // 5. Render Flags
  flagsList.innerHTML = '';
  
  // Green flags first
  result.green_flags.forEach(f => {
    const div = document.createElement('div');
    div.className = 'flag green';
    div.innerHTML = `<span>✅</span> <span>${f.description}</span>`;
    flagsList.appendChild(div);
  });

  // Red flags
  result.red_flags.forEach(f => {
    const div = document.createElement('div');
    div.className = 'flag red';
    div.innerHTML = `<span>❌</span> <span>${f.description}</span>`;
    flagsList.appendChild(div);
  });
}

function resetUI() {
  document.getElementById('initialView').style.display = 'block';
  document.getElementById('loaderView').style.display = 'none';
  document.getElementById('resultView').style.display = 'none';
}
