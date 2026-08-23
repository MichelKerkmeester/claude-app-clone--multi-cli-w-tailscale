// ───────────────────────────────────────────────────────────────────
// MODULE: ATTACHMENT RAIL STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentRail from './attachment-rail.svelte';
import AttachmentDraftProvider from './attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from './attachment-draft-story-host.svelte';

// Exercise the context-only rail with a real provider and staged files rather than fabricated props.
// The decorator order keeps Provider > Host > rail, matching Storybook's outermost-last behavior.
const meta: Meta<typeof AttachmentRail> = {
  title: 'Attachments/AttachmentRail',
  component: AttachmentRail,
  tags: ['autodocs'],
  // Storybook applies the last decorator outermost, so the provider must be listed last.
  decorators: [
    () => ({ Component: AttachmentDraftStoryHost }),
    () => ({
      Component: AttachmentDraftProvider,
      props: { capability: { enabled: true, imageIn: true }, modelCanViewPhotos: true },
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof AttachmentRail>;

export const Default: Story = { args: {} };
