// Port of app-mobile/tests/viewer-history.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle; the Svelte viewer opens via the
// real getArtifactViewer() context (InboundImageOpenButtonsHarness). The
// history.pushState/back contract and one-child invariant are asserted
// identically; focus restoration is awaited with waitFor because
// restorePreview schedules the focus return on setTimeout(0).

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import InboundImageOpenButtonsHarness from './support/InboundImageOpenButtonsHarness.svelte';

const FIRST: InboundImageReadyBlock = {
  id: 'block_history_first',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_history_first',
    revision: 'rev_history_first',
    expiresAt: '2026-08-17T11:00:00.000Z',
    full: {
      digest: 'a'.repeat(64),
      mediaType: 'image/png',
      width: 640,
      height: 360,
      byteLength: 12,
    },
    thumbnail: {
      digest: 'b'.repeat(64),
      mediaType: 'image/png',
      width: 320,
      height: 180,
      byteLength: 6,
    },
  },
  presentation: { safeAlt: 'First screenshot' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

const SECOND: InboundImageReadyBlock = {
  ...FIRST,
  id: 'block_history_second',
  displayName: 'Image from pi',
  artifact: { ...FIRST.artifact, id: 'artifact_history_second', revision: 'rev_history_second' },
};

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('viewer history and focus ownership', () => {
  it('uses one history child, restores transcript scroll, and returns focus to the trigger', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(InboundImageOpenButtonsHarness, { props: { first: FIRST, second: SECOND } });
    // Capture both trigger refs before opening — the open viewer aria-hides the background, so a later role query can't resolve them.
    const openFirst = screen.getByRole('button', { name: 'Open first' });
    const openSecond = screen.getByRole('button', { name: 'Open second' });
    const scroll = document.querySelector<HTMLElement>('.transcript-scroll');
    expect(scroll).not.toBeNull();
    if (scroll === null) return;
    scroll.scrollTop = 120;
    scroll.scrollLeft = 18;
    const before = window.history.length;

    await fireEvent.click(openFirst);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Screenshot' })).toBeVisible());
    expect(window.history.length).toBe(before + 1);
    expect(JSON.stringify(window.history.state)).not.toContain(FIRST.id);

    // The second open replaces the preview without pushing a second history
    // child (preview is already non-null, so history.open is a no-op).
    await fireEvent.click(openSecond);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Image from pi' })).toBeVisible(),
    );
    expect(window.history.length).toBe(before + 1);
    expect(JSON.stringify(window.history.state)).not.toContain(SECOND.id);

    await fireEvent.click(screen.getByRole('button', { name: /Close image from pi viewer/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(historyBack).toHaveBeenCalledOnce();
    expect(scroll.scrollTop).toBe(120);
    expect(scroll.scrollLeft).toBe(18);
    // Focus restoration runs in restorePreview's setTimeout(0), so await it.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open second' })),
    );
  });
});
