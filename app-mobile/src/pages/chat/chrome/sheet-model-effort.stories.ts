import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import ModelEffortSheet from './sheet-model-effort.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Re-host the demo runtime fixtures through the real reducer so every
// ModelEffortSheet story's `runtimeControls.runtime` is a real RuntimeUiState
// sourced from demo.ts — nothing is invented. The idle session hydrates to
// `ready-adjustable` with the full demo model catalog (9 models, so the search
// input shows) and the demo effort levels (['off', 'high', 'max'], confirmed
// 'high'). The sheet takes `isOpen`, so these stories force it open to render
// the real sheet content through its portal. The remaining RuntimeControls
// methods are no-ops: the sheet only reads `runtime` and routes open-change.
const DEMO_STATE = (
  demoPostJson('/api/runtime/state', { sessionId: 'demo-session-refactor' }) as {
    state: RuntimeStateDto;
  }
).state;
const DEMO_MODELS = demoPostJson('/api/runtime/models', {
  sessionId: 'demo-session-refactor',
}) as RuntimeModelCatalogDto;

function hydratedRuntime(): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state: DEMO_STATE,
    models: DEMO_MODELS,
  });
}

function makeRuntimeControls(): RuntimeControls {
  const refresh = async (): Promise<void> => undefined;
  const settle = async (): Promise<null> => null;
  return {
    runtime: hydratedRuntime(),
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

const baseArgs = {
  isOpen: true,
  onOpenChange: noop,
  runtimeControls: makeRuntimeControls(),
};

const meta = {
  title: 'Chrome/ModelEffortSheet',
  component: ModelEffortSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof ModelEffortSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ModelSection: Story = {
  args: {
    ...baseArgs,
    initialSection: 'model',
  },
};

export const EffortSection: Story = {
  args: {
    ...baseArgs,
    initialSection: 'effort',
  },
};
