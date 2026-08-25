// ───────────────────────────────────────────────────────────────────
// MODULE: COMPOSER TOOLS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  CommandDescriptorDto,
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import ComposerTools from './composer-tools.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '$shared/state/runtime.js';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
  SelectedCommandBinding,
} from '$shared/commands/commands.js';
import { demoPostJson } from '$shared/fixtures/demo.js';

// Runtime + catalog fixtures; handlers noop (presentation only).
const DEMO_STATE = (
  demoPostJson('/api/runtime/state', { sessionId: 'demo-session-refactor' }) as {
    state: RuntimeStateDto;
  }
).state;
const DEMO_MODELS = demoPostJson('/api/runtime/models', {
  sessionId: 'demo-session-refactor',
}) as RuntimeModelCatalogDto;
const DEMO_COMMANDS = (
  demoPostJson('/api/commands/list', {}) as {
    commands: readonly CommandDescriptorDto[];
  }
).commands;

const DEMO_SNAPSHOT: ScopedCommandSnapshot = {
  hostEpoch: 'demo-epoch-01',
  sessionId: 'demo-session-refactor',
  sessionRevision: 1,
  catalogRevision: 1,
  commands: DEMO_COMMANDS,
  fetchedAt: Date.now(),
};

function makeCatalog(snapshot: ScopedCommandSnapshot | null): HostCommandCatalogState {
  return {
    status: snapshot === null ? 'loading' : 'ready',
    snapshot,
    commands: snapshot?.commands ?? [],
    refresh: async () => undefined,
  };
}

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
const onInsert = (_name: string, _binding: SelectedCommandBinding): void => {};
const onFilesSelected = (_files: FileList | null): void => {};
const onShiftTabPreferenceChange = (_enabled: boolean): void => {};

const baseArgs = {
  runtimeControls: makeRuntimeControls(),
  catalog: makeCatalog(DEMO_SNAPSHOT),
  onInsert,
  onOpenChange: noop,
  mediaAvailable: false,
  onFilesSelected,
  shiftTabEnabled: true,
  onShiftTabPreferenceChange,
};

const meta = {
  title: 'Chrome/ComposerTools',
  component: ComposerTools,
  tags: ['autodocs'],
} satisfies Meta<typeof ComposerTools>;

export default meta;
type Story = StoryObj<typeof meta>;

// Popover opens via real interaction.
export const Default: Story = { args: { ...baseArgs } };

export const MediaAvailable: Story = {
  args: {
    ...baseArgs,
    mediaAvailable: true,
  },
};

export const CatalogLoading: Story = {
  args: {
    ...baseArgs,
    catalog: makeCatalog(null),
  },
};
