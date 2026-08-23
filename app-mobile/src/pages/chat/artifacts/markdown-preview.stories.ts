// ───────────────────────────────────────────────────────────────────
// MODULE: MARKDOWN PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import MarkdownPreview from './markdown-preview.svelte';
import { DEMO_TEXT_CODE_SHARE_BLOCKS } from '$shared/fixtures/demo.js';

// Reuse the frozen inline-text fixture so the bounded renderer exercises real content.
// Empty, whitespace, and find states remain explicit input boundaries.
const MARKDOWN_BLOCK = DEMO_TEXT_CODE_SHARE_BLOCKS.find(
  (block) => block.mimeType === 'text/markdown',
);
if (MARKDOWN_BLOCK === undefined || MARKDOWN_BLOCK.content.kind !== 'inline-text') {
  throw new Error('No inline-text markdown fixture found in DEMO_TEXT_CODE_SHARE_BLOCKS.');
}
const MARKDOWN_TEXT = MARKDOWN_BLOCK.content.text;
const FIND_TERM = 'sanitized';

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Artifacts/MarkdownPreview',
  component: MarkdownPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof MarkdownPreview>;

export default meta;
type Story = StoryObj<typeof MarkdownPreview>;

export const Ready: Story = { args: { text: MARKDOWN_TEXT } };
export const Empty: Story = { args: { text: '' } };
export const Whitespace: Story = { args: { text: '   \n  ' } };
export const FindMatch: Story = { args: { text: MARKDOWN_TEXT, findTerm: FIND_TERM } };
