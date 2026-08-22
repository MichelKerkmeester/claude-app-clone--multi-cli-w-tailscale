import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

import AttachmentDraftProviderHarness from './support/AttachmentDraftProviderHarness.svelte';
import ArtifactViewerCardsHarness from './support/ArtifactViewerCardsHarness.svelte';

afterEach(cleanup);
afterEach(() => {
  document.body.style.cssText = '';
});

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

describe('dialog ariaHideOutside behavior', () => {
  it('hides the attachment tile from the accessibility tree while the photo preview is open', async () => {
    const user = userEvent.setup();
    render(AttachmentDraftProviderHarness, {
      props: { capability: { enabled: true, imageIn: true }, mode: 'preview' },
    });

    await user.click(screen.getByRole('button', { name: 'select preview fixture' }));
    const background = await screen.findByRole('button', { name: 'Preview Photo 1' });
    expect(background).toBeInTheDocument();
    await user.click(background);

    const dialog = await screen.findByRole('dialog', { name: 'Photo preview' });
    expect(screen.queryByRole('button', { name: 'Preview Photo 1' })).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Close preview' }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close preview' }));
    expect(await screen.findByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
  });

  it('hides the artifact card from the accessibility tree while the file viewer is open', async () => {
    const user = userEvent.setup();
    render(ArtifactViewerCardsHarness, { props: { first: FIRST, second: SECOND } });

    const background = await screen.findByRole('button', {
      name: 'Open file diff: First redacted diff',
    });
    expect(background).toBeInTheDocument();
    await user.click(background);

    const dialog = await screen.findByRole('dialog', { name: 'File diff viewer' });
    expect(
      screen.queryByRole('button', { name: 'Open file diff: First redacted diff' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Close file diff viewer' }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close file diff viewer' }));
    expect(
      await screen.findByRole('button', { name: 'Open file diff: First redacted diff' }),
    ).toBeInTheDocument();
  });
});
