// PhishGuard UK - Expert Content Script v1.3
// Enhanced for technical dissertation analysis

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

  // 2. Deep Technology Fingerprinting (v1.4)
  const html = document.documentElement.innerHTML.toLowerCase();
  const scripts = Array.from(document.getElementsByTagName('script'));
  const styles = Array.from(document.getElementsByTagName('link'));

  // Utility to extract version from src
  const getVersion = (list, pattern) => {
    for (let item of list) {
      const src = item.src || item.href || "";
      const match = src.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  };

  // Banking specific detection
  if (html.includes('adobe experience manager') || html.includes('cq5')) {
      const v = html.match(/version\s*:\s*"([\d.]+)"/i);
      data.techStack.push(`Adobe Experience Manager ${v ? v[1] : ''}`);
  }
  if (html.includes('sitecore')) data.techStack.push('Sitecore CMS');
  if (html.includes('liferay')) data.techStack.push('Liferay Portal');
  
  // Versions from Scripts
  const jqVer = getVersion(scripts, /jquery[.-]([\d.]+)/);
  if (jqVer) data.techStack.push(`jQuery ${jqVer}`);

  const ngVer = getVersion(scripts, /angular[.-]([\d.]+)/);
  if (ngVer) data.techStack.push(`Angular ${ngVer}`);

  if (html.includes('wp-content')) {
      const wpVer = html.match(/ver=([\d.]+)/);
      data.techStack.push(`WordPress ${wpVer ? wpVer[1] : ''}`);
  }

  // Security & CDNs
  if (scripts.some(s => s.src.includes('incapsula') || s.src.includes('imperva'))) data.techStack.push('Imperva WAF');
  if (scripts.some(s => s.src.includes('akamai')) || html.includes('akamai')) data.techStack.push('Akamai CDN');
  if (scripts.some(s => s.src.includes('cloudflare'))) data.techStack.push('Cloudflare Protection');

  // Backend hints
  if (html.includes('asp.net') || html.includes('__viewstate')) data.techStack.push('ASP.NET');
  if (html.includes('php') || scripts.some(s => s.src.includes('.php'))) data.techStack.push('PHP Environment');
  if (html.includes('java') || html.includes('jsp')) data.techStack.push('Java/JSP Server');

  // 3. Form Analysis
  const forms = document.getElementsByTagName('form');
  for (let form of forms) {
    let action = form.getAttribute('action') || '';
    let isMismatched = false;
    
    if (action.startsWith('http')) {
      try {
        let actionDomain = new URL(action).hostname;
        if (actionDomain !== data.domain && !actionDomain.includes('google.com') && !actionDomain.includes('bing.com')) {
          isMismatched = true;
        }
      } catch (e) {}
    }

    data.forms.push({
      action: action,
      isMismatchedDomain: isMismatched,
      hasPasswordInput: !!form.querySelector('input[type="password"]'),
      inputCount: form.querySelectorAll('input, select, textarea').length
    });
  }

  // 4. Content Analysis
  const bodyText = document.body.innerText.toLowerCase();
  const bankKeywords = ['barclays', 'hsbc', 'lloyds', 'natwest', 'santander', 'halifax', 'monzo', 'starling', 'nationwide', 'tsb', 'royal bank', 'nationstrust'];
  const urgencyWords = ['immediate', 'suspended', 'unauthorized', 'verify', 'update', 'expired', 'security alert', 'confirm identity'];

  bankKeywords.forEach(kw => {
    if (bodyText.includes(kw)) data.suspiciousKeywords.push(kw);
  });

  urgencyWords.forEach(kw => {
    if (bodyText.includes(kw)) data.urgencyKeywords.push(kw);
  });

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzePage") {
    sendResponse(extractPageData());
  }
});
