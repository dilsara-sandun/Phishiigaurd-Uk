// PhishGuard UK - Content Script

function extractPageData() {
  const data = {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    techStack: [],
    forms: [],
    links: [],
    suspiciousKeywords: [],
    urgencyKeywords: []
  };

  // 1. Tech Stack (Meta tags & scripts)
  const metaTags = document.getElementsByTagName('meta');
  for (let meta of metaTags) {
    if (meta.name.toLowerCase() === 'generator') {
      data.techStack.push(`Generator: ${meta.content}`);
    }
  }

  const scripts = document.getElementsByTagName('script');
  const scriptSources = Array.from(scripts).map(s => s.src).filter(Boolean);
  
  if (scriptSources.some(src => src.includes('react') || src.includes('next'))) {
    data.techStack.push('React/Next.js');
  }
  if (scriptSources.some(src => src.includes('vue') || src.includes('nuxt'))) {
    data.techStack.push('Vue.js/Nuxt.js');
  }
  if (scriptSources.some(src => src.includes('jquery'))) {
    data.techStack.push('jQuery');
  }
  if (document.documentElement.innerHTML.includes('wp-content')) {
    data.techStack.push('WordPress');
  }

  // 2. Forms (Credential Harvesting)
  const forms = document.getElementsByTagName('form');
  for (let form of forms) {
    let action = form.getAttribute('action') || '';
    let isMismatched = false;
    
    if (action.startsWith('http')) {
      try {
        let actionDomain = new URL(action).hostname;
        if (actionDomain !== data.domain) {
          isMismatched = true;
        }
      } catch (e) {}
    }

    data.forms.push({
      action: action,
      isMismatchedDomain: isMismatched,
      hasPasswordInput: !!form.querySelector('input[type="password"]')
    });
  }

  // 3. Banking & Urgency Keywords
  const bodyText = document.body.innerText.toLowerCase();
  
  const bankKeywords = ['barclays', 'hsbc', 'lloyds', 'natwest', 'santander', 'halifax', 'monzo', 'starling', 'nationwide'];
  const urgencyWords = ['immediate action required', 'account suspended', 'verify your identity', 'unauthorized login', 'update your billing'];

  bankKeywords.forEach(kw => {
    if (bodyText.includes(kw)) data.suspiciousKeywords.push(kw);
  });

  urgencyWords.forEach(kw => {
    if (bodyText.includes(kw)) data.urgencyKeywords.push(kw);
  });

  // 4. Embedded Links
  const links = document.getElementsByTagName('a');
  for (let i = 0; i < Math.min(links.length, 50); i++) { // Limit to 50 links
    if (links[i].href) {
      data.links.push(links[i].href);
    }
  }

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzePage") {
    const pageData = extractPageData();
    sendResponse(pageData);
  }
});
