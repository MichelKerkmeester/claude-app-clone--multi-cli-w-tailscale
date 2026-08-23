// ───────────────────────────────────────────────────────────────────
// MODULE: RUNTIME STRIP STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import RuntimeStrip from './runtime-strip.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Feed the strip real reducer snapshots so ready and streaming states stay host-confirmed.
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

function makeRuntimeControls(runtime: RuntimeUiState): RuntimeControls {
  const refresh = async (): Promise<void> => undefined;
  const settle = async (): Promise<null> => null;
  return {
    runtime,
    refresh,
    setModel: settle,
    setThinkingLevel: settle,
    setMode: settle,
    openPlanReview: () => false,
    dismissPlanReview: () => undefined,
    invalidatePlan: () => undefined,
    executePlan: settle,
  } satisfies RuntimeControls;
}

const noop = (): void => {};

const meta = {
  title: 'Chrome/RuntimeStrip',
  component: RuntimeStrip,
  tags: ['autodocs'],
} satisfies Meta<typeof RuntimeStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    controls: makeRuntimeControls(hydratedRuntime(IDLE_STATE)),
    sheetOpen: false,
    onOpenEffortSheet: noop,
  },
};

export const Running: Story = {
  args: {
    ...Idle.args,
    controls: makeRuntimeControls(hydratedRuntime(RUNNING_STATE)),
  },
};

export const Plan: Story = {
  args: {
    ...Idle.args,
    // Derive the plan story from the host-shaped snapshot so no mode copy is invented.
    controls: makeRuntimeControls(
      hydratedRuntime({ ...IDLE_STATE, mode: 'plan' }),
    ),
  },
};

export const Checking: Story = {
  args: {
    ...Idle.args,
    // The real initial state before the first host snapshot commits.
    controls: makeRuntimeControls(INITIAL_RUNTIME_STATE),
  },
};
