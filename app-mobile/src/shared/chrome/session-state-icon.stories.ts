// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION STATE ICON STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import SessionStateIcon from './session-state-icon.svelte';

// Idle and running over real `SessionCardDto['status']` values.
const meta = {
  title: 'Views/SessionStateIcon',
  component: SessionStateIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof SessionStateIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { status: 'idle' } };

export const Running: Story = { args: { status: 'running' } };
