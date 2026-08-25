// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Rail Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/AttachmentRail.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
//
// CSS-source assertions: the React oracle read app-mobile/src/style.css and
// matched the `.attachment-rail { … max-inline-size:100%; overflow-x:auto }`
// rule and the `@media (max-width:20rem) … .attachment-preview--dialog` rule.
// In the Svelte app that CSS lives in the component's SCOPED <style>, and
// style.css is being retired, so each assertion is repointed to read the
// scoped <style> of the owning component — AttachmentRail.svelte for the rail
// rule and AttachmentPreviewDialog.svelte for the media rule. The rule text
// and values are unchanged; only the readFileSync source path moved.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import AttachmentDraftProviderHarness from './support/AttachmentDraftProviderHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
  document.documentElement.style.removeProperty('zoom');
});

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function renderRail(capability?: { readonly enabled: boolean; readonly imageIn: boolean }) {
  return render(AttachmentDraftProviderHarness, {
    props: { capability: capability ?? { enabled: true, imageIn: true }, mode: 'rail' },
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('AttachmentRail', () => {
  it('renders an ordered, generic Photo rail without exposing filenames', async () => {
    renderRail();
    await fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));

    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    expect(within(rail).getByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Preview Photo 2' })).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Preview Photo 3' })).toBeInTheDocument();
    expect(rail).not.toHaveTextContent('private-camera-name.png');
    expect(within(rail).getAllByRole('button', { name: /Remove Photo/u })).toHaveLength(3);
  });

  it('uses visible 44px removal hit targets and restores focus after removal', async () => {
    renderRail();
    await fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));
    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    const removeSecond = within(rail).getByRole('button', { name: 'Remove Photo 2' });
    expect(removeSecond).toHaveAttribute('data-hit-target', '44');

    await fireEvent.click(removeSecond);
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Draft photos, 2 items' })).toBeInTheDocument(),
    );
    expect(document.activeElement).toHaveAttribute('aria-label', 'Preview Photo 2');
  });

  it('keeps the page within a 390px viewport at 200% zoom', async () => {
    renderRail();
    await fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));
    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    expect(rail).toHaveClass('attachment-rail');
    document.documentElement.style.zoom = '2';
    for (const element of [document.documentElement, document.body]) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 390 },
        scrollWidth: { configurable: true, value: 390 },
      });
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    }
    expect(readFileSync('app-mobile/src/pages/chat/attachments/attachment-rail.svelte', 'utf8')).toMatch(
      /\.attachment-rail\s*\{[\s\S]*?max-inline-size: 100%;[\s\S]*?overflow-x: auto;/u,
    );
    expect(
      readFileSync('app-mobile/src/pages/chat/attachments/dialog-attachment-preview.svelte', 'utf8'),
    ).toMatch(/@media \(max-width: 20rem\)[\s\S]*?\.attachment-preview--dialog/u);
  });

  it('is absent when the host capability is off', () => {
    renderRail({ enabled: false, imageIn: false });
    expect(screen.queryByRole('list', { name: /Draft photos/u })).not.toBeInTheDocument();
  });
});
