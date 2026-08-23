// ───────────────────────────────────────────────────────────────────
// MODULE: TEXT PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import TextPreview from './text-preview.svelte';
import { DEMO_TEXT_CODE_SHARE_BLOCKS } from '$shared/fixtures/demo.js';

// Reuse frozen inline-text fixtures so ready and empty states exercise real content.
// Whitespace and Markdown remain explicit input boundaries.
function inlineText(mimeType: 'text/plain' | 'text/markdown'): string {
  const block = DEMO_TEXT_CODE_SHARE_BLOCKS.find((candidate) => candidate.mimeType === mimeType);
  if (block === undefined || block.content.kind !== 'inline-text') {
    throw new Error(`No inline-text ${mimeType} fixture found in DEMO_TEXT_CODE_SHARE_BLOCKS.`);
  }
  return block.content.text;
}

const READY_TEXT = inlineText('text/plain');
const MARKDOWN_TEXT = inlineText('text/markdown');

const meta: Meta<typeof TextPreview> = {
  title: 'Artifacts/TextPreview',
  component: TextPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof TextPreview>;

export default meta;
type Story = StoryObj<typeof TextPreview>;

export const Ready: Story = { args: { text: READY_TEXT } };
export const Empty: Story = { args: { text: '' } };
export const Whitespace: Story = { args: { text: '   \n  ' } };
export const Markdown: Story = { args: { text: MARKDOWN_TEXT } };
