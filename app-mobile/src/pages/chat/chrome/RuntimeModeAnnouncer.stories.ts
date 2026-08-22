import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import RuntimeModeAnnouncer from './RuntimeModeAnnouncer.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeUiState,
} from '../../../shared/data/runtime.js';
import { demoPostJson } from '../../../shared/data/demo.js';

// Re-host the demo runtime fixtures through the real reducer so every
// RuntimeModeAnnouncer story's `runtime` is a real RuntimeUiState sourced from
// demo.ts. The announcer is a pair of sr-only live regions (polite + alert);
// it renders no visible chrome by design — the catalog shows the real component
// over its real states, and the announced copy is the frozen vocabulary the
// `planModePresentation` derivation selects.
const IDLE_STATE = (
  demoPostJson('/api/runtime/state', { sessionId: 'demo-session-refactor' }) as {
    state: RuntimeStateDto;
  }
).state;
const RUNNING_STATE = (
  demoPostJson('/api/runtime/state', { sessionId: 'demo-session-triage' }) as {
    state: RuntimeStateDto;
  }
).state;
const DEMO_MODELS = demoPostJson('/api/runtime/models', {
  sessionId: 'demo-session-refactor',
}) as RuntimeModelCatalogDto;

function hydratedRuntime(state: RuntimeStateDto): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state,
    models: DEMO_MODELS,
  });
}

const meta = {
  title: 'Chrome/RuntimeModeAnnouncer',
  component: RuntimeModeAnnouncer,
  tags: ['autodocs'],
} satisfies Meta<typeof RuntimeModeAnnouncer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Build: Story = {
  args: {
    runtime: hydratedRuntime(IDLE_STATE),
    connection: 'live',
  },
};

export const Plan: Story = {
  args: {
    ...Build.args,
    // `mode` is a real RuntimeStateDto field; deriving 'plan' from the demo
    // snapshot mirrors a host-confirmed plan transition (no copy invented).
    runtime: hydratedRuntime({ ...IDLE_STATE, mode: 'plan' }),
  },
};

export const ExecutingPlan: Story = {
  args: {
    ...Build.args,
    runtime: hydratedRuntime({ ...IDLE_STATE, mode: 'executing-plan' }),
  },
};

export const Running: Story = {
  args: {
    ...Build.args,
    runtime: hydratedRuntime(RUNNING_STATE),
  },
};

export const Offline: Story = {
  args: {
    ...Build.args,
    connection: 'offline',
  },
};

export const Checking: Story = {
  args: {
    ...Build.args,
    // The real initial state before the first host snapshot commits.
    runtime: INITIAL_RUNTIME_STATE,
  },
};
