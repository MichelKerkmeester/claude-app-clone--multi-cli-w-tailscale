import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactViewerProvider, useArtifactViewer } from '../src/artifacts/ArtifactViewerProvider.js';
import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

const DIFF: FileDiffBlock = {
  id: 'block_phase_viewer_interaction',
  revision: 3,
  seq: 4,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_diff',
  summary: 'Interaction diff',
  patch: '@@ interaction\n-old\n+new',
};

function Harness() {
  const viewer = useArtifactViewer();
  return (
    <>
      <textarea className="composer-input" aria-label="Message Pi" />
      <button
        type="button"
        onClick={(event) => viewer.openDiff(DIFF, event.currentTarget)}
      >
        Open interaction diff
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-artifact-viewer-open');
  document.getElementById('artifact-viewer-privacy-curtain')?.remove();
});

describe('viewer interaction ownership', () => {
  it('blurs the composer, focuses the heading, and restores scroll and trigger focus', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(
      <ArtifactViewerProvider>
        <section aria-label="Typed transcript" tabIndex={-1}>
          <div className="transcript-scroll">
            <Harness />
          </div>
        </section>
      </ArtifactViewerProvider>,
    );
    const scroll = document.querySelector<HTMLElement>('.transcript-scroll');
    const composer = screen.getByRole('textbox', { name: 'Message Pi' });
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    if (scroll === null) throw new Error('scroll container missing');
    scroll.scrollTop = 88;
    scroll.scrollLeft = 12;
    composer.focus();

    fireEvent.click(trigger);
    const heading = await screen.findByRole('heading', { name: 'File diff' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(document.documentElement.dataset.artifactViewerOpen).toBe('true');
    expect(composer).not.toHaveFocus();
    expect(window.history.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(historyBack).toHaveBeenCalledOnce();
    expect(scroll.scrollTop).toBe(88);
    expect(scroll.scrollLeft).toBe(12);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from Escape and returns focus to the originating control', async () => {
    render(
      <ArtifactViewerProvider>
        <Harness />
      </ArtifactViewerProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps an image pan gesture from becoming an edge-back gesture after zooming', async () => {
    render(
      <ArtifactViewerProvider>
        <Harness />
      </ArtifactViewerProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(document.querySelector('.artifact-viewer-overlay')).toHaveAttribute(
        'data-artifact-state',
        'ready-diff',
      ),
    );
    expect(screen.queryByRole('group', { name: 'Image zoom and pan surface' })).toBeNull();
  });
});
