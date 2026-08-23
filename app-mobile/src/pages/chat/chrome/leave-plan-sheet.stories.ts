import type { Meta, StoryObj } from '@storybook/sveltekit';

import LeavePlanSheet from './leave-plan-sheet.svelte';

// Authority-expanding confirmation sheet. `isOpen: true` forces the real
// bottom-sheet content through its portal; callbacks are no-ops — only an
// explicit press of "Switch to Build" / "Leave without running" reaches them.
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
    // The plan-ready variant keeps the same confirmation with safer copy:
    // the switch action reads "Leave without running".
    variant: 'plan-ready',
    onLeaveWithoutRunning: noop,
  },
};
