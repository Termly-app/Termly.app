import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './pages/App.css'
import './index.css'
import { initStore } from './data/store'
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ScrollToTop from './components/ScrollToTop';
import { DialogProvider } from './contexts/DialogContext';
import OfflineDetector from './components/ErrorStates/OfflineDetector';

import { applySecurityHeaders } from './utils/securityUtils';

// Apply Content-Security-Policy and security headers
applySecurityHeaders();

// Domain 2: Validate environment before app mount
function validateEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const errors = [];

  if (!url) {
    errors.push('VITE_SUPABASE_URL is missing.');
  } else if (!url.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https:// — insecure connections are not allowed.');
  }

  if (!key) {
    errors.push('VITE_SUPABASE_ANON_KEY is missing.');
  } else if (key.includes('service_role')) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be a service_role key — this must NEVER be used in the frontend bundle.');
  }


  if (errors.length > 0) {
    const errorHtml = errors.map(e => `<li>${e}</li>`).join('');
    document.body.innerHTML = `
      <div style="padding: 50px; text-align: center; font-family: system-ui, sans-serif; color: #ef4444; max-width: 600px; margin: 0 auto;">
        <h2 style="margin-bottom: 16px;">⚠️ Critical Configuration Error</h2>
        <ul style="text-align: left; line-height: 1.8;">${errorHtml}</ul>
        <p style="color: #71717a; margin-top: 24px;">
          Create a <code>.env.local</code> file in the project root with the required variables.<br/>
          See <code>docs/SECRETS.md</code> for details.
        </p>
      </div>
    `;
    throw new Error('Environment validation failed: ' + errors.join(' '));
  }
}

validateEnv();

initStore();

import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HelmetProvider>
          <BrowserRouter>
            <DialogProvider>
              <ScrollToTop />
              <OfflineDetector>
                <App />
              </OfflineDetector>
            </DialogProvider>
          </BrowserRouter>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error("CRITICAL: Root element not found!");
}
