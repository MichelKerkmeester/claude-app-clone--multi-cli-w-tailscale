import type { Meta, StoryObj } from '@storybook/sveltekit';

import PlanModeMenu from './PlanModeMenu.svelte';

// Prop-driven two-row Build / Plan picker. `confirmedMode` is the host-confirmed
// mode (`ConfirmedMode` from $shared/data/runtime.ts); rows are read-only and
// only an activated row fires `onSelect`. The disabled reason below is the same
// bounded copy `planModePresentation` produces while a plan executes.
const noop = (): void => {};
const onSelect = (_target: 'build' | 'plan'): void => {};

const meta = {
  title: 'Chrome/PlanModeMenu',
  component: PlanModeMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanModeMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Build: Story = {
  args: {
    confirmedMode: 'build',
    rowsDisabled: false,
    rowsDisabledReason: null,
    onSelect,
  },
};

export const Plan: Story = {
  args: {
    ...Build.args,
    confirmedMode: 'plan',
  },
};

export const RowsDisabled: Story = {
  args: {
    ...Build.args,
    // Selection unsafe even though the menu can open (executing); the reason is
    // the bounded copy from planModePresentation's executing-plan branch.
    confirmedMode: 'executing-plan',
    rowsDisabled: true,
    rowsDisabledReason: 'Plan execution is in progress.',
  },
};
