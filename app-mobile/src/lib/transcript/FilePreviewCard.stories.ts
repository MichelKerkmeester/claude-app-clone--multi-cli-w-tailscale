import type { Meta, StoryObj } from '@storybook/sveltekit';

import FilePreviewCard from './FilePreviewCard.svelte';
import ArtifactViewerProvider from '../artifacts/ArtifactViewerProvider.svelte';
import { DEMO_ARTIFACT_BLOCKS } from '../../demo.js';

// Re-host the frozen DEMO_ARTIFACT_BLOCKS fixtures so every story `block` arg is a
// real FilePreviewBlock sourced from the demo data — nothing is invented. The
// `transcript` surface declares the `block-delivery` state; FilePreviewCard renders
// the read-only preview card across every availability. FilePreviewCard reads the
// ArtifactViewer context via getOptionalArtifactViewer, so the self-providing
// ArtifactViewerProvider supplies it as a Storybook decorator (same form as
// RichContentRouter.stories).
const SESSION_ID = 'demo-session-triage';

const meta = {
  title: 'Transcript/FilePreviewCard',
  component: FilePreviewCard,
  tags: ['autodocs'],
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
