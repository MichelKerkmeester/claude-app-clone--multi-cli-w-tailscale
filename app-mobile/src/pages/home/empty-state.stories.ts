// ───────────────────────────────────────────────────────────────────
// MODULE: EMPTY STATE STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import EmptyState from './empty-state.svelte';

const meta = {
  title: 'Views/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { loading: false, error: null } };

export const NoMatch: Story = { args: { loading: false, error: null, noMatch: true } };

export const Loading: Story = { args: { loading: true, error: null } };

export const Error: Story = { args: { loading: false, error: 'The relay request failed.' } };

export const HostTooOld: Story = { args: { loading: false, error: null, hostTooOld: true } };
