// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION COMPOSER STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type {
  CommandDescriptorDto,
  RuntimeStateDto,
  RuntimeModelCatalogDto,
} from '@pi-remote/pi-rpc-protocol';

import SessionComposer, { type SessionComposerProps } from './session-composer.svelte';
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
const setPrompt: SessionComposerProps['setPrompt'] = () => undefined;
const onInsertCommand: SessionComposerProps['onInsertCommand'] = () => undefined;

const STORY_CONTROLS = 'Story controls';

type SessionComposerStoryArgs = Omit<
  SessionComposerProps,
  | 'runtimeControls'
  | 'catalog'
  | 'binding'
  | 'mediaCapability'
  | 'transcriptQuoteCapability'
  | 'prompt'
> & {
  draft: string;
  attachments: boolean;
  planMode: boolean;
  mediaEnabled: boolean;
  imageIn: boolean;
  modelCanViewPhotos: boolean;
};

function runtimeStateFor(
  args: Pick<SessionComposerStoryArgs, 'status' | 'runtimeRunning' | 'planMode'>,
): RuntimeStateDto {
  const state = args.status === 'running' || args.runtimeRunning ? RUNNING_STATE : DEMO_STATE;
  return args.planMode ? { ...state, mode: 'plan' } : state;
}

function mediaCapabilityFor(
  args: Pick<SessionComposerStoryArgs, 'attachments' | 'mediaEnabled' | 'imageIn'>,
) {
  return args.attachments && args.mediaEnabled && args.imageIn
    ? { enabled: true, imageIn: true }
    : null;
}

const baseArgs: SessionComposerStoryArgs = {
  // Isolated recovery session id.
  sessionId: 'storybook-composer',
  draft: '',
  attachments: false,
  planMode: false,
  mediaEnabled: true,
  imageIn: true,
  modelCanViewPhotos: true,
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
  slashSubmitting: false,
  runtimeAuthority: true,
  runtimeRunning: false,
  onInsertCommand,
  onAttachmentSubmitted: noop,
};

// The synthetic controls are story-only and must not reach the component. Naming
// them in a discard destructure leaves bindings the linter counts as unused, so
// they are removed from a copy instead.
function withoutStoryControls<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Omit<T, K> {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
}

function renderComposer(args: Partial<SessionComposerStoryArgs>) {
  const storyArgs: SessionComposerStoryArgs = { ...baseArgs, ...args };
  const props = withoutStoryControls(storyArgs, [
    'draft',
    'attachments',
    'planMode',
    'mediaEnabled',
    'imageIn',
    'modelCanViewPhotos',
  ]);

  return {
    Component: SessionComposer,
    props: {
      ...props,
      prompt: storyArgs.draft,
      runtimeControls: makeRuntimeControls(runtimeStateFor(storyArgs)),
      catalog: makeCatalog(),
      binding: null,
      mediaCapability: mediaCapabilityFor(storyArgs),
    },
  };
}

const meta = {
  title: 'Chrome/SessionComposer',
  component: SessionComposer,
  tags: ['autodocs'],
  args: {
    ...baseArgs,
  },
  argTypes: {
    attachments: {
      control: 'boolean',
      description: 'Stage the demo photo fixtures in the attachment rail.',
      table: { category: STORY_CONTROLS },
    },
    planMode: {
      control: 'boolean',
      description: 'Use the demo runtime fixture in confirmed plan mode.',
      table: { category: STORY_CONTROLS },
    },
    mediaEnabled: {
      control: 'boolean',
      description: 'Toggle the host media capability fixture.',
      table: { category: STORY_CONTROLS },
    },
    imageIn: {
      control: 'boolean',
      description: 'Toggle image input in the host media capability fixture.',
      table: { category: STORY_CONTROLS },
    },
    modelCanViewPhotos: {
      control: 'boolean',
      description: 'Allow the demo model to validate staged photo attachments.',
      table: { category: STORY_CONTROLS },
    },
    draft: {
      control: 'text',
      description: 'Edit the composer draft passed to the real prompt field.',
      table: { category: STORY_CONTROLS },
    },
  },
  parameters: {
    controls: {
      exclude: [
        'runtimeControls',
        'catalog',
        'binding',
        'mediaCapability',
        'transcriptQuoteCapability',
        'prompt',
        'launchDraft',
        'setPrompt',
        'onDraftChange',
        'sendPrompt',
        'sendSlashDraft',
        'stopRun',
        'onInsertCommand',
        'onAttachmentSubmitted',
      ],
    },
  },
  // The provider receives the story's capability, and the host stages real local
  // files so the composer's attachment rail has content to render.
  decorators: [
    () => ({ Component: StoryHost }),
    (story: unknown, context: { args: Partial<SessionComposerStoryArgs> }) => {
      void story;
      const args: SessionComposerStoryArgs = { ...baseArgs, ...context.args };
      return {
        Component: AttachmentDraftProvider,
        props: {
          capability: mediaCapabilityFor(args),
          sessionId: args.sessionId ?? null,
          modelCanViewPhotos: args.modelCanViewPhotos,
        },
      };
    },
  ],
  render: renderComposer,
};

export default meta;
type Story = StoryObj<SessionComposerStoryArgs>;

export const Idle: Story = { args: { ...baseArgs } };

export const WithMedia: Story = {
  args: {
    ...baseArgs,
    attachments: true,
  },
};

export const Running: Story = {
  args: {
    ...baseArgs,
    status: 'running',
    runtimeRunning: true,
  },
};
