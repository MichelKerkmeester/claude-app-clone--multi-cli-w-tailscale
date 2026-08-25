// ───────────────────────────────────────────────────────────────────
// MODULE: ATTACHMENT PREVIEW DIALOG STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentPreviewDialog from './dialog-attachment-preview.svelte';
import AttachmentDraftProvider from './attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from './attachment-draft-story-host.svelte';

// Context-only dialog via Provider > Host; pixel bytes are UI scaffolding.
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
