import type { Meta, StoryObj } from '@storybook/sveltekit';

import TodoProjectionBlock from './todo-projection-block.svelte';
import { EMPTY_TODO_PROJECTION_STATE, type TodoProjectionState } from '$shared/state/state.js';

// Keep the story on exported projection-null states because unexported task fixtures cannot be represented.
// This avoids inventing task content.
const meta = {
  title: 'Transcript/TodoProjectionBlock',
  component: TodoProjectionBlock,
  tags: ['autodocs'],
} satisfies Meta<typeof TodoProjectionBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = { args: { state: EMPTY_TODO_PROJECTION_STATE } };
export const Unsupported: Story = {
  args: {
    state: { ...EMPTY_TODO_PROJECTION_STATE, availability: 'unsupported' } satisfies TodoProjectionState,
  },
};
