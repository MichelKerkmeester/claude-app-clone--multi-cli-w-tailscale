// ───────────────────────────────────────────────────────────────────
// MODULE: Design System Catalog Entry
// ───────────────────────────────────────────────────────────────────
// The catalog is read-only design tooling that mounts its OWN React root into
// #catalog-root (see catalog.html). It shares nothing mount-wise with the
// operator app and imports none of the operator shell (main.tsx, App,
// style.css) so it can never white-screen the secured runtime. It renders the
// real components over deterministic offline fixtures and opens no socket or
// network path on its own — any fixture-driven socket help is avoided unless a
// surfaced preview explicitly needs it (it does not today).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { RootErrorBoundary } from '../../ErrorBoundary.js';
import { Catalog } from './Catalog.js';
import './catalog.css';

const root = document.getElementById('catalog-root');
if (root === null) throw new Error('Missing catalog root');
createRoot(root).render(
  <StrictMode>
    <RootErrorBoundary>
      <Catalog />
    </RootErrorBoundary>
  </StrictMode>,
);