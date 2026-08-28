// ───────────────────────────────────────────────────────────────────
// MODULE: QUICK PROMPTS SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import QuickPromptsSheet from './sheet-quick-prompts.svelte';
import { QUICK_PROMPTS_STORAGE_KEY } from '$shared/commands/insert-slash-command.js';

const noop = (): void => {};
const setPrompt = (updater: (current: string) => string): void => {
  void updater;
};

const SAVED_PROMPTS = [
  {
    label: 'Summarize the latest relay errors',
    prompt: 'Summarize the latest relay errors and group them by likely cause.',
  },
  {
    label: 'Review this change for mobile regressions',
    prompt: 'Review this change for mobile regressions, with attention to loading and offline states.',
  },
  {
    label: 'Draft a concise release note',
    prompt: 'Draft a concise release note that names the user-visible behavior and verification status.',
  },
] as const;

function seedPrompts(prompts: readonly typeof SAVED_PROMPTS[number][]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUICK_PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
}

function clearPrompts(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QUICK_PROMPTS_STORAGE_KEY);
}

const meta: Meta<typeof QuickPromptsSheet> = {
  title: 'Chrome/QuickPromptsSheet',
  component: QuickPromptsSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof QuickPromptsSheet>;

export default meta;
type Story = StoryObj<typeof QuickPromptsSheet>;

export const Populated: Story = {
  args: {
    isOpen: true,
    onOpenChange: noop,
    setPrompt,
  },
  render: (args) => {
    seedPrompts(SAVED_PROMPTS);
    return { Component: QuickPromptsSheet, props: args };
  },
};

export const Empty: Story = {
  args: {
    isOpen: true,
    onOpenChange: noop,
    setPrompt,
  },
  render: (args) => {
    clearPrompts();
    return { Component: QuickPromptsSheet, props: args };
  },
};
