// ───────────────────────────────────────────────────────────────────
// MODULE: HOME SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import type { SessionListState, ConnectionPhase } from '$shared/state/state.js';
import { demoPostJson, DEMO_IDENTITY } from '$shared/fixtures/demo.js';
import Home from './screen-home.svelte';

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const ROSTER_ITEMS: readonly SessionCardDto[] = DEMO_SESSIONS.sessions;
const UPDATED_AT: string = ROSTER_ITEMS[0]?.updatedAt ?? new Date().toISOString();

const noop = (): void => {};
const onSelect = (_sessionId: string): void => {};

const baseArgs = {
  connection: 'live' as ConnectionPhase,
  cache: null,
  device: DEMO_IDENTITY,
  onSelect,
  onRevoke: noop,
  onLogout: noop,
};

const meta = {
  title: 'Views/Home',
  component: Home,
  tags: ['autodocs'],
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    ...baseArgs,
    sessions: {
      items: [],
      phase: 'loading',
      source: 'none',
      updatedAt: null,
      error: null,
    } satisfies SessionListState,
  },
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    sessions: {
      items: [],
      phase: 'ready',
      source: 'relay',
      updatedAt: UPDATED_AT,
      error: null,
    } satisfies SessionListState,
  },
};

export const Error: Story = {
  args: {
    ...baseArgs,
    sessions: {
      items: [],
      phase: 'error',
      source: 'none',
      updatedAt: null,
      error: 'The relay request failed.',
    } satisfies SessionListState,
  },
};

export const Stale: Story = {
  args: {
    ...baseArgs,
    sessions: {
      items: ROSTER_ITEMS,
      phase: 'ready',
      source: 'cache',
      updatedAt: UPDATED_AT,
      error: null,
    } satisfies SessionListState,
  },
};
