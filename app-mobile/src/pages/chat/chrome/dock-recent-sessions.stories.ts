// ───────────────────────────────────────────────────────────────────
// MODULE: RECENT SESSIONS DOCK STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import DockRecentSessions from './dock-recent-sessions.svelte';
import DockRecentSessionsStoryHost from './dock-recent-sessions-story-host.svelte';

interface SessionFixture {
  readonly id: string;
  readonly status: 'idle' | 'running' | 'interrupted' | 'unknown';
  readonly updatedAt: string;
  readonly messageCount: number;
  readonly title: string;
  readonly attention?: 'done' | 'blocked' | 'waiting';
  readonly contextPercent?: number;
  readonly activity?: string;
  readonly tool?: string;
}

const ROSTER: readonly SessionFixture[] = [
  {
    id: 'session-release-readiness',
    status: 'idle',
    updatedAt: '2026-08-18T09:48:00.000Z',
    messageCount: 18,
    title: 'Release readiness review',
    attention: 'done',
    contextPercent: 41,
    activity: 'Reviewing the final checklist',
    tool: 'git diff',
  },
  {
    id: 'session-relay-outage',
    status: 'running',
    updatedAt: '2026-08-18T09:45:00.000Z',
    messageCount: 11,
    title: 'Investigate relay outage',
    contextPercent: 67,
    activity: 'Tracing the retry storm',
    tool: 'tail',
  },
  {
    id: 'session-composer-polish',
    status: 'idle',
    updatedAt: '2026-08-18T09:31:00.000Z',
    messageCount: 26,
    title: 'Mobile composer polish',
    contextPercent: 52,
    activity: 'Comparing narrow viewport states',
    tool: 'storybook',
  },
  {
    id: 'session-credential-rotation',
    status: 'interrupted',
    updatedAt: '2026-08-18T09:19:00.000Z',
    messageCount: 7,
    title: 'Rotate device credentials',
    attention: 'blocked',
    contextPercent: 29,
    activity: 'Waiting for the host confirmation',
    tool: 'curl',
  },
  {
    id: 'session-usage-alerts',
    status: 'idle',
    updatedAt: '2026-08-18T09:02:00.000Z',
    messageCount: 13,
    title: 'Usage limit alerts',
    attention: 'waiting',
    contextPercent: 36,
    activity: 'Checking account windows',
    tool: 'none',
  },
  {
    id: 'session-attachment-flow',
    status: 'idle',
    updatedAt: '2026-08-18T08:56:00.000Z',
    messageCount: 9,
    title: 'Attachment handoff flow',
    contextPercent: 24,
    activity: 'Verifying image permissions',
    tool: 'vitest',
  },
  {
    id: 'session-plan-review',
    status: 'idle',
    updatedAt: '2026-08-18T08:43:00.000Z',
    messageCount: 15,
    title: 'Plan review navigation',
    contextPercent: 48,
    activity: 'Checking approval boundaries',
    tool: 'rg',
  },
  {
    id: 'session-cache-recovery',
    status: 'unknown',
    updatedAt: '2026-08-18T08:22:00.000Z',
    messageCount: 4,
    title: 'Offline cache recovery',
    contextPercent: 18,
    activity: 'Comparing cached session lists',
    tool: 'node',
  },
  {
    id: 'session-transcript-search',
    status: 'idle',
    updatedAt: '2026-08-18T08:11:00.000Z',
    messageCount: 21,
    title: 'Transcript search behavior',
    contextPercent: 61,
    activity: 'Testing exact-match navigation',
    tool: 'playwright',
  },
  {
    id: 'session-theme-parity',
    status: 'idle',
    updatedAt: '2026-08-18T07:58:00.000Z',
    messageCount: 12,
    title: 'Light and dark theme parity',
    contextPercent: 33,
    activity: 'Checking token contrast',
    tool: 'eslint',
  },
];

const rosterAt = '2026-08-18T09:50:00.000Z';

// The dock's context is established by a host component rather than here.
// `setContext` is only legal during a component's initialisation, and a story's
// `render` runs outside one.
function renderDock(roster: readonly SessionFixture[], args: { sessionId: string }) {
  return {
    Component: DockRecentSessionsStoryHost,
    props: { roster, rosterAt, sessionId: args.sessionId },
  };
}

const meta = {
  title: 'Chrome/DockRecentSessions',
  component: DockRecentSessions,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Builds its visible list by intersecting the host app’s live session roster with the locally stored recency stack, so stale local IDs and sessions absent from the host disappear. With no host-listed sessions, the dock renders nothing; removing a pinned session asks for confirmation, and overflow cues appear only after measuring the strip.',
      },
    },
  },
} satisfies Meta<typeof DockRecentSessions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: { sessionId: 'session-relay-outage' },
  render: (args) => renderDock(ROSTER.slice(0, 5), args),
};

export const Overflow: Story = {
  args: { sessionId: 'session-release-readiness' },
  render: (args) => renderDock(ROSTER, args),
};
