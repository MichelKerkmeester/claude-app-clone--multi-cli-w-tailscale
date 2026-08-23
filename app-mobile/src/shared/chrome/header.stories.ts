import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { ConnectionPhase } from '../data/state.js';
import type { ThemePreference } from '../data/view-helpers.js';
import Header from './header.svelte';

// The topbar over the real StatusPill + ThemeControl children; connection and
// theme are real state values, handlers are no-op arrows. The two stories vary
// only reviewAvailable, which gates the Inbox / Review nav buttons.
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
