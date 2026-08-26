// ───────────────────────────────────────────────────────────────────
// MODULE: SESSION CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import CardSession from './card-session.svelte';

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION: SessionCardDto = DEMO_SESSIONS.sessions[0] ?? {
  id: 'demo-session-refactor',
  status: 'idle',
  updatedAt: '2026-08-13T10:00:00.000Z',
  messageCount: 2,
};

const selectSession = (id: string): SessionCardDto | undefined =>
  id === SESSION.id ? SESSION : undefined;

const meta = {
  title: 'Views/SessionCard',
  component: CardSession,
  tags: ['autodocs'],
} satisfies Meta<typeof CardSession>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sessionId: SESSION.id,
    selectSession,
    source: 'relay',
    unread: false,
    launchingId: null,
    openDisabled: false,
    onOpen: () => undefined,
  },
};

export const Launching: Story = {
  args: {
    ...Default.args,
    launchingId: SESSION.id,
    openDisabled: true,
  },
};

const STALE_RUNNING: SessionCardDto = {
  ...SESSION,
  status: 'running',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const StaleRunning: Story = {
  args: {
    ...Default.args,
    sessionId: STALE_RUNNING.id,
    selectSession: (id: string) => (id === STALE_RUNNING.id ? STALE_RUNNING : undefined),
  },
};
