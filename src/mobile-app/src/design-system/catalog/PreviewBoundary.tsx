// ───────────────────────────────────────────────────────────────────
// MODULE: Catalog per-preview error boundary
// ───────────────────────────────────────────────────────────────────
// A compact, self-contained boundary around each live preview. If a catalogued
// component throws while rendering over the demo fixture, the failure is
// contained to this one card (a readable fallback) and the rest of the catalog
// keeps rendering — a preview can degrade but never crash the catalog.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PreviewBoundaryProps {
  readonly title: string;
  readonly children: ReactNode;
}

interface PreviewBoundaryState {
  readonly failed: boolean;
}

export class PreviewBoundary extends Component<PreviewBoundaryProps, PreviewBoundaryState> {
  public state: PreviewBoundaryState = { failed: false };

  public static getDerivedStateFromError(): PreviewBoundaryState {
    return { failed: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // The preview fixture is deterministic; a throw here is a catalogue bug
    // worth surfacing but never allowed to blank the whole catalog.
    console.error(`Catalog preview failed (${this.props.title}).`, error, info.componentStack);
  }

  public render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="catalog-preview-fallback" role="alert">
        <span className="catalog-preview-fallback-title">Preview unavailable</span>
        <span>This surface threw while rendering over the demo fixture and was isolated here.</span>
      </div>
    );
  }
}