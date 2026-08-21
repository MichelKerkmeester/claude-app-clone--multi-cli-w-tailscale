import type { Meta, StoryObj } from '@storybook/sveltekit';

import UnsupportedPreview from './UnsupportedPreview.svelte';
import { DEMO_ARTIFACT_BLOCKS } from '../../demo.js';

// Re-host the frozen DEMO_ARTIFACT_BLOCKS unsupported fixture so every story
// `renderer` arg is sourced from the real demo data — nothing is invented. The
// `unsupported-preview` surface renders the unavailable notice; Default passes
// the fixture's renderer ('unsupported') so the component's default message
// composes, and WithDisplayName passes the fixture's display name so the notice
// reads "<display name> previews are not available in this reader."
const UNSUPPORTED_BLOCK = DEMO_ARTIFACT_BLOCKS.find((block) => block.renderer === 'unsupported');
if (UNSUPPORTED_BLOCK === undefined) {
  throw new Error('No unsupported fixture found in DEMO_ARTIFACT_BLOCKS.');
}

const meta = {
  title: 'Artifacts/UnsupportedPreview',
  component: UnsupportedPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof UnsupportedPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { renderer: UNSUPPORTED_BLOCK.renderer } };
export const WithDisplayName: Story = { args: { renderer: UNSUPPORTED_BLOCK.displayName } };
