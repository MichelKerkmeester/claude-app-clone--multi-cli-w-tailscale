// ───────────────────────────────────────────────────────────────────
// MODULE: ATTACHMENT PREVIEW DIALOG STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentPreviewDialog from './dialog-attachment-preview.svelte';
import AttachmentDraftProvider from './attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from './attachment-draft-story-host.svelte';

// Exercise the context-only dialog with a media-capable provider and an open staged preview.
// The decorator order keeps Provider > Host > dialog, and the pixel bytes remain UI scaffolding.
const meta: Meta<typeof AttachmentPreviewDialog> = {
  title: 'Attachments/AttachmentPreviewDialog',
  component: AttachmentPreviewDialog,
  tags: ['autodocs'],
  // Storybook applies the last decorator outermost, so the provider must be listed last.
  decorators: [
    () => ({ Component: AttachmentDraftStoryHost, props: { openPreview: true } }),
    () => ({
      Component: AttachmentDraftProvider,
      props: { capability: { enabled: true, imageIn: true }, modelCanViewPhotos: true },
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof AttachmentPreviewDialog>;

export const Open: Story = { args: {} };
