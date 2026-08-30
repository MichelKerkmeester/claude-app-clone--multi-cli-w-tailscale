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
  parameters: {
    docs: {
      description: {
        component:
          'Review and Inbox navigation are omitted together when the host marks review unavailable. At widths of 52rem and below, the wordmark subtitle and connection pill are hidden and the theme labels become icons; at 39rem and below, the remaining navigation buttons use tighter spacing.',
      },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { ...baseArgs, reviewAvailable: true },
};

export const NoReview: Story = {
  args: { ...baseArgs, reviewAvailable: false },
};
