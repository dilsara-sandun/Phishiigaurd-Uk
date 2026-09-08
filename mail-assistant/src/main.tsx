/// <reference types="office-js" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

let rootRendered = false;

const renderApp = () => {
  if (rootRendered) return;
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootRendered = true;
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
};

// If Office is present, listen to Office.onReady
if (typeof window !== 'undefined' && (window as unknown as { Office?: { onReady: (cb: () => void) => void } }).Office) {
  (window as unknown as { Office: { onReady: (cb: () => void) => void } }).Office.onReady(() => {
    renderApp();
  });
}

// Fallback to ensure app renders even if Office script doesn't initialize
setTimeout(renderApp, 500);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderApp();
} else {
  document.addEventListener('DOMContentLoaded', renderApp);
}

