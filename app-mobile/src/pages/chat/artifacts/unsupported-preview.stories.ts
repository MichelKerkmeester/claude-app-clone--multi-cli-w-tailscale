// ───────────────────────────────────────────────────────────────────
// MODULE: UNSUPPORTED PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import UnsupportedPreview from './unsupported-preview.svelte';
import { DEMO_ARTIFACT_BLOCKS } from '$shared/fixtures/demo.js';

// Reuse the frozen unsupported fixture so the notice exercises real renderer provenance.
// Display-name fallback text remains tied to that fixture.
const UNSUPPORTED_BLOCK = DEMO_ARTIFACT_BLOCKS.find((block) => block.renderer === 'unsupported');
if (UNSUPPORTED_BLOCK === undefined) {
  throw new Error('No unsupported fixture found in DEMO_ARTIFACT_BLOCKS.');
}

const meta: Meta<typeof UnsupportedPreview> = {
  title: 'Artifacts/UnsupportedPreview',
  component: UnsupportedPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof UnsupportedPreview>;

export default meta;
type Story = StoryObj<typeof UnsupportedPreview>;

export const Default: Story = { args: { renderer: UNSUPPORTED_BLOCK.renderer } };
export const WithDisplayName: Story = { args: { renderer: UNSUPPORTED_BLOCK.displayName } };
