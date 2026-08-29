// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import CardSession from './card-session.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION: SessionCardDto = DEMO_SESSIONS.sessions[0] ?? {
  id: 'demo-session-refactor',
  status: 'idle',
  updatedAt: '2026-08-13T10:00:00.000Z',
  messageCount: 2,
};

const STALE_RUNNING: SessionCardDto = {
  ...SESSION,
  status: 'running',
  // Twenty-five minutes before the catalog clock: past the twenty-minute
  // stale threshold, still a plausible running card.
  updatedAt: '2026-08-28T11:35:00.000Z',
};

// ───────────────────────────────────────────────────────────────────
// 2. STORY CONTROLS
// ───────────────────────────────────────────────────────────────────

const STORY_CONTROLS = 'Story controls';

const SOURCE_OPTIONS = ['none', 'cache', 'relay'] as const;
type SessionSource = (typeof SOURCE_OPTIONS)[number];

type SessionCardStoryArgs = {
  source: SessionSource;
  unread: boolean;
  launching: boolean;
  staleRunning: boolean;
};

function cardProps(args: SessionCardStoryArgs) {
  const session = args.staleRunning ? STALE_RUNNING : SESSION;
  return {
    sessionId: session.id,
    selectSession: (id: string) => (id === session.id ? session : undefined),
    source: args.source,
    unread: args.unread,
    launchingId: args.launching ? session.id : null,
    openDisabled: args.launching,
    onOpen: () => undefined,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. META
// ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Views/SessionCard',
  component: CardSession,
  tags: ['autodocs'],
  args: {
    source: 'relay',
    unread: false,
    launching: false,
    staleRunning: false,
  },
  argTypes: {
    launching: {
      control: 'boolean',
      table: { category: STORY_CONTROLS },
    },
    staleRunning: {
      control: 'boolean',
      table: { category: STORY_CONTROLS },
    },
    unread: {
      control: 'boolean',
    },
    source: {
      control: 'radio',
      options: [...SOURCE_OPTIONS],
    },
  },
  parameters: {
    controls: {
      exclude: [
        'sessionId',
        'selectSession',
        'launchingId',
        'openDisabled',
        'onOpen',
        'unreadIds',
        'density',
        'signalVisibility',
        'onDensityChange',
        'onSignalToggle',
        'selectLastSeen',
        'seenAvailable',
        'liveActivity',
      ],
    },
  },
  render: (args: Partial<SessionCardStoryArgs>) => ({
    Component: CardSession,
    props: cardProps({
      source: args.source ?? 'relay',
      unread: args.unread ?? false,
      launching: args.launching ?? false,
      staleRunning: args.staleRunning ?? false,
    }),
  }),
};

export default meta;
type Story = StoryObj<SessionCardStoryArgs>;

export const Default: Story = {
  args: {
    source: 'relay',
    unread: false,
    launching: false,
    staleRunning: false,
  },
};

export const Launching: Story = {
  args: {
    ...Default.args,
    launching: true,
  },
};

export const StaleRunning: Story = {
  args: {
    ...Default.args,
    staleRunning: true,
  },
};
