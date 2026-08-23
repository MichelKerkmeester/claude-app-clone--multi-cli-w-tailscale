import type { Meta, StoryObj } from '@storybook/sveltekit';

import RuntimeStatusRegion from './runtime-status-region.svelte';
import { INITIAL_RUNTIME_STATE, type RuntimeUiState } from '$shared/state/runtime.js';

// Reuse the initial runtime state so each story selects a declared phase.
// The single polite live region then exposes bounded announcement copy.
const meta = {
  title: 'Transcript/RuntimeStatusRegion',
  component: RuntimeStatusRegion,
  tags: ['autodocs'],
} satisfies Meta<typeof RuntimeStatusRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = { args: { runtime: INITIAL_RUNTIME_STATE } };
export const Streaming: Story = {
  args: { runtime: { ...INITIAL_RUNTIME_STATE, status: 'pending', phase: 'streaming' } satisfies RuntimeUiState },
};
export const Pending: Story = {
  args: { runtime: { ...INITIAL_RUNTIME_STATE, status: 'pending', phase: 'pending' } satisfies RuntimeUiState },
};
export const Accepted: Story = {
  args: { runtime: { ...INITIAL_RUNTIME_STATE, status: 'ready', phase: 'accepted' } satisfies RuntimeUiState },
};
export const Stale: Story = {
  args: { runtime: { ...INITIAL_RUNTIME_STATE, status: 'stale', phase: 'stale' } satisfies RuntimeUiState },
};
export const Unsupported: Story = {
  args: { runtime: { ...INITIAL_RUNTIME_STATE, status: 'error', phase: 'unsupported' } satisfies RuntimeUiState },
};
