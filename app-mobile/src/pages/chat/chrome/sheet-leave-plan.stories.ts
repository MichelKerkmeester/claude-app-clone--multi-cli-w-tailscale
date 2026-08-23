// ───────────────────────────────────────────────────────────────────
// MODULE: LEAVE PLAN SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import LeavePlanSheet from './sheet-leave-plan.svelte';

// Keep the confirmation sheet open so the story exercises its real portal and explicit callbacks.
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
    // The plan-ready variant proves the safer copy without changing the authority path.
    variant: 'plan-ready',
    onLeaveWithoutRunning: noop,
  },
};
