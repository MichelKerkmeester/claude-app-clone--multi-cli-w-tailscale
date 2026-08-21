import type { Meta, StoryObj } from '@storybook/sveltekit';
import SessionStateIcon from './SessionStateIcon.svelte';

// The session-state-icon surface declares two states: idle and running. Each
// story renders the real glyph over the real SessionCardDto['status'] value.
const meta = {
  title: 'Views/SessionStateIcon',
  component: SessionStateIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof SessionStateIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { status: 'idle' } };

export const Running: Story = { args: { status: 'running' } };
