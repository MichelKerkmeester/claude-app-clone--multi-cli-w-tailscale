// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Preview Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AttachmentDraftProvider,
  useAttachmentDraft,
} from '../src/attachments/AttachmentDraftProvider.js';
import { AttachmentPreviewDialog } from '../src/attachments/AttachmentPreviewDialog.js';
import { AttachmentRail } from '../src/attachments/AttachmentRail.js';

afterEach(cleanup);

function PreviewHarness({ type = 'image/jpeg' }: { readonly type?: string }) {
  const draft = useAttachmentDraft();
  const file = new File(['image'], type === 'image/heic' ? 'camera.heic' : 'camera.jpg', { type });
  return (
    <>
      <button type="button" onClick={() => draft.selectFiles([file])}>
        select preview fixture
      </button>
      <button type="button" data-attachment-plus aria-label="Add photo">
        +
      </button>
      <AttachmentRail />
      <AttachmentPreviewDialog />
    </>
  );
}

function renderPreview(type?: string) {
  return render(
    <AttachmentDraftProvider capability={{ enabled: true, imageIn: true }}>
      <PreviewHarness type={type} />
    </AttachmentDraftProvider>,
  );
}

describe('AttachmentPreviewDialog', () => {
  it('uses the existing viewer shell, closes without discarding, and restores tile focus', async () => {
    const user = userEvent.setup();
    renderPreview();
    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    const tile = await screen.findByRole('button', { name: 'Preview Photo 1' });
    await user.click(tile);

    expect(await screen.findByRole('dialog', { name: 'Photo preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Photo 1' })).toHaveFocus();
    expect(document.querySelector('.attachment-preview-canvas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Photo 1' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Remove Photo 1' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Photo preview' })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Preview Photo 1' })).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute('data-attachment-plus');
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
