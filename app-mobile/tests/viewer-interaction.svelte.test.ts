// Port of app-mobile/tests/viewer-interaction.test.tsx (React behavior oracle)
// to @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle; the Svelte viewer opens via the
// real getArtifactViewer() context (ViewerInteractionHarness), and timing-
// sensitive focus/scroll restoration is awaited with waitFor because the
// Svelte phase machine schedules the opening/exit/focus transitions on
// setTimeout(0) (matching the React act() flush semantics).

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

import ViewerInteractionHarness from './support/ViewerInteractionHarness.svelte';

const DIFF: FileDiffBlock = {
  id: 'block_phase_viewer_interaction',
  revision: 3,
  seq: 4,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_diff',
  summary: 'Interaction diff',
  patch: '@@ interaction\n-old\n+new',
};

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-artifact-viewer-open');
  document.getElementById('artifact-viewer-privacy-curtain')?.remove();
});

describe('viewer interaction ownership', () => {
  it('blurs the composer, focuses the heading, and restores scroll and trigger focus', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    render(ViewerInteractionHarness, { props: { block: DIFF } });
    const scroll = document.querySelector<HTMLElement>('.transcript-scroll');
    const composer = screen.getByRole('textbox', { name: 'Message Pi' });
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    if (scroll === null) throw new Error('scroll container missing');
    scroll.scrollTop = 88;
    scroll.scrollLeft = 12;
    composer.focus();

    await fireEvent.click(trigger);
    const heading = await screen.findByRole('heading', { name: 'File diff' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(document.documentElement.dataset.artifactViewerOpen).toBe('true');
    expect(composer).not.toHaveFocus();
    expect(window.history.length).toBeGreaterThan(0);

    await fireEvent.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(historyBack).toHaveBeenCalledOnce();
    expect(scroll.scrollTop).toBe(88);
    expect(scroll.scrollLeft).toBe(12);
    // Focus restoration runs in a post-teardown macrotask (restorePreview's
    // setTimeout), so await it rather than asserting synchronously.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes from Escape and returns focus to the originating control', async () => {
    render(ViewerInteractionHarness, { props: { block: DIFF, bare: true } });
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    await fireEvent.click(trigger);
    await screen.findByRole('dialog');
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('keeps an image pan gesture from becoming an edge-back gesture after zooming', async () => {
    render(ViewerInteractionHarness, { props: { block: DIFF, bare: true } });
    const trigger = screen.getByRole('button', { name: 'Open interaction diff' });
    await fireEvent.click(trigger);
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(document.querySelector('.artifact-viewer-overlay')).toHaveAttribute(
        'data-artifact-state',
        'ready-diff',
      ),
    );
    // The diff viewer renders no image zoom/pan surface, so the pointer-drag pan
    // gesture cannot be confused with an edge-back swipe.
    expect(screen.queryByRole('group', { name: 'Image zoom and pan surface' })).toBeNull();
  });
});
