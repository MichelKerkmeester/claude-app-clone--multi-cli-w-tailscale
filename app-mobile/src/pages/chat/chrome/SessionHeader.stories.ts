import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import SessionHeader, { type ThemePreference } from './SessionHeader.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '$shared/data/runtime.js';
import { demoPostJson } from '$shared/data/demo.js';

// Re-host the demo runtime fixtures through the real non-optimistic reducer so
// every SessionHeader story's `runtimeControls.runtime` is a real RuntimeUiState
// sourced from demo.ts — nothing is invented. The reducer's `hydrated` action is
// exactly the path the live app uses to derive the ready runtime from a host
// snapshot + model catalog. The remaining RuntimeControls methods are no-ops:
// the header only reads `runtime` and routes the model-sheet open callback.
const DEMO_STATE = (
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
const onThemeChange = (_theme: ThemePreference): void => {};

const meta = {
  title: 'Chrome/SessionHeader',
  component: SessionHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof SessionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Build: Story = {
  args: {
    onBack: noop,
    onInbox: noop,
    onReview: noop,
    theme: 'system',
    onThemeChange,
    runtimeControls: makeRuntimeControls(hydratedRuntime(DEMO_STATE)),
    sheetOpen: false,
    onOpenModelSheet: noop,
  },
};

export const Plan: Story = {
  args: {
    ...Build.args,
    // `mode` is a real RuntimeStateDto field; deriving 'plan' from the demo
    // snapshot mirrors a host-confirmed plan transition (no copy invented).
    runtimeControls: makeRuntimeControls(
      hydratedRuntime({ ...DEMO_STATE, mode: 'plan' }),
    ),
  },
};

export const SheetOpen: Story = {
  args: {
    ...Build.args,
    sheetOpen: true,
  },
};
