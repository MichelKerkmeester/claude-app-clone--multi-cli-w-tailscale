// ───────────────────────────────────────────────────────────────────
// MODULE: HOME SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import type { SessionListState, ConnectionPhase } from '$shared/state/state.js';
import type { PushConfig } from '$shared/format/attention.js';
import { demoPostJson, DEMO_IDENTITY } from '$shared/fixtures/demo.js';
import { installStoryHostFetch } from '$shared/fixtures/story-host-fetch.js';
import Home from './screen-home.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const ROSTER_ITEMS: readonly SessionCardDto[] = DEMO_SESSIONS.sessions;
const UPDATED_AT: string = ROSTER_ITEMS[0]?.updatedAt ?? new Date().toISOString();

const DEMO_PUSH_CONFIG: PushConfig = {
  supported: true,
  vapidPublicKey: 'BNtYwF0z3q4VapidPublicKeyFromHostPreviewNotASecret',
  preferences: { needs_input: true, finished: true, error: false },
};

const installHealthyHomeHost = (): (() => void) =>
  installStoryHostFetch({
    '/api/push/config': () => DEMO_PUSH_CONFIG,
  });

const noop = (): void => {};

// ───────────────────────────────────────────────────────────────────
// 2. STORY CONTROLS
// ───────────────────────────────────────────────────────────────────

const STORY_CONTROLS = 'Story controls';

const ROSTER_STATE_OPTIONS = ['loading', 'empty', 'ready', 'stale', 'error'] as const;
type RosterState = (typeof ROSTER_STATE_OPTIONS)[number];

const CONNECTION_OPTIONS: readonly ConnectionPhase[] = [
  'unenrolled',
  'authenticating',
  'offline',
  'connecting',
  'live',
  'reconnecting',
  'error',
];

type HomeStoryArgs = {
  connection: ConnectionPhase;
  rosterState: RosterState;
  sessionCount: number;
};

function clampCount(sessionCount: number): number {
  if (!Number.isFinite(sessionCount) || sessionCount <= 0) return 0;
  return Math.min(Math.floor(sessionCount), ROSTER_ITEMS.length);
}

// Roster state owns phase/source/updatedAt/error. Count slices the demo
// roster only when that state actually shows rows — loading/empty/error
// with leftover items would still look ready because deriveListState
// treats a non-empty catalog as ready.
function sessionListFor(rosterState: RosterState, sessionCount: number): SessionListState {
  const items =
    rosterState === 'ready' || rosterState === 'stale'
      ? ROSTER_ITEMS.slice(0, clampCount(sessionCount))
      : [];
  switch (rosterState) {
    case 'loading':
      return { items, phase: 'loading', source: 'none', updatedAt: null, error: null };
    case 'empty':
      return { items, phase: 'ready', source: 'relay', updatedAt: UPDATED_AT, error: null };
    case 'ready':
      return { items, phase: 'ready', source: 'relay', updatedAt: UPDATED_AT, error: null };
    case 'stale':
      return { items, phase: 'ready', source: 'cache', updatedAt: UPDATED_AT, error: null };
    case 'error':
      return {
        items,
        phase: 'error',
        source: 'none',
        updatedAt: null,
        error: 'The relay request failed.',
      };
  }
}

function homeProps(args: HomeStoryArgs) {
  return {
    connection: args.connection,
    cache: null,
    device: DEMO_IDENTITY,
    onSelect: noop,
    onRevoke: noop,
    onLogout: noop,
    sessions: sessionListFor(args.rosterState, args.sessionCount),
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. META
// ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Views/Home',
  component: Home,
  tags: ['autodocs'],
  args: {
    connection: 'live',
    rosterState: 'ready',
    sessionCount: ROSTER_ITEMS.length,
  },
  argTypes: {
    rosterState: {
      control: 'radio',
      options: [...ROSTER_STATE_OPTIONS],
      table: { category: STORY_CONTROLS },
    },
    sessionCount: {
      control: { type: 'range', min: 0, max: ROSTER_ITEMS.length, step: 1 },
      table: { category: STORY_CONTROLS },
    },
    connection: {
      control: 'radio',
      options: [...CONNECTION_OPTIONS],
    },
  },
  parameters: {
    controls: {
      exclude: [
        'sessions',
        'cache',
        'device',
        'onSelect',
        'onRevoke',
        'onLogout',
        'hosts',
        'usage',
        'onRefresh',
      ],
    },
  },
  render: (args: Partial<HomeStoryArgs>) => ({
    Component: Home,
    props: homeProps({
      connection: args.connection ?? 'live',
      rosterState: args.rosterState ?? 'ready',
      sessionCount: args.sessionCount ?? ROSTER_ITEMS.length,
    }),
  }),
};

export default meta;
type Story = StoryObj<HomeStoryArgs>;

export const Loading: Story = {
  args: {
    connection: 'live',
    rosterState: 'loading',
    sessionCount: 0,
  },
};

export const Empty: Story = {
  args: {
    connection: 'live',
    rosterState: 'empty',
    sessionCount: 0,
  },
  beforeEach: installHealthyHomeHost,
};

export const Error: Story = {
  args: {
    connection: 'live',
    rosterState: 'error',
    sessionCount: 0,
  },
};

export const Stale: Story = {
  args: {
    connection: 'live',
    rosterState: 'stale',
    sessionCount: ROSTER_ITEMS.length,
  },
  beforeEach: installHealthyHomeHost,
};

export const Ready: Story = {
  args: {
    connection: 'live',
    rosterState: 'ready',
    sessionCount: ROSTER_ITEMS.length,
  },
  beforeEach: installHealthyHomeHost,
};
