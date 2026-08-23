// ───────────────────────────────────────────────────────────────────
// MODULE: STATUS PILL STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import StatusPill from './status-pill.svelte';

// Keep this story context-free so each connection phase can be inspected independently.
const meta = {
  title: 'Views/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { phase: 'live' } };
export const Connecting: Story = { args: { phase: 'connecting' } };
export const Reconnecting: Story = { args: { phase: 'reconnecting' } };
export const Offline: Story = { args: { phase: 'offline' } };
export const Error: Story = { args: { phase: 'error' } };
