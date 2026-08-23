import type { Meta, StoryObj } from '@storybook/sveltekit';

import RuntimeStatusRegion from './runtime-status-region.svelte';
import { INITIAL_RUNTIME_STATE, type RuntimeUiState } from '$shared/state/runtime.js';

// Prop-driven stories over the exported INITIAL_RUNTIME_STATE: each story spreads the
// real initial state and selects a real RuntimePhase so runtimeAnnouncement emits the
// bounded copy for that phase. RuntimeStatusRegion is the one document-level polite
// atomic live region (sr-only); the announced text is the frozen a11y contract.
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
