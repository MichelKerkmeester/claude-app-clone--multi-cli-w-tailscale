// ───────────────────────────────────────────────────────────────────
// MODULE: RUNTIME MODE ANNOUNCER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import RuntimeModeAnnouncer from './runtime-mode-announcer.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Reducer snapshots for host-confirmed live-region copy.
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
    // Host snapshot with mode plan.
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
    // Pre-hydration initial state.
    runtime: INITIAL_RUNTIME_STATE,
  },
};
