// ───────────────────────────────────────────────────────────────────
// MODULE: DICTATION SETUP SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import DictationSheet from './sheet-dictation.svelte';

const noop = (): void => {};

const meta = {
  title: 'Chrome/DictationSheet',
  component: DictationSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof DictationSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  isOpen: true,
  onOpenChange: noop,
  onToggleEnabled: noop,
  onLangChange: noop,
  lang: 'auto',
  engineMessage: '',
} as const;

// Fail-closed setup surface for on-device dictation. Available = the engine is
// ready; Unavailable = the browser has no speech engine, shown as a reason, not a dead mic.
export const Available: Story = {
  args: { ...baseArgs, engineStatus: 'available', dictationEnabled: true },
};

export const Unavailable: Story = {
  args: {
    ...baseArgs,
    engineStatus: 'unavailable',
    dictationEnabled: false,
    engineMessage: 'Dictation is not available in this browser.',
  },
};
