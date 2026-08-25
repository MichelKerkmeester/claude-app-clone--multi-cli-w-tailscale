// ───────────────────────────────────────────────────────────────────
// MODULE: CODE PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CodePreview from './code-preview.svelte';
import { DEMO_TEXT_CODE_SHARE_BLOCKS } from '$shared/fixtures/demo.js';

// Frozen inline-text fixture for highlight, wrap, live-edge, and language provenance.
const CODE_BLOCK = DEMO_TEXT_CODE_SHARE_BLOCKS.find((block) => block.renderer === 'code');
if (CODE_BLOCK === undefined || CODE_BLOCK.content.kind !== 'inline-text') {
  throw new Error('No inline-text code fixture found in DEMO_TEXT_CODE_SHARE_BLOCKS.');
}
const CODE_TEXT = CODE_BLOCK.content.text;
const CODE_LANGUAGE = CODE_BLOCK.language ?? 'typescript';

const meta: Meta<typeof CodePreview> = {
  title: 'Artifacts/CodePreview',
  component: CodePreview,
  tags: ['autodocs'],
} satisfies Meta<typeof CodePreview>;

export default meta;
type Story = StoryObj<typeof CodePreview>;

export const Highlight: Story = {
  args: { text: CODE_TEXT, language: CODE_LANGUAGE, ariaLabel: 'Code preview' },
};
export const Wrapped: Story = {
  args: { text: CODE_TEXT, language: CODE_LANGUAGE, wrap: true },
};
export const FollowTail: Story = {
  args: { text: CODE_TEXT, language: CODE_LANGUAGE, followTail: true },
};
