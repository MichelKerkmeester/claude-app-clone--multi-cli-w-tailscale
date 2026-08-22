import type { Meta, StoryObj } from '@storybook/sveltekit';

import TodoProjectionBlock from './TodoProjectionBlock.svelte';
import { EMPTY_TODO_PROJECTION_STATE, type TodoProjectionState } from '$shared/data/state.js';

// The `todos` surface is registry-only because the demo projection is not exported
// for a typed preview (see registry.ts). DEMO_TODO_FIXTURE declares the grouped /
// all-done / empty / unsupported states, but only the projection-null states are
// constructable from the exported EMPTY_TODO_PROJECTION_STATE without inventing task
// content — so these stories render the real component's projection-null guard over
// the exported empty-state fixture. The grouped / all-done states require the
// unexported DEMO_TODO_TASKS projection and are intentionally omitted (nothing
// invented).
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
