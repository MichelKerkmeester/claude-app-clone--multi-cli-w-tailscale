import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ArtifactViewerProvider,
  useArtifactViewer,
  type ArtifactViewerContextValue,
} from '../src/artifacts/ArtifactViewerProvider.js';
import { ArtifactCard } from '../src/artifacts/ArtifactCard.js';
import '../src/style.css';

import './artifact-history.test.js';

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
});
