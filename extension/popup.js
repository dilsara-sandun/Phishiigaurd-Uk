document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loader = document.getElementById('loader');
  const resultDiv = document.getElementById('result');
  
  analyzeBtn.disabled = true;
  loader.style.display = 'block';
  resultDiv.style.display = 'none';

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script if not already there, then send message
    chrome.tabs.sendMessage(tab.id, { action: "analyzePage" }, async (pageData) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message to content script. Make sure it's injected.", chrome.runtime.lastError);
        alert("Could not connect to the page. Try refreshing it.");
        resetUI();
        return;
      }
      
      if (!pageData) {
        alert("Failed to extract data from the page.");
        resetUI();
        return;
      }

      // Send to backend
      try {
        // Adjust port if your backend runs on a different one (e.g., 8000)
        const response = await fetch('http://localhost:8000/api/v1/extension/analyse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pageData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        displayResult(result);
      } catch (error) {
        console.error('Error contacting backend:', error);
        alert('Error contacting PhishGuard backend. Is it running on port 8000?');
        resetUI();
      }
    });
  } catch (error) {
    console.error('Error:', error);
    resetUI();
  }
});

function displayResult(result) {
  const loader = document.getElementById('loader');
  const resultDiv = document.getElementById('result');
  const statusBadge = document.getElementById('statusBadge');
  const explanation = document.getElementById('explanation');
  const techStack = document.getElementById('techStack');
  const riskFactors = document.getElementById('riskFactors');

  loader.style.display = 'none';
  resultDiv.style.display = 'block';

  // Set status
  statusBadge.className = `status ${result.label}`;
  statusBadge.textContent = `${result.label.toUpperCase()} (Score: ${result.score_pct}%)`;

  // Set AI Explanation
  explanation.textContent = result.explanation || "No explanation provided.";

  // Set Tech Stack
  techStack.innerHTML = `<strong>Tech Stack:</strong> ${result.tech_stack.length > 0 ? result.tech_stack.join(', ') : 'Unknown'}`;

  // Set Risk Factors
  if (result.red_flags && result.red_flags.length > 0) {
    riskFactors.innerHTML = `<strong>Red Flags:</strong><ul style="margin:0; padding-left:20px;">
      ${result.red_flags.map(f => `<li>${f.description}</li>`).join('')}
    </ul>`;
  } else {
    riskFactors.innerHTML = '';
  }
}

function resetUI() {
  document.getElementById('analyzeBtn').disabled = false;
  document.getElementById('loader').style.display = 'none';
}
