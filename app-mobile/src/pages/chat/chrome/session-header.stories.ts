// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION HEADER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import SessionHeader, { type ThemePreference } from './session-header.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Reuse the reducer and demo snapshot so header labels reflect host-confirmed runtime state.
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
    // Derive the plan story from the host-shaped snapshot so no mode copy is invented.
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
