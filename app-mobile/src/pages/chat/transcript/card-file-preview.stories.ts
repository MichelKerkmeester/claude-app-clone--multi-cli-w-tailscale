import type { Meta, StoryObj } from '@storybook/sveltekit';

import FilePreviewCard from './card-file-preview.svelte';
import ArtifactViewerProvider from '../artifacts/artifact-viewer-provider.svelte';
import { DEMO_ARTIFACT_BLOCKS } from '$shared/fixtures/demo.js';

const SESSION_ID = 'demo-session-triage';

const meta = {
  title: 'Transcript/FilePreviewCard',
  component: FilePreviewCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The availability badge is resolved from the relay’s explicit preview state, with safe legacy inference when that state is absent. If the artifact-viewer capability is missing, the card remains readable but its Open action has no effect; at 24rem and below, the trailing Open label is removed to preserve the card layout.',
      },
    },
  },
  decorators: [() => ({ Component: ArtifactViewerProvider })],
} satisfies Meta<typeof FilePreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { args: { block: DEMO_ARTIFACT_BLOCKS[0]!, sessionId: SESSION_ID } };
export const Withheld: Story = { args: { block: DEMO_ARTIFACT_BLOCKS[1]!, sessionId: SESSION_ID } };
export const Missing: Story = { args: { block: DEMO_ARTIFACT_BLOCKS[2]!, sessionId: SESSION_ID } };
export const Denied: Story = { args: { block: DEMO_ARTIFACT_BLOCKS[3]!, sessionId: SESSION_ID } };
export const Unsupported: Story = {
  args: { block: DEMO_ARTIFACT_BLOCKS[4]!, sessionId: SESSION_ID },
};
