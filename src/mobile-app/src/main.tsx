// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Entrypoint
// ───────────────────────────────────────────────────────────────────

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { RootErrorBoundary } from './ErrorBoundary.js';
import './style.css';

const root = document.getElementById('root');
if (root === null) throw new Error('Missing application root');
createRoot(root).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
  });
}
