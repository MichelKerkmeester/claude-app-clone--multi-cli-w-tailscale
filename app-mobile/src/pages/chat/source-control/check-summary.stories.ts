// ───────────────────────────────────────────────────────────────────
// MODULE: CHECK SUMMARY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CheckSummary from './check-summary.svelte';

const meta = {
  title: 'Source Control/CheckSummary',
  component: CheckSummary,
  tags: ['autodocs'],
} satisfies Meta<typeof CheckSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const PASSING_SUMMARY = {
  classification: 'passing',
  label: 'All checks passing',
  detail: '12 checks completed successfully',
};

const FAILING_SUMMARY = {
  classification: 'failing',
  label: 'Checks failing',
  detail: '1 of 12 checks needs attention',
};

const UNKNOWN_SUMMARY = {
  classification: 'unknown',
  label: 'Checks unavailable',
  detail: 'The provider has not resolved the current check state.',
};

export const Passing: Story = {
  args: { summary: PASSING_SUMMARY },
};

export const Failing: Story = {
  args: { summary: FAILING_SUMMARY },
};

export const Unknown: Story = {
  args: { summary: UNKNOWN_SUMMARY },
};
