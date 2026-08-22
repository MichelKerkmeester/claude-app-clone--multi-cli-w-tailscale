import type { Meta, StoryObj } from '@storybook/sveltekit';
import type {
  CommandDescriptorDto,
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import SessionComposer from './SessionComposer.svelte';
import AttachmentDraftProvider from '../attachments/AttachmentDraftProvider.svelte';
import {
  INITIAL_RUNTIME_STATE,
  runtimeReducer,
  type RuntimeControls,
  type RuntimeUiState,
} from '../../runtime.js';
import type {
  HostCommandCatalogState,
  ScopedCommandSnapshot,
  SelectedCommandBinding,
} from '../../commands.js';
import { demoPostJson } from '../../demo.js';

// Re-host the demo runtime + command fixtures so every SessionComposer story
// args object is sourced from demo.ts — nothing is invented. The runtime
// hydrates to `ready-adjustable` via the real reducer; the command catalog uses
// the demo `/api/commands/list` rows bound to the demo host epoch / catalog
// revision. The remaining RuntimeControls / catalog methods are no-ops.
//
// SessionComposer reads the AttachmentDraft context via getAttachmentDraft, so
// its story is wrapped in the self-providing AttachmentDraftProvider as a
// Storybook decorator — exactly the committed ArtifactViewerProvider pattern in
// rich-content/RichContentRouter.stories.ts. The provider defaults to
// capability=null (no photos staged); the WithMedia story drives the media
// affordance through the composer's own `mediaCapability` prop.
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
  // A story-local session id so draft-recovery sessionStorage keys never
  // collide with a real demo session.
  sessionId: 'storybook-composer',
  prompt: '',
  setPrompt,
  onDraftChange: noop,
  sendPrompt: noop,
  sendSlashDraft: noop,
  stopRun: noop,
  canSubmit: true,
  status: 'idle' as const,
  connection: 'live',
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
  decorators: [() => ({ Component: AttachmentDraftProvider })],
} satisfies Meta<typeof SessionComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { ...baseArgs } };

export const WithMedia: Story = {
  args: {
    ...baseArgs,
    // Real RuntimeMediaCapabilityDto shape (enabled + imageIn) — the composer's
    // media affordance is gated on this; no copy invented.
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
