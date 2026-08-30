// ───────────────────────────────────────────────────────────────────
// MODULE: USAGE SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import UsageSheet from './usage-sheet.svelte';
import type { AccountUsagePayload } from '$shared/format/usage-format.js';

const NOW = Date.parse('2026-08-18T10:00:00.000Z');
const noop = (): void => {};

const MIXED_USAGE: AccountUsagePayload = {
  windows: [
    {
      id: 'five-hour-window',
      label: '5-hour window',
      isActive: true,
      poll: 'success',
      current: {
        usedPercent: 62,
        resetsAt: NOW + 2 * 60 * 60 * 1000,
        observedAt: NOW - 5 * 60 * 1000,
        severity: 'warning',
      },
      lastGood: null,
      rateLimitedAt: null,
    },
    {
      id: 'weekly-window',
      label: 'Weekly window',
      poll: 'failed',
      current: null,
      lastGood: {
        usedPercent: 38,
        resetsAt: NOW + 3 * 24 * 60 * 60 * 1000,
        observedAt: NOW - 10 * 60 * 1000,
        severity: 'normal',
      },
      rateLimitedAt: null,
    },
    {
      id: 'monthly-window',
      label: 'Monthly window',
      poll: 'loading',
      current: null,
      lastGood: null,
      rateLimitedAt: null,
    },
    {
      id: 'team-window',
      label: 'Team allowance',
      poll: 'unavailable',
      current: null,
      lastGood: null,
      rateLimitedAt: null,
    },
  ],
};

const meta = {
  title: 'Views/UsageSheet',
  component: UsageSheet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The sheet opens only for a usage payload with exactly one host-marked gating window; missing or ambiguous gating data leaves it closed even when requested open. Each window preserves loading, unavailable, current, stale, or expired states instead of turning missing readings into a zero meter.',
      },
    },
  },
} satisfies Meta<typeof UsageSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedStates: Story = {
  args: {
    usage: MIXED_USAGE,
    open: true,
    now: NOW,
    onClose: noop,
  },
};
