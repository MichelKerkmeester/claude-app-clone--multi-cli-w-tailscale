// ───────────────────────────────────────────────────────────────────
// MODULE: INBOUND IMAGE VIEWER TESTS
// ───────────────────────────────────────────────────────────────────

// Port of app-mobile/tests/InboundImageViewer.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle; the Svelte viewer opens via the
// real getArtifactViewer() context (InboundImageTriggerHarness with label
// 'Open redacted capture'). The inbound image is opened with sessionId=null,
// so the resource read rejects immediately (no fetch) — exactly as in the
// React oracle — and the viewer chrome (header, zoom/pan controls, details
// disclosure) renders regardless. Timing-sensitive phase transitions
// (opening → ready-image) are awaited with waitFor / findBy* because the
// Svelte phase machine schedules them on setTimeout(0), matching the React
// act() flush semantics.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import InboundImageTriggerHarness from './support/InboundImageTriggerHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const IMAGE: InboundImageReadyBlock = {
  id: 'block_phase_image_viewer',
  revision: 1,
  seq: 2,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_phase_image_viewer',
    revision: 'rev_phase_image_viewer',
    expiresAt: '2026-08-17T11:00:00.000Z',
    full: {
      digest: 'a'.repeat(64),
      mediaType: 'image/png',
      width: 960,
      height: 540,
      byteLength: 32,
    },
    thumbnail: {
      digest: 'b'.repeat(64),
      mediaType: 'image/png',
      width: 240,
      height: 135,
      byteLength: 16,
    },
  },
  presentation: { safeAlt: 'A redacted capture' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('data-artifact-viewer-open');
  document.documentElement.removeAttribute('data-artifact-viewer-privacy');
  document.getElementById('artifact-viewer-privacy-curtain')?.remove();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('inbound image fullscreen viewer', () => {
  it('opens through the shared viewer with frozen safe metadata', async () => {
    render(InboundImageTriggerHarness, {
      props: { block: IMAGE, label: 'Open redacted capture' },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Open redacted capture' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Screenshot' })).toBeVisible());

    expect(screen.getByRole('dialog', { name: 'Image preview viewer' })).toBeVisible();
    expect(screen.getByText('Exact revision rev_phase_image_viewer')).toBeVisible();
    expect(screen.queryByText(IMAGE.artifact.id)).toBeNull();
    expect(screen.queryByText(IMAGE.artifact.full.digest)).toBeNull();
    expect(screen.queryByRole('button', { name: /copy|share|save|download|export/i })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('exposes zoom, pan, and details as read-only controls', async () => {
    render(InboundImageTriggerHarness, {
      props: { block: IMAGE, label: 'Open redacted capture' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Open redacted capture' }));
    await screen.findByRole('heading', { name: 'Screenshot' });

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Pan image' })).toBeVisible();
    const details = screen.getByRole('button', { name: 'Details' });
    expect(details).toHaveAttribute('aria-controls', 'artifact-details');
    await fireEvent.click(details);
    expect(await screen.findByRole('region', { name: 'Image details' })).toBeVisible();
  });

  it('does not create an additional viewer when the same card opens repeatedly', async () => {
    render(InboundImageTriggerHarness, {
      props: { block: IMAGE, label: 'Open redacted capture' },
    });
    const trigger = screen.getByRole('button', { name: 'Open redacted capture' });
    const before = window.history.length;
    await fireEvent.click(trigger);
    await screen.findByRole('heading', { name: 'Screenshot' });
    await fireEvent.click(trigger);
    expect(window.history.length).toBe(before + 1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
