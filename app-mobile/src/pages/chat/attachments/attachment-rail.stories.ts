import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentRail from './attachment-rail.svelte';
import AttachmentDraftProvider from './attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from './attachment-draft-story-host.svelte';

// Context-only smoke story: AttachmentRail declares no props — everything
// arrives through getAttachmentDraft(), and the rail renders nothing unless a
// provider above it reports mediaAvailable AND has staged items. The
// decorator chain supplies both: AttachmentDraftProvider with a photos-enabled
// capability ({ enabled, imageIn } — the fields capabilityAllowsPhotos checks)
// wraps AttachmentDraftStoryHost, which seeds two real 1x1 transparent-pixel
// PNG Files through draft.selectFiles on mount (SessionComposer.stories /
// ArtifactCard.stories self-providing-provider pattern). The pixel bytes are
// UI scaffolding, not fabricated app data.
const meta: Meta<typeof AttachmentRail> = {
  title: 'Attachments/AttachmentRail',
  component: AttachmentRail,
  tags: ['autodocs'],
  // Storybook wraps with the LAST decorator outermost, so the Provider is listed
  // last: Provider > Host > rail.
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
