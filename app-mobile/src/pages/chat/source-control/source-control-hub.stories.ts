// ───────────────────────────────────────────────────────────────────
// MODULE: SOURCE CONTROL HUB STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import SourceControlHub from './source-control-hub.svelte';

const meta = {
  title: 'Source Control/SourceControlHub',
  component: SourceControlHub,
  tags: ['autodocs'],
} satisfies Meta<typeof SourceControlHub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const HUB_DATA = {
  changes: {
    branchLabel: 'feature/compact-source-control',
    files: [
      {
        path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte',
        additions: 24,
        deletions: 3,
      },
      {
        path: 'app-mobile/src/pages/chat/source-control/check-list.svelte',
        additions: 18,
        deletions: 7,
      },
      {
        path: 'app-mobile/src/pages/chat/source-control/reviewer-list.svelte',
        additions: 9,
        deletions: 2,
      },
    ],
  },
  pullRequest: {
    state: 'open',
    rollup: 'failing',
    commentCount: 8,
    stateLabel: 'Open',
    rollupLabel: 'Checks need attention',
    title: 'Add compact source-control surfaces to the chat view',
    number: 1842,
    webUrl: 'https://github.com/acme/atlas/pull/1842',
    description:
      'Adds the read-only pull-request summary, check rollup, and reviewer context to the session sidebar.',
  },
  checkSummary: {
    classification: 'failing',
    label: 'Checks failing',
    detail: '1 of 12 checks needs attention',
  },
  checks: [
    {
      id: 'hub-check-typecheck',
      name: 'TypeScript typecheck',
      classification: 'failing',
      statusLabel: 'Failing',
      detail: 'The source-control check list has a type error in the fixture contract.',
      webUrl: 'https://github.com/acme/atlas/actions/runs/9842157/jobs/28401931',
      order: 0,
    },
    {
      id: 'hub-check-tests',
      name: 'Unit tests',
      classification: 'passing',
      statusLabel: 'Passed',
      detail: '248 tests passed in 31 seconds.',
      webUrl: 'https://github.com/acme/atlas/actions/runs/9842157',
      order: 1,
    },
  ],
  commits: {
    branchLabel: 'feature/compact-source-control',
    commits: [
      {
        id: 'hub-commit-8f31a2d',
        subject: 'Refresh source-control fixtures for the chat sidebar',
        author: 'Maya Chen',
        committedAt: '2026-08-28T09:42:00Z',
        filesState: 'loaded' as const,
        files: [
          { path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte' },
          { path: 'app-mobile/src/pages/chat/source-control/source-control-types.ts' },
        ],
      },
    ],
  },
  upstreamStatus: {
    branch: 'feature/compact-source-control',
    upstream: 'origin/main',
    ahead: 3,
    behind: 1,
  },
  conflicts: {
    providerReported: [{ path: 'app-mobile/src/routes/session/[id]/+page.svelte' }],
    locallyConfirmed: [{ path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte' }],
  },
  reviewers: [
    { id: 'hub-reviewer-maya', name: 'Maya Chen', status: 'approved' as const },
    { id: 'hub-reviewer-noah', name: 'Noah Williams', status: 'changes-requested' as const },
    { id: 'hub-reviewer-priya', name: 'Priya Shah', status: 'commented' as const },
    { id: 'hub-reviewer-liam', name: 'Liam Osei', status: 'pending' as const },
  ],
};

export const ChangesSelected: Story = {
  args: {
    data: HUB_DATA,
    requestedSegment: 'changes',
  },
};

export const PullRequestSelected: Story = {
  args: {
    data: HUB_DATA,
    requestedSegment: 'pr',
  },
};

export const CommitsSelected: Story = {
  args: {
    data: HUB_DATA,
    requestedSegment: 'commits',
  },
};
