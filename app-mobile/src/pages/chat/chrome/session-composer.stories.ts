// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION COMPOSER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  CommandDescriptorDto,
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import SessionComposer from './session-composer.svelte';
import AttachmentDraftProvider from '../attachments/attachment-draft-provider.svelte';
import AttachmentDraftStoryHost from '../attachments/attachment-draft-story-host.svelte';
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

const StoryHost = AttachmentDraftStoryHost as unknown as typeof AttachmentDraftProvider;

// Reducer + command + attachment fixtures for real authority/capability shapes.
const DEMO_STATE = (
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

function makeCatalog(): HostCommandCatalogState {
  return {
    status: 'ready',
    snapshot: DEMO_SNAPSHOT,
    commands: DEMO_COMMANDS,
    refresh: async () => undefined,
  };
}

function hydratedRuntime(state: RuntimeStateDto): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state,
    models: DEMO_MODELS,
  });
}

function makeRuntimeControls(state: RuntimeStateDto): RuntimeControls {
  const refresh = async (): Promise<void> => undefined;
  const settle = async (): Promise<null> => null;
  return {
    runtime: hydratedRuntime(state),
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
const setPrompt = (_updater: (current: string) => string): void => undefined;
const onInsertCommand = (_name: string, _binding: SelectedCommandBinding): void => undefined;

const baseArgs = {
  // Isolated recovery session id.
  sessionId: 'storybook-composer',
  prompt: '',
  setPrompt,
  onDraftChange: noop,
  sendPrompt: noop,
  sendSlashDraft: noop,
  stopRun: noop,
  canSubmit: true,
  status: 'idle' as const,
  connection: 'live' as const,
  inputLock: 'none' as const,
  awaitingSnapshot: false,
  sendingPrompt: false,
  stopping: false,
  promptError: null,
  runtimeControls: makeRuntimeControls(DEMO_STATE),
  catalog: makeCatalog(),
  binding: null,
  slashSubmitting: false,
  runtimeAuthority: true,
  runtimeRunning: false,
  onInsertCommand,
  mediaCapability: null,
  onAttachmentSubmitted: noop,
};

const meta = {
  title: 'Chrome/SessionComposer',
  component: SessionComposer,
  tags: ['autodocs'],
  // The provider receives the story's capability, and the host stages real local
  // files so the composer's attachment rail has content to render.
  decorators: [
    () => ({ Component: StoryHost }),
    (_story, context) => ({
      Component: AttachmentDraftProvider,
      props: {
        capability: context.args.mediaCapability ?? null,
        sessionId: context.args.sessionId ?? null,
        modelCanViewPhotos: true,
      },
    }),
  ],
} satisfies Meta<typeof SessionComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { ...baseArgs } };

export const WithMedia: Story = {
  args: {
    ...baseArgs,
    // Story supplies media capability when enabling the affordance.
    mediaCapability: { enabled: true, imageIn: true },
  },
};

export const Running: Story = {
  args: {
    ...baseArgs,
    status: 'running',
    runtimeRunning: true,
    runtimeControls: makeRuntimeControls(RUNNING_STATE),
  },
};
