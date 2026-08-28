import { readFileSync } from 'node:fs';

// ───────────────────────────────────────────────────────────────────
// MODULE: In-App Link Overlay Tests
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import InAppLinkOverlay from '../src/pages/chat/artifacts/in-app-link-overlay.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. TESTS
// ───────────────────────────────────────────────────────────────────

describe('InAppLinkOverlay', () => {
  it('opens a framed overlay for an http(s) url and dismisses it', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('a');
    opener.href = 'https://example.com/docs';
    opener.textContent = 'docs';
    document.body.append(opener);
    opener.focus();

    const { container } = render(InAppLinkOverlay, {
      props: { url: 'https://example.com/docs', restoreFocusTo: opener, onClose },
    });

    const dialog = screen.getByRole('dialog', { name: 'In-app link' });
    expect(dialog).toBeInTheDocument();
    const frame = container.querySelector('iframe.in-app-link--frame');
    expect(frame).toHaveAttribute('src', 'https://example.com/docs');
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(frame?.getAttribute('sandbox') ?? '').not.toContain('allow-top-navigation');
    expect(frame?.getAttribute('sandbox') ?? '').not.toContain('allow-same-origin');

    await fireEvent.click(screen.getByRole('button', { name: 'Close in-app link' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    opener.remove();
  });

  it('never frames a rejected scheme', () => {
    const onClose = vi.fn();
    const { container } = render(InAppLinkOverlay, {
      props: { url: 'javascript:alert(1)', onClose },
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the frame inside the focus trap and closes from outside the dialog', async () => {
    const onClose = vi.fn();
    render(InAppLinkOverlay, { props: { url: 'https://example.com/doc', onClose } });

    // The frame is a real tab stop: leaving it out of the trap makes the close
    // button both first and last, so the boundary check never fires and Tab
    // walks out of the dialog into the chat behind it.
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('iframe')).not.toBeNull();

    // Assert the component's OWN trap selector, not a copy of it: a test that
    // re-declares the selector passes no matter what the component uses.
    const source = readFileSync(
      'app-mobile/src/pages/chat/artifacts/in-app-link-overlay.svelte',
      'utf8',
    );
    const selector = source.match(/FOCUS_TRAP_SELECTOR\s*=\s*\n?\s*'([^']+)'/u)?.[1] ?? '';
    expect(selector).toContain('iframe');
    expect(dialog.querySelectorAll(selector).length).toBeGreaterThan(1);

    // Escape works from document scope, not only from the dialog subtree.
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
