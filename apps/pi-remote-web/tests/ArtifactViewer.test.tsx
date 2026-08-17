import { sha256, type FileDiffBlock, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';

import {
  ArtifactViewerProvider,
  useArtifactViewer,
  type ArtifactViewerContextValue,
} from '../src/artifacts/ArtifactViewerProvider.js';
import { ArtifactCard } from '../src/artifacts/ArtifactCard.js';
import '../src/style.css';

import './artifact-history.test.js';
import './artifact-share.test.js';
import './useArtifactResource.test.js';

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

function ApiCapture({ onReady }: { readonly onReady: (api: ArtifactViewerContextValue) => void }) {
  const api = useArtifactViewer();
  onReady(api);
  return null;
}

function renderViewer(onReady?: (api: ArtifactViewerContextValue) => void) {
  return render(
    <ArtifactViewerProvider>
      <section aria-label="Typed transcript" tabIndex={-1}>
        <div className="transcript-scroll" style={{ height: 300, overflow: 'auto' }}>
          <ArtifactCard block={FIRST} />
          <ArtifactCard block={SECOND} />
        </div>
      </section>
      {onReady !== undefined && <ApiCapture onReady={onReady} />}
    </ArtifactViewerProvider>,
  );
}

function firstCard() {
  return screen.getByRole('button', { name: 'Open file diff: First redacted diff' });
}

function PreviewTrigger({ block }: { readonly block: FilePreviewBlock }) {
  const viewer = useArtifactViewer();
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={triggerRef}
      type="button"
      data-artifact-session-id="session_artifact_preview"
      onClick={() => viewer.openDiff(block as unknown as FileDiffBlock, triggerRef.current)}
    >
      Open {block.displayName}
    </button>
  );
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

async function openFirst(user: ReturnType<typeof userEvent.setup>) {
  const trigger = firstCard();
  await user.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'File diff viewer' });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'File diff' })).toHaveFocus());
  return { dialog, trigger };
}

describe('ArtifactViewer', () => {
  it('opens one labelled dialog, focuses the safe heading, and renders exact patch bytes', async () => {
    const user = userEvent.setup();
    renderViewer();

    const { dialog } = await openFirst(user);
    const patch = dialog.querySelector('.artifact-diff-preview');
    expect(patch).toBeInTheDocument();
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
    const user = userEvent.setup();
    renderViewer((value) => {
      api = value;
    });

    await openFirst(user);
    expect(Object.isFrozen(api?.preview?.source)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();
    expect(document.querySelector('.artifact-diff-preview')?.textContent).toBe(FIRST.patch);
  });

  it('restores transcript scroll and originating focus after Close', async () => {
    const user = userEvent.setup();
    renderViewer();
    const scroll = document.querySelector('.transcript-scroll');
    if (!(scroll instanceof HTMLElement)) throw new Error('transcript scroll missing');
    scroll.scrollTop = 137;

    const { trigger } = await openFirst(user);
    await user.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(scroll.scrollTop).toBe(137);
    expect(trigger).toHaveFocus();
  });

  it.each([
    ['Escape', async (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
    [
      'browser Back',
      async () => {
        act(() => window.dispatchEvent(new PopStateEvent('popstate')));
      },
    ],
  ] as const)('dismisses through %s without leaving the session', async (_label, dismiss) => {
    const user = userEvent.setup();
    renderViewer();
    const { trigger } = await openFirst(user);
    await dismiss(user);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.pathname).toBe('/');
    expect(trigger).toHaveFocus();
  });

  it('dismisses through an iOS edge-back gesture and a VoiceOver scrub', async () => {
    const user = userEvent.setup();
    renderViewer();
    const { dialog } = await openFirst(user);
    fireEvent.pointerDown(dialog, { pointerType: 'touch', clientX: 2, clientY: 180 });
    fireEvent.pointerUp(dialog, { pointerType: 'touch', clientX: 90, clientY: 184 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await openFirst(user);
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'outside session control';
    document.body.append(outside);
    act(() => outside.focus());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(firstCard()).toHaveFocus();
    outside.remove();
  });

  it('falls back to the transcript region when virtualization removes the trigger', async () => {
    const user = userEvent.setup();
    renderViewer();
    const { trigger } = await openFirst(user);
    trigger.remove();
    await user.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'Typed transcript' })).toHaveFocus();
  });

  it('replaces a source without allowing the first opening transition to commit', async () => {
    let api: ArtifactViewerContextValue | null = null;
    renderViewer((value) => {
      api = value;
    });
    const firstTrigger = firstCard();
    const secondTrigger = screen.getByRole('button', {
      name: 'Open file diff: Second redacted diff',
    });
    if (api === null) throw new Error('viewer API missing');

    act(() => {
      api?.openDiff(FIRST, firstTrigger);
      api?.openDiff(SECOND, secondTrigger);
    });
    await waitFor(() => {
      expect(document.querySelector('[data-artifact-state="ready-diff"]')).toBeInTheDocument();
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
    const user = userEvent.setup();
    render(
      <ArtifactViewerProvider>
        <PreviewTrigger block={STALE_ARTIFACT_PREVIEW} />
      </ArtifactViewerProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Open stale.txt' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'View latest' })).toBeInTheDocument(),
    );
    const firstRequest = fetchMock.mock.calls[0]?.[0];
    await user.click(screen.getByRole('button', { name: 'View latest' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Text preview')).toHaveTextContent('FRESH_AFTER_RETRY'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(firstRequest);
  });

  it('invalidates the opening transition when closed before it becomes ready', async () => {
    let api: ArtifactViewerContextValue | null = null;
    renderViewer((value) => {
      api = value;
    });
    const trigger = firstCard();
    if (api === null) throw new Error('viewer API missing');

    act(() => api?.openDiff(FIRST, trigger));
    expect(document.querySelector('[data-artifact-state="opening"]')).toBeInTheDocument();
    act(() => api?.close());
    expect(document.querySelector('[data-artifact-state="exiting"]')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('selects a descriptor renderer, exposes exact revision metadata, and copies displayed text', async () => {
    const writeText = vi.fn(async () => undefined);
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <ArtifactViewerProvider>
        <PreviewTrigger block={TEXT_PREVIEW} />
      </ArtifactViewerProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Open notes.txt' }));
    await screen.findByRole('heading', { name: 'notes.txt' });
    expect(screen.getByLabelText('Text preview')).toHaveTextContent('TEXT_A');
    expect(screen.getByText('Exact revision rev_text_preview_001')).toBeInTheDocument();
    expect(screen.queryByLabelText('Redacted file diff')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('TEXT_A'));
  });

  it('keeps replacement content out of the previous descriptor title and DOM payload', async () => {
    let api: ArtifactViewerContextValue | null = null;
    render(
      <ArtifactViewerProvider>
        <ApiCapture onReady={(value) => (api = value)} />
      </ArtifactViewerProvider>,
    );
    if (api === null) throw new Error('viewer API missing');
    act(() => {
      api?.openDiff(TEXT_PREVIEW as unknown as FileDiffBlock, null);
      api?.openDiff(SECOND_TEXT_PREVIEW as unknown as FileDiffBlock, null);
    });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'other.txt' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByLabelText('Text preview')).toHaveTextContent('TEXT_B'));
    expect(screen.getByLabelText('Text preview')).not.toHaveTextContent('TEXT_A');
    expect(screen.queryByRole('heading', { name: 'notes.txt' })).not.toBeInTheDocument();
  });

  it('removes the displayed payload while the viewer exits', async () => {
    const user = userEvent.setup();
    render(
      <ArtifactViewerProvider>
        <PreviewTrigger block={TEXT_PREVIEW} />
      </ArtifactViewerProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Open notes.txt' }));
    await screen.findByLabelText('Text preview');
    await user.click(screen.getByRole('button', { name: 'Close notes.txt viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('TEXT_A')).not.toBeInTheDocument();
  });
});
