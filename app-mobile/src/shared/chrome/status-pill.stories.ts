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
  parameters: {
    docs: {
      description: {
        component:
          'At widths of 52rem and below, the shared chrome rule hides the entire pill, including its status dot; it returns above that breakpoint. The label maps the host connection phase to fixed text, so offline and error are explicit states rather than inferred from color.',
      },
    },
  },
} satisfies Meta<typeof StatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { phase: 'live' } };
export const Connecting: Story = { args: { phase: 'connecting' } };
export const Reconnecting: Story = { args: { phase: 'reconnecting' } };
export const Offline: Story = { args: { phase: 'offline' } };
export const Error: Story = { args: { phase: 'error' } };
