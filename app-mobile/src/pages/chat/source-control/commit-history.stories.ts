// ───────────────────────────────────────────────────────────────────
// MODULE: COMMIT HISTORY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CommitHistory from './commit-history.svelte';

const meta = {
  title: 'Source Control/CommitHistory',
  component: CommitHistory,
  tags: ['autodocs'],
} satisfies Meta<typeof CommitHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const COMMITS = [
  {
    id: 'commit-idle-8f31a2d',
    subject: 'Refresh source-control fixtures for the chat sidebar',
    author: 'Maya Chen',
    committedAt: '2026-08-28T09:42:00Z',
    filesState: 'idle' as const,
  },
  {
    id: 'commit-loading-2c9d7be',
    subject: 'Expose provider links for individual checks',
    author: 'Noah Williams',
    committedAt: '2026-08-27T16:18:00Z',
    filesState: 'loading' as const,
  },
  {
    id: 'commit-loaded-74a1e6c',
    subject: 'Add the three source-control hub segments',
    author: 'Priya Shah',
    committedAt: '2026-08-26T11:07:00Z',
    filesState: 'loaded' as const,
    files: [
      { path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte', additions: 24, deletions: 3 },
      { path: 'app-mobile/src/pages/chat/source-control/source-control-types.ts', additions: 8, deletions: 0 },
    ],
  },
  {
    id: 'commit-failed-b9130aa',
    subject: 'Tighten the reviewer status presentation',
    author: 'Liam Osei',
    committedAt: '2026-08-25T14:33:00Z',
    filesState: 'failed' as const,
    failureMessage: 'The provider timed out while loading files for this commit.',
  },
] as const;

const branchLabel = 'feature/compact-source-control';
const historyFor = (commit: (typeof COMMITS)[number]) => ({
  branchLabel,
  commits: [commit],
});

const revealFiles = ({ canvasElement }: { canvasElement: HTMLElement }): void => {
  canvasElement.querySelector<HTMLButtonElement>('button[aria-label^="Expand files"]')?.click();
};

export const IdleFiles: Story = {
  args: { data: historyFor(COMMITS[0]) },
  play: revealFiles,
};

export const LoadingFiles: Story = {
  args: { data: historyFor(COMMITS[1]) },
  play: revealFiles,
};

export const LoadedFiles: Story = {
  args: { data: historyFor(COMMITS[2]) },
  play: revealFiles,
};

export const FailedFiles: Story = {
  args: { data: historyFor(COMMITS[3]) },
  play: revealFiles,
};
