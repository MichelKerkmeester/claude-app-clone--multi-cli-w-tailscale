import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto, TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import {
  EMPTY_TRANSCRIPT,
  transcriptReducer,
  type ConnectionPhase,
  type TranscriptState,
} from '$shared/state/state.js';
import Chat, { type SessionProps } from './screen-chat.svelte';

// Demo session + transcript via real reducer path (select → page), matching useSyncSocket.
const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION: SessionCardDto | undefined = DEMO_SESSIONS.sessions[0];
if (SESSION === undefined) {
  throw new Error('No demo session fixture found for the Chat story.');
}
const DEMO_SESSION: SessionCardDto = SESSION;

const DEMO_TRANSCRIPT_PAGE = demoPostJson(
  `/api/sessions/${encodeURIComponent(SESSION.id)}/transcript`,
  {},
) as { readonly items: readonly unknown[]; readonly coversThrough: number };

const DEMO_TRANSCRIPT: TranscriptState = transcriptReducer(
  transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION.id }),
  {
    type: 'page',
    sessionId: SESSION.id,
    coversThrough: DEMO_TRANSCRIPT_PAGE.coversThrough,
    blocks: DEMO_TRANSCRIPT_PAGE.items as unknown as readonly TranscriptBlock[],
    at: new Date().toISOString(),
  },
);

const dispatchConnection = (): void => {};
const dispatchTranscript = (): void => {};
const STORY_CONTROLS_CATEGORY = 'Story controls';

type TranscriptStateControl = 'fixture' | 'empty' | 'loading' | 'cache';
type SessionStateControl = 'from-props' | 'live-idle' | 'live-running' | 'reconnecting';
type ChatStoryArgs = SessionProps & {
  readonly transcriptState?: TranscriptStateControl;
  readonly sessionState?: SessionStateControl;
};

function transcriptForState(
  transcript: TranscriptState,
  state: TranscriptStateControl,
): TranscriptState {
  if (state === 'fixture') return transcript;
  if (state === 'empty') return { ...DEMO_TRANSCRIPT, blocks: [] };
  if (state === 'loading') return { ...EMPTY_TRANSCRIPT, sessionId: DEMO_SESSION.id };
  return { ...DEMO_TRANSCRIPT, source: 'cache' };
}

function sessionPropsForState(args: ChatStoryArgs): Pick<SessionProps, 'connection' | 'status'> {
  switch (args.sessionState ?? 'from-props') {
    case 'live-idle':
      return { connection: 'live', status: 'idle' };
    case 'live-running':
      return { connection: 'live', status: 'running' };
    case 'reconnecting':
      return { connection: 'reconnecting', status: 'idle' };
    case 'from-props':
      return { connection: args.connection, status: args.status };
  }
}

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

function renderChat(args: ChatStoryArgs) {
  const transcriptState = args.transcriptState ?? 'fixture';
  const props = withoutStoryControls(args, ['transcriptState', 'sessionState', 'transcript']);
  return {
    Component: Chat,
    props: {
      ...props,
      transcript: transcriptForState(args.transcript, transcriptState),
      ...sessionPropsForState(args),
    },
  };
}

const meta = {
  title: 'Views/Chat',
  component: Chat,
  tags: ['autodocs'],
  argTypes: {
    transcriptState: {
      control: { type: 'select' },
      options: ['fixture', 'empty', 'loading', 'cache'],
      description: 'Select a fixture-backed transcript/load state for the chat surface.',
      table: { category: STORY_CONTROLS_CATEGORY },
    },
    sessionState: {
      control: { type: 'select' },
      options: ['from-props', 'live-idle', 'live-running', 'reconnecting'],
      description: 'Use the real connection/status args or a named session-state preset.',
      table: { category: STORY_CONTROLS_CATEGORY },
    },
  },
  render: renderChat,
} satisfies Meta<ChatStoryArgs>;

export default meta;
type Story = StoryObj<ChatStoryArgs>;

export const Default: Story = {
  args: {
    connection: 'connecting' satisfies ConnectionPhase,
    sessionId: DEMO_SESSION.id,
    initialCache: null,
    transcript: DEMO_TRANSCRIPT,
    dispatchConnection,
    dispatchTranscript,
    status: SESSION.status,
    onBack: () => {},
    onInbox: () => {},
    onReview: () => {},
    theme: 'system' as const,
    onThemeChange: () => {},
    transcriptState: 'fixture',
    sessionState: 'from-props',
  },
};
