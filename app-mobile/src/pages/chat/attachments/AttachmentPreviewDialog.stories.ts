import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentPreviewDialog from './AttachmentPreviewDialog.svelte';
import AttachmentDraftProvider from './AttachmentDraftProvider.svelte';
import AttachmentDraftStoryHost from './AttachmentDraftStoryHost.svelte';

// Context-only smoke story: AttachmentPreviewDialog declares no props — it
// reads the draft through getAttachmentDraft() and renders nothing unless a
// provider above it is media-capable AND state.previewId matches a staged
// item. The decorator chain supplies both: AttachmentDraftProvider with a
// photos-enabled capability ({ enabled, imageIn } — the fields
// capabilityAllowsPhotos checks) wraps AttachmentDraftStoryHost with
// openPreview: true, which seeds two real 1x1 transparent-pixel PNG Files via
// draft.selectFiles and then opens the first item's preview (the
// SessionComposer.stories / ArtifactCard.stories self-providing-provider
// pattern). The pixel bytes are UI scaffolding, not fabricated app data.
const meta: Meta<typeof AttachmentPreviewDialog> = {
  title: 'Attachments/AttachmentPreviewDialog',
  component: AttachmentPreviewDialog,
  tags: ['autodocs'],
  // Storybook wraps with the LAST decorator outermost, so the Provider is listed
  // last: Provider > Host > dialog.
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
