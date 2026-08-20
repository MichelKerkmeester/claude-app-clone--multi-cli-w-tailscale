// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Root Error Boundary
// ───────────────────────────────────────────────────────────────────
// Without a boundary, any uncaught error thrown while React renders the
// tree unmounts the whole root, leaving an empty <div id="root"> — a
// fully blank screen with no way to recover. This boundary keeps a
// render failure legible and recoverable: it shows a minimal, self-
// contained fallback (styled inline so it survives even a missing
// stylesheet) and offers Reload plus a data reset that clears the
// service worker and caches, the escape hatch when a bad cached bundle
// is what failed to run.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface RootErrorBoundaryProps {
  readonly children: ReactNode;
}

interface RootErrorBoundaryState {
  readonly failed: boolean;
}

export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  public state: RootErrorBoundaryState = { failed: false };

  public static getDerivedStateFromError(): RootErrorBoundaryState {
    return { failed: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the throwing stack so a remote-debugged device shows the real
    // failure instead of a silent blank. Component stacks name components, not
    // session content; the read-only view never routes tickets or model ids here.
    console.error('Pi Remote failed to render.', error, info.componentStack);
  }

  public render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <RootErrorFallback />;
  }
}

function RootErrorFallback() {
  const root = document.documentElement;
  const dark =
    root.dataset.theme === 'dark' ||
    (root.dataset.theme !== 'light' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const surface = dark ? '#24221f' : '#f8f8f6';
  const ink = dark ? '#f3f1ec' : '#24221f';
  const muted = dark ? '#b8b3a9' : '#5f5b52';
  const border = dark ? '#3a3733' : '#d9d5cc';

  return (
    <main
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: surface,
        color: ink,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '22rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', fontWeight: 600 }}>
          Pi Remote hit an unexpected error
        </h1>
        <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, margin: '0 0 1.25rem', color: muted }}>
          The app could not finish loading. Reload to try again. If it keeps happening, reset the
          app data to clear a stale install.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button type="button" onClick={reloadApp} style={buttonStyle(ink, surface, border, true)}>
            Reload
          </button>
          <button type="button" onClick={resetApp} style={buttonStyle(ink, surface, border, false)}>
            Reset app data
          </button>
        </div>
      </div>
    </main>
  );
}

function buttonStyle(
  ink: string,
  surface: string,
  border: string,
  primary: boolean,
): Record<string, string> {
  return {
    appearance: 'none',
    cursor: 'pointer',
    borderRadius: '0.625rem',
    padding: '0.625rem 1rem',
    fontSize: '0.9375rem',
    fontWeight: '600',
    border: `1px solid ${border}`,
    background: primary ? ink : 'transparent',
    color: primary ? surface : ink,
  };
}

function reloadApp(): void {
  window.location.reload();
}

// Best-effort recovery from a corrupted or stale installed bundle: drop the
// service worker and its caches, then reload from the network.
function resetApp(): void {
  const done = () => window.location.reload();
  const tasks: Promise<unknown>[] = [];
  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => undefined),
    );
  }
  if ('caches' in window) {
    tasks.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined),
    );
  }
  void Promise.all(tasks).finally(done);
}
