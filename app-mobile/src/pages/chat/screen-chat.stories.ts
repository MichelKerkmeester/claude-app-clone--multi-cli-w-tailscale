import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto, TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import {
  EMPTY_TRANSCRIPT,
  transcriptReducer,
  type ConnectionAction,
  type ConnectionPhase,
  type TranscriptAction,
  type TranscriptState,
} from '$shared/state/state.js';
import Chat from './screen-chat.svelte';

// Demo session + transcript via real reducer path (select → page), matching useSyncSocket.
const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION: SessionCardDto | undefined = DEMO_SESSIONS.sessions[0];
if (SESSION === undefined) {
  throw new Error('No demo session fixture found for the Chat story.');
}

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

const dispatchConnection = (_action: ConnectionAction): void => {};
const dispatchTranscript = (_action: TranscriptAction): void => {};

const meta = {
  title: 'Views/Chat',
  component: Chat,
  tags: ['autodocs'],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    connection: 'connecting' satisfies ConnectionPhase,
    sessionId: SESSION.id,
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
  },
};
