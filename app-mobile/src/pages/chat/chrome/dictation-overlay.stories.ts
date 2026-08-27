// ───────────────────────────────────────────────────────────────────
// MODULE: DICTATION OVERLAY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import DictationOverlay from './dictation-overlay.svelte';

const noop = (): void => {};
const setPrompt = (): void => {};

const meta = {
  title: 'Chrome/DictationOverlay',
  component: DictationOverlay,
  tags: ['autodocs'],
} satisfies Meta<typeof DictationOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

// The batch-capture dictation overlay. Without a browser speech engine it
// fails closed to a clear "not supported" message rather than a dead surface —
// which is the state a headless render shows.
export const Open: Story = {
  args: {
    isOpen: true,
    mode: 'toggle',
    sessionId: 'demo-session',
    lang: 'auto',
    setPrompt,
    onClose: noop,
  },
};
