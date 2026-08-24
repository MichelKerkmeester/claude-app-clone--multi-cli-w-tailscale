// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Preview Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────

// Ports app-mobile/tests/AttachmentPreviewDialog.test.tsx (React behavior
// oracle) to @testing-library/svelte. The React *.test.tsx oracle is NEVER
// modified.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import AttachmentDraftProviderHarness from './support/AttachmentDraftProviderHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(cleanup);

function renderPreview(type?: string) {
  return render(AttachmentDraftProviderHarness, {
    props: { capability: { enabled: true, imageIn: true }, mode: 'preview', fileType: type },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('AttachmentPreviewDialog', () => {
  it('uses the existing viewer shell, closes without discarding, and restores tile focus', async () => {
    const user = userEvent.setup();
    renderPreview();
    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    const tile = await screen.findByRole('button', { name: 'Preview Photo 1' });
    await user.click(tile);

    const dialog = await screen.findByRole('dialog', { name: 'Photo preview' });
    expect(dialog).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Photo 1' })).toHaveFocus(),
    );
    expect(document.querySelector('.attachment-preview-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close preview' })).toBeInTheDocument();
    // react-aria's Modal sandbox aria-hides the rail so the React oracle's
    // global getByRole('Remove Photo 1') resolves to the dialog's control
    // alone; the Svelte dialog has no sandbox, so scope to the dialog to
    // preserve the same assertion (the dialog owns the remove control).
    expect(within(dialog).getByRole('button', { name: 'Remove Photo 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download|share/u })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close preview' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Photo preview' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(tile));
    expect(screen.getByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
  });

  it('removes from the preview and restores focus to the next available control', async () => {
    const user = userEvent.setup();
    renderPreview();
    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    await user.click(await screen.findByRole('button', { name: 'Preview Photo 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Photo preview' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove Photo 1' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Photo preview' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Preview Photo 1' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute('data-attachment-plus'),
    );
  });

  it('keeps an HEIC draft item valid and says preview unavailable without conversion', async () => {
    const user = userEvent.setup();
    renderPreview('image/heic');
    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    await user.click(await screen.findByRole('button', { name: 'Preview Photo 1' }));

    expect(screen.getByRole('status')).toHaveTextContent('Photo · preview unavailable');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.getByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
  });

  it('Escape closes the preview but does not discard the local draft', async () => {
    const user = userEvent.setup();
    renderPreview();
    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    await user.click(await screen.findByRole('button', { name: 'Preview Photo 1' }));
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Photo preview' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
  });
});
