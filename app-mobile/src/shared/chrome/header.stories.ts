// ───────────────────────────────────────────────────────────────────
// MODULE: HEADER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { ConnectionPhase } from '../state/state.js';
import type { ThemePreference } from '../format/view-helpers.js';
import Header from './header.svelte';

// Stories vary only `reviewAvailable`; handlers are no-ops.
const noop = (): void => {};
const onThemeChange = (_theme: ThemePreference): void => {};

const baseArgs = {
  connection: 'live' as ConnectionPhase,
  onHome: noop,
  onReview: noop,
  onInbox: noop,
  reviewAvailable: true,
  theme: 'system' as ThemePreference,
  onThemeChange,
};

const meta = {
  title: 'Views/Header',
  component: Header,
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { ...baseArgs, reviewAvailable: true },
};

export const NoReview: Story = {
  args: { ...baseArgs, reviewAvailable: false },
};
