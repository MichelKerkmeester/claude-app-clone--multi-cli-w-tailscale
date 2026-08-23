// ───────────────────────────────────────────────────────────────────
// MODULE: PLAN MODE BUTTON STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import PlanModeButton from './button-plan-mode.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Build stories from the reducer and demo snapshot so plan-mode presentation stays host-confirmed.
// Callbacks remain inert because the stories exercise focus and labels, not mutations.
const IDLE_STATE = (
  demoPostJson('/api/runtime/state', { sessionId: 'demo-session-refactor' }) as {
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

const noop = (): void => {};

const meta = {
  title: 'Chrome/PlanModeButton',
  component: PlanModeButton,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanModeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Build: Story = {
  args: {
    runtime: hydratedRuntime(IDLE_STATE),
    connection: 'live',
    isOpen: false,
    onOpenChange: noop,
    onSelectPlan: noop,
    onSelectBuild: noop,
  },
};

export const Plan: Story = {
  args: {
    ...Build.args,
    // Derive the plan story from the host-shaped snapshot so no mode copy is invented.
    runtime: hydratedRuntime({ ...IDLE_STATE, mode: 'plan' }),
  },
};

export const ExecutingPlan: Story = {
  args: {
    ...Build.args,
    runtime: hydratedRuntime({ ...IDLE_STATE, mode: 'executing-plan' }),
  },
};

export const Checking: Story = {
  args: {
    ...Build.args,
    // The real initial state before the first host snapshot commits.
    runtime: INITIAL_RUNTIME_STATE,
  },
};
