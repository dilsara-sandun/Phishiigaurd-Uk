// PhishGuard UK - Content Script v2.0
// Supports both website phishing analysis and Gmail email reading

// ── Universal brand keyword detection (100+ brands) ──────────────────────────
// These are the same brands recognised by the backend's KNOWN_BRANDS set.
const KNOWN_BRAND_KEYWORDS = [
  // Tech / Cloud / Social
  'google', 'gmail', 'youtube', 'microsoft', 'outlook', 'office', 'onedrive', 'azure',
  'apple', 'icloud', 'amazon', 'aws', 'facebook', 'meta', 'instagram', 'whatsapp',
  'twitter', 'linkedin', 'netflix', 'paypal', 'ebay', 'dropbox', 'adobe', 'zoom',
  'docusign', 'slack', 'github',
  // UK Banks
  'lloyds', 'natwest', 'barclays', 'hsbc', 'santander', 'nationwide', 'halifax',
  'monzo', 'starling', 'revolut', 'firstdirect', 'metrobank', 'tsb', 'rbs',
  'cooperativebank', 'virginmoney',
  // Delivery
  'dhl', 'fedex', 'royalmail', 'hermes', 'dpd', 'ups', 'parcelforce', 'evri',
  // UK Government
  'hmrc', 'dvla', 'dvsa', 'nhs', 'gov.uk', 'tvlicensing', 'dwp',
  // Finance
  'visa', 'mastercard', 'amex', 'americanexpress', 'westernunion', 'transferwise',
  'wise', 'stripe', 'klarna', 'coinbase', 'binance',
  // Telecom / Utilities
  'bt', 'sky', 'virginmedia', 'vodafone', 'ee', 'o2', 'talktalk', 'bt.com',
  // Retail
  'amazon', 'argos', 'asda', 'tesco', 'sainsburys', 'currys', 'boots',
];

const URGENCY_WORDS = [
  'urgent', 'immediate', 'action required', 'suspended', 'verify', 'confirm',
  'security alert', 'unauthorized', 'click here', 'log in now', 'limited time',
  'update your details', 'validate', 'final notice', 'final warning', 'prize',
  'winner', 'lottery', 'inheritance', 'otp', 'one-time password',
];


// ── Website page data extraction (existing feature) ───────────────────────────

function extractPageData() {
  const data = {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    techStack: [],
    forms: [],
    links: [],
    suspiciousKeywords: [],
    urgencyKeywords: [],
    metaMetadata: {}
  };

  // 1. Meta Data & Server Hints
  const metaTags = document.getElementsByTagName('meta');
  for (let meta of metaTags) {
    const name = meta.name || meta.getAttribute('property') || meta.httpEquiv;
    if (name) {
      data.metaMetadata[name] = meta.content;
      if (name.toLowerCase() === 'generator') data.techStack.push(`CMS: ${meta.content}`);
    }
  }

  // 2. Technology Fingerprinting
  const html = document.documentElement.innerHTML.toLowerCase();
  const scripts = Array.from(document.getElementsByTagName('script'));

  const getVersion = (list, pattern) => {
    for (let item of list) {
      const src = item.src || item.href || '';
      const match = src.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  };

  if (html.includes('adobe experience manager') || html.includes('cq5'))
    data.techStack.push('Adobe Experience Manager');
  if (html.includes('sitecore')) data.techStack.push('Sitecore CMS');
  if (html.includes('liferay')) data.techStack.push('Liferay Portal');

  const jqVer = getVersion(scripts, /jquery[.-]([\d.]+)/);
  if (jqVer) data.techStack.push(`jQuery ${jqVer}`);
  const ngVer = getVersion(scripts, /angular[.-]([\d.]+)/);
  if (ngVer) data.techStack.push(`Angular ${ngVer}`);
  if (html.includes('wp-content')) {
    const wpVer = html.match(/ver=([\d.]+)/);
    data.techStack.push(`WordPress ${wpVer ? wpVer[1] : ''}`);
  }

  if (scripts.some(s => s.src.includes('incapsula') || s.src.includes('imperva')))
    data.techStack.push('Imperva WAF');
  if (scripts.some(s => s.src.includes('akamai')) || html.includes('akamai'))
    data.techStack.push('Akamai CDN');
  if (scripts.some(s => s.src.includes('cloudflare')))
    data.techStack.push('Cloudflare Protection');

  if (html.includes('asp.net') || html.includes('__viewstate')) data.techStack.push('ASP.NET');
  if (html.includes('php') || scripts.some(s => s.src.includes('.php'))) data.techStack.push('PHP Environment');
  if (html.includes('java') || html.includes('jsp')) data.techStack.push('Java/JSP Server');

  // 3. Form Analysis
  const forms = document.getElementsByTagName('form');
  for (let form of forms) {
    let action = form.getAttribute('action') || '';
    let isMismatched = false;
    const hasPassword = !!form.querySelector('input[type="password"]');
    if (action.startsWith('http')) {
      try {
        let actionHost = new URL(action).hostname.toLowerCase();
        let currentHost = data.domain.toLowerCase();
        
        let isSameDomain = actionHost === currentHost ||
                           actionHost.endsWith('.' + currentHost) ||
                           currentHost.endsWith('.' + actionHost);
                           
        let isTrustedService = [
          'list-manage.com', 'mailchimp.com', 'salesforce.com', 'marketo.com',
          'hubspot.com', 'pardot.com', 'paypal.com', 'stripe.com', 'google.com',
          'microsoft.com', 'bing.com', 'facebook.com', 'apple.com'
        ].some(svc => actionHost.includes(svc));

        // Only flag mismatched domain if it's NOT a trusted service AND contains password inputs
        if (!isSameDomain && !isTrustedService && hasPassword) {
          isMismatched = true;
        }
      } catch (e) {}
    }
    data.forms.push({
      action: action,
      isMismatchedDomain: isMismatched,
      hasPasswordInput: hasPassword,
      inputCount: form.querySelectorAll('input, select, textarea').length
    });
  }

  // 4. Universal keyword detection (all brands + urgency)
  const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
  KNOWN_BRAND_KEYWORDS.forEach(kw => {
    if (kw.length < 3) return; // Skip 1-2 letter noise in body text like 'ee', 'x'
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(bodyText)) {
      data.suspiciousKeywords.push(kw);
    }
  });
  URGENCY_WORDS.forEach(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(bodyText)) {
      data.urgencyKeywords.push(kw);
    }
  });

  return data;
}


// ── Gmail email extraction ────────────────────────────────────────────────────

/**
 * Detect if the user currently has an email open in Gmail.
 * Returns true if Gmail's email reading pane is visible and populated.
 */
function isGmailEmailOpen() {
  const subject = document.querySelector('h2.hP');
  const body = document.querySelector('div.a3s');
  return !!(subject && body);
}

/**
 * Extract email data from the Gmail DOM.
 * Only reads text content — never reads attachment file data.
 */
function extractGmailEmailData() {
  // Subject
  const subjectEl = document.querySelector('h2.hP');
  const subject = subjectEl ? subjectEl.innerText.trim() : '(No Subject)';

  // Sender: Gmail renders sender info in a span with the 'email' attribute
  let sender = '';
  const senderEl = document.querySelector('.gD[email]');
  if (senderEl) {
    const displayName = senderEl.innerText.trim();
    const emailAddr = senderEl.getAttribute('email') || '';
    sender = displayName && emailAddr
      ? `${displayName} <${emailAddr}>`
      : emailAddr || displayName;
  }

  // Body: Gmail renders the decoded email text in div.a3s.aiL
  // Fall back to div.a3s if the more specific class isn't present
  const bodyEl = document.querySelector('div.a3s.aiL') || document.querySelector('div.a3s');
  const body = bodyEl ? bodyEl.innerText.trim() : '';

  // Attachments: Gmail renders attachment chips with the filename visible
  // Multiple selector attempts to handle Gmail's varying DOM structures
  const attachmentNames = [];
  const attachSelectors = [
    '.aZo .a-b',     // attachment chip text
    '.aZo span[download]',
    '.aV3',           // another common attachment wrapper
    '[data-tooltip]', // some attachments use data-tooltip for filename
  ];
  for (const sel of attachSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      const name = el.innerText || el.getAttribute('data-tooltip') || '';
      const trimmed = name.trim();
      // Filter: must look like a filename (has a dot and reasonable length)
      if (trimmed && trimmed.includes('.') && trimmed.length < 256 && !attachmentNames.includes(trimmed)) {
        attachmentNames.push(trimmed);
      }
    });
    if (attachmentNames.length > 0) break; // stop once we find attachments
  }

  // Attachment count: try Gmail's attachment count label as a cross-check
  const attachCountEl = document.querySelector('.aQH');
  const reportedCount = attachCountEl
    ? parseInt(attachCountEl.innerText.match(/\d+/)?.[0] || '0', 10)
    : 0;

  return {
    subject,
    sender,
    body,
    attachmentNames,
    attachmentCount: Math.max(attachmentNames.length, reportedCount),
  };
}


// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePage') {
    sendResponse(extractPageData());
    return;
  }

  if (request.action === 'isGmailEmail') {
    sendResponse({ isOpen: isGmailEmailOpen() });
    return;
  }

  if (request.action === 'analyzeGmailEmail') {
    sendResponse(extractGmailEmailData());
    return;
  }
});
