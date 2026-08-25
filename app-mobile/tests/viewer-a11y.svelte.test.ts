// ───────────────────────────────────────────────────────────────────
// MODULE: VIEWER A11Y TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ArtifactViewerHarness from './support/ArtifactViewerHarness.svelte';

// Focus-trap, dismissal, and DOM-nesting contract for the migrated viewer.
// This is the machine-checked parity the react-aria -> Bits Dialog port must
// hold: token-identity and CDP cannot see focus order or dismissal, so these
// assertions are the acceptance authority for the modal's behaviour.

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-artifact-viewer-open');
  document.getElementById('artifact-viewer--privacy-curtain')?.remove();
});

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

async function openViewer(): Promise<HTMLButtonElement> {
  const trigger = screen.getByRole('button', { name: 'Open a11y diff' });
  await fireEvent.click(trigger);
  await screen.findByRole('dialog', { name: 'File diff viewer' });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'File diff' })).toHaveFocus());
  return trigger as HTMLButtonElement;
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('artifact viewer a11y contract', () => {
  it('opens a labelled dialog, focuses the heading, nests overlay > modal > dialog', async () => {
    render(ArtifactViewerHarness);
    await openViewer();
    const overlay = document.querySelector('.artifact-viewer--overlay');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveAttribute('data-artifact-state', 'ready-diff');
    // The CSS depends on this exact nesting (e.g. the privacy-covered selector).
    expect(overlay?.querySelector('.artifact-viewer--modal .artifact-viewer--dialog')).not.toBeNull();
    expect(document.documentElement.dataset.artifactViewerOpen).toBe('true');
    expect(screen.getByRole('status')).toHaveTextContent('Redacted file diff ready.');
    expect(document.querySelector('.artifact-diff--preview')?.textContent).toBe('@@ a11y\n-old\n+new');
  });

  it('closes via the Close button, restoring transcript scroll and trigger focus', async () => {
    render(ArtifactViewerHarness);
    const scroll = document.querySelector<HTMLElement>('.transcript--scroll');
    if (scroll === null) throw new Error('transcript scroll missing');
    scroll.scrollTop = 137;
    const trigger = await openViewer();
    await fireEvent.click(screen.getByRole('button', { name: 'Close file diff viewer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(scroll.scrollTop).toBe(137);
    // Focus restoration runs in a post-teardown macrotask (restorePreview's setTimeout),
    // so await it rather than asserting synchronously the instant the dialog is gone.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('dismisses on Escape and returns focus to the trigger', async () => {
    render(ArtifactViewerHarness);
    const trigger = await openViewer();
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('dismisses on browser Back (popstate) without leaving the route', async () => {
    render(ArtifactViewerHarness);
    await openViewer();
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.pathname).toBe('/');
  });

  it('dismisses on an iOS edge-back swipe from the left edge', async () => {
    render(ArtifactViewerHarness);
    await openViewer();
    const dialog = screen.getByRole('dialog');
    await fireEvent.pointerDown(dialog, { pointerType: 'touch', clientX: 2, clientY: 180 });
    await fireEvent.pointerUp(dialog, { pointerType: 'touch', clientX: 90, clientY: 184 });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('dismisses on a VoiceOver focus scrub outside the dialog', async () => {
    render(ArtifactViewerHarness);
    const trigger = await openViewer();
    const outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'outside session control';
    document.body.append(outside);
    outside.focus();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    outside.remove();
  });
});
