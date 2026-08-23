import type { Meta, StoryObj } from '@storybook/sveltekit';

import EffortRadioGroup from './radio-effort.svelte';

// Re-host the host-advertised effort levels from the demo runtime snapshot
// (THINKING_LEVELS = ['off', 'high', 'max'], confirmed 'high') so every
// EffortRadioGroup story's `levels` / `confirmed` / `pendingLevel` is a real
// demo value — nothing is invented. The `off-only` story uses the single-level
// `['off']` catalog the runtime reducer derives `ready-off-only` from.
const DEMO_LEVELS: readonly string[] = ['off', 'high', 'max'];
const DEMO_CONFIRMED = 'high';

const noop = (): void => {};

const meta = {
  title: 'Chrome/EffortRadioGroup',
  component: EffortRadioGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof EffortRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    levels: DEMO_LEVELS,
    confirmed: DEMO_CONFIRMED,
    pendingLevel: null,
    isPending: false,
    isDisabled: false,
    labelledBy: 'effort-section-heading',
    onSelect: noop,
  },
};

export const Pending: Story = {
  args: {
    ...Ready.args,
    pendingLevel: 'max',
    isPending: true,
  },
};

export const Disabled: Story = {
  args: {
    ...Ready.args,
    isDisabled: true,
  },
};

export const OffOnly: Story = {
  args: {
    ...Ready.args,
    levels: ['off'],
    confirmed: 'off',
  },
};
