// ───────────────────────────────────────────────────────────────────
// MODULE: ATTACHMENT RAIL STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentRail from './attachment-rail.svelte';
import AttachmentDraftProvider from './attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from './attachment-draft-story-host.svelte';

// Context-only rail via Provider > Host; staged files, not fabricated props.
const meta: Meta<typeof AttachmentRail> = {
  title: 'Attachments/AttachmentRail',
  component: AttachmentRail,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Reads staged photos from the attachment-draft context, whose draft is scoped to the active session; the provider parks and restores items as sessions change. If photo media is unavailable or the draft is empty, the rail renders nothing.',
      },
    },
  },
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
