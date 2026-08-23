import type { Meta, StoryObj } from '@storybook/sveltekit';

import MarkdownPreview from './MarkdownPreview.svelte';
import { DEMO_TEXT_CODE_SHARE_BLOCKS } from '$shared/fixtures/demo.js';

// Re-host the frozen DEMO_TEXT_CODE_SHARE_BLOCKS markdown fixture so every story
// `text` arg is sourced from the real inline-text markdown demo block — nothing
// is invented. The bounded safe-Markdown renderer renders the fixture's headings,
// strong/emphasis, fenced code, and inert link/image spans; the Empty/Whitespace
// states swap the read content, and FindMatch adds a find term hitting a real line.
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
