// ───────────────────────────────────────────────────────────────────
// MODULE: LEAVE PLAN SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import LeavePlanSheet from './sheet-leave-plan.svelte';

// Sheet stays open to exercise portal + callbacks.
const noop = (): void => {};

const baseArgs = {
  isOpen: true,
  onOpenChange: noop,
  onSwitchToBuild: noop,
};

const meta = {
  title: 'Chrome/LeavePlanSheet',
  component: LeavePlanSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof LeavePlanSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mode: Story = {
  args: baseArgs,
};

export const PlanReady: Story = {
  args: {
    ...baseArgs,
    // Plan-ready variant; same authority path.
    variant: 'plan-ready',
    onLeaveWithoutRunning: noop,
  },
};
