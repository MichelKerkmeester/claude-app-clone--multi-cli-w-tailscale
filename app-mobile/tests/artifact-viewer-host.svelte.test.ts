// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT VIEWER HOST TESTS
// ───────────────────────────────────────────────────────────────────

// Port of app-mobile/tests/ArtifactViewer.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle; the Svelte viewer opens via the
// real getArtifactViewer() context (ArtifactViewerCardsHarness /
// ArtifactPreviewTriggerHarness / ArtifactViewerApiOnlyHarness). Timing-
// sensitive phase transitions (opening → ready-diff, exiting → closed) and
// focus/scroll restoration are awaited with waitFor / tick because the
// Svelte phase machine schedules them on setTimeout(0), matching the React
// act() flush semantics. No style.css import — the Svelte components carry
// their own scoped styles; the oracle's CSS import was visual-only and
// asserted no CSS regexes, so nothing is repointed.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256, type FileDiffBlock, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import type { ArtifactViewerContextValue } from '../src/pages/chat/artifacts/types.js';

import ArtifactViewerCardsHarness from './support/ArtifactViewerCardsHarness.svelte';
import ArtifactPreviewTriggerHarness from './support/ArtifactPreviewTriggerHarness.svelte';
import ArtifactViewerApiOnlyHarness from './support/ArtifactViewerApiOnlyHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const FIRST: FileDiffBlock = {
  id: 'block_file_diff_first',
  revision: 1,
  seq: 5,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_diff',
  summary: 'First redacted diff',
  patch: '@@ first\n-old\n+new\n',
};

const SECOND: FileDiffBlock = {
  id: 'block_file_diff_second',
  revision: 1,
  seq: 6,
  occurredAt: '2026-08-17T10:01:00.000Z',
  kind: 'file_diff',
  summary: 'Second redacted diff',
  patch: '@@ second\n-old-second\n+new-second',
};

const TEXT_PREVIEW: FilePreviewBlock = {
  id: 'block_text_preview_001',
  revision: 'rev_text_preview_001',
  seq: 7,
  occurredAt: '2026-08-17T10:02:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_text_preview_001',
  displayName: 'notes.txt',
  renderer: 'text',
  mimeType: 'text/plain',
  byteLength: new TextEncoder().encode('TEXT_A').byteLength,
  digest: sha256('TEXT_A'),
  redaction: 'not-needed',
  completeness: 'complete',
  shareAllowed: true,
  availability: 'ready',
  content: { kind: 'inline-text', text: 'TEXT_A', firstLine: 1 },
};

const SECOND_TEXT_PREVIEW: FilePreviewBlock = {
  ...TEXT_PREVIEW,
  id: 'block_text_preview_002',
  revision: 'rev_text_preview_002',
  seq: 8,
  artifactId: 'artifact_text_preview_002',
  displayName: 'other.txt',
  byteLength: new TextEncoder().encode('TEXT_B').byteLength,
  digest: sha256('TEXT_B'),
  content: { kind: 'inline-text', text: 'TEXT_B', firstLine: 1 },
};

const STALE_ARTIFACT_PREVIEW: FilePreviewBlock = {
  id: 'block_artifact_preview_stale',
  revision: 'rev_artifact_preview_stale',
  seq: 9,
  occurredAt: '2026-08-17T10:03:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_preview_stale',
  displayName: 'stale.txt',
  renderer: 'text',
  mimeType: 'text/plain',
  byteLength: new TextEncoder().encode('FRESH_AFTER_RETRY').byteLength,
  digest: sha256('FRESH_AFTER_RETRY'),
  redaction: 'not-needed',
  completeness: 'complete',
  shareAllowed: false,
  availability: 'ready',
  content: { kind: 'artifact-ref' },
};

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  document.documentElement.removeAttribute('data-artifact-viewer-open');
  document.getElementById('artifact-viewer-privacy-curtain')?.remove();
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function renderCards(onReady?: (api: ArtifactViewerContextValue) => void) {
  return render(ArtifactViewerCardsHarness, {
    props: { first: FIRST, second: SECOND, ...(onReady !== undefined ? { onReady } : {}) },
  });
}

function firstCard() {
  return screen.getByRole('button', { name: 'Open file diff: First redacted diff' });
}

async function openFirst() {
  const trigger = firstCard();
  await fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'File diff viewer' });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'File diff' })).toHaveFocus());
  return { dialog, trigger };
}

function artifactResponse(status: number, text = ''): Response {
  return {
    status,
    ok: status === 200,
    headers: new Headers(
      status === 200
        ? {
            'content-type': 'text/plain',
            etag: `"${sha256(text)}"`,
            'x-artifact-revision': STALE_ARTIFACT_PREVIEW.revision,
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
            'cross-origin-resource-policy': 'same-origin',
          }
        : {},
    ),
    body: null,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as unknown as Response;
}

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('ArtifactViewer', () => {
  it('opens one labelled dialog, focuses the safe heading, and renders exact patch bytes', async () => {
    renderCards();

    const { dialog } = await openFirst();
    const patch = dialog.querySelector('.artifact-diff-preview');
    expect(patch).not.toBeNull();
    expect(patch?.textContent).toBe(FIRST.patch);
    expect(screen.getByRole('button', { name: 'Close file diff viewer' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Redacted file diff ready.');
  });

  it('freezes the received source and makes opening request-free', async () => {
    const fetchSpy = vi.fn();
    const webSocketSpy = vi.fn();
    let api: ArtifactViewerContextValue | null = null;
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('WebSocket', webSocketSpy);
    renderCards((value) => {
      api = value;
    });

    await openFirst();
    expect(Object.isFrozen(api?.preview?.source ?? null)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();
    expect(document.querySelector('.artifact-diff-preview')?.textContent).toBe(FIRST.patch);
  });

  it('restores transcript scroll and originating focus after Close', async () => {
    renderCards();
    const scroll = document.querySelector('.transcript-scroll');
    if (!(scroll instanceof HTMLElement)) throw new Error('transcript scroll missing');
    scroll.scrollTop = 137;

    const { trigger } = await openFirst();
    await fireEvent.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(scroll.scrollTop).toBe(137);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each([
    [
      'Escape',
      async () => {
        await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      },
    ],
    [
      'browser Back',
      async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    ],
  ])('dismisses through %s without leaving the session', async (_label, dismiss) => {
    renderCards();
    const { trigger } = await openFirst();
    await dismiss();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.pathname).toBe('/');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('dismisses through an iOS edge-back gesture and a VoiceOver scrub', async () => {
    renderCards();
    const { dialog } = await openFirst();
    await fireEvent.pointerDown(dialog, { pointerType: 'touch', clientX: 2, clientY: 180 });
    await fireEvent.pointerUp(dialog, { pointerType: 'touch', clientX: 90, clientY: 184 });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await openFirst();
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'outside session control';
    document.body.append(outside);
    outside.focus();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(firstCard()).toHaveFocus());
    outside.remove();
  });

  it('falls back to the transcript region when virtualization removes the trigger', async () => {
    renderCards();
    const { trigger } = await openFirst();
    trigger.remove();
    await fireEvent.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Typed transcript' })).toHaveFocus(),
    );
  });

  it('replaces a source without allowing the first opening transition to commit', async () => {
    let api: ArtifactViewerContextValue | null = null;
    renderCards((value) => {
      api = value;
    });
    const firstTrigger = firstCard();
    const secondTrigger = screen.getByRole('button', {
      name: 'Open file diff: Second redacted diff',
    });
    if (api === null) throw new Error('viewer API missing');

    api.openDiff(FIRST, firstTrigger);
    api.openDiff(SECOND, secondTrigger);
    await waitFor(() => {
      expect(document.querySelector('[data-artifact-state="ready-diff"]')).not.toBeNull();
      expect(document.querySelector('.artifact-viewer-summary')).toHaveTextContent(
        'Second redacted diff',
      );
    });
    expect(document.querySelector('.artifact-viewer-summary')).not.toHaveTextContent(
      'First redacted diff',
    );
  });

  it('offers an explicit same-revision retry after a stale resource response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(artifactResponse(409))
      .mockResolvedValueOnce(artifactResponse(200, 'FRESH_AFTER_RETRY'));
    vi.stubGlobal('fetch', fetchMock);
    render(ArtifactPreviewTriggerHarness, { props: { block: STALE_ARTIFACT_PREVIEW } });
    await fireEvent.click(screen.getByRole('button', { name: 'Open stale.txt' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'View latest' })).toBeInTheDocument(),
    );
    const firstRequest = fetchMock.mock.calls[0]?.[0];
    await fireEvent.click(screen.getByRole('button', { name: 'View latest' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Text preview')).toHaveTextContent('FRESH_AFTER_RETRY'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(firstRequest);
  });

  it('invalidates the opening transition when closed before it becomes ready', async () => {
    let api: ArtifactViewerContextValue | null = null;
    renderCards((value) => {
      api = value;
    });
    const trigger = firstCard();
    if (api === null) throw new Error('viewer API missing');

    api.openDiff(FIRST, trigger);
    await tick();
    expect(document.querySelector('[data-artifact-state="opening"]')).not.toBeNull();
    api.close();
    await tick();
    expect(document.querySelector('[data-artifact-state="exiting"]')).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('selects a descriptor renderer, exposes exact revision metadata, and copies displayed text', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(ArtifactPreviewTriggerHarness, { props: { block: TEXT_PREVIEW } });
    await fireEvent.click(screen.getByRole('button', { name: 'Open notes.txt' }));
    await screen.findByRole('heading', { name: 'notes.txt' });
    // The inline-text resource resolves asynchronously (digestBytes + the
    // useArtifactResource $effect), so the TextPreview appears after the
    // heading — await it rather than assuming synchronous availability.
    expect(await screen.findByLabelText('Text preview')).toHaveTextContent('TEXT_A');
    expect(screen.getByText('Exact revision rev_text_preview_001')).toBeInTheDocument();
    expect(screen.queryByLabelText('Redacted file diff')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('TEXT_A'));
  });

  it('keeps replacement content out of the previous descriptor title and DOM payload', async () => {
    let api: ArtifactViewerContextValue | null = null;
    render(ArtifactViewerApiOnlyHarness, {
      props: {
        onReady: (value: ArtifactViewerContextValue) => {
          api = value;
        },
      },
    });
    if (api === null) throw new Error('viewer API missing');
    api.openDiff(TEXT_PREVIEW, null);
    api.openDiff(SECOND_TEXT_PREVIEW, null);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'other.txt' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByLabelText('Text preview')).toHaveTextContent('TEXT_B'));
    expect(screen.getByLabelText('Text preview')).not.toHaveTextContent('TEXT_A');
    expect(screen.queryByRole('heading', { name: 'notes.txt' })).not.toBeInTheDocument();
  });

  it('removes the displayed payload while the viewer exits', async () => {
    render(ArtifactPreviewTriggerHarness, { props: { block: TEXT_PREVIEW } });
    await fireEvent.click(screen.getByRole('button', { name: 'Open notes.txt' }));
    await screen.findByLabelText('Text preview');
    await fireEvent.click(screen.getByRole('button', { name: 'Close notes.txt viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('TEXT_A')).not.toBeInTheDocument();
  });
});
