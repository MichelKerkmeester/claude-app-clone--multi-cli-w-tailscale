// ───────────────────────────────────────────────────────────────────
// MODULE: UPSTREAM STATUS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import UpstreamStatus from './upstream-status.svelte';

const meta = {
  title: 'Source Control/UpstreamStatus',
  component: UpstreamStatus,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Renders only an upstream snapshot that contains at least one branch, remote, or ahead/behind field; an empty object is intentionally inert. Without source-control capability or such a snapshot, nothing is rendered.',
      },
    },
  },
} satisfies Meta<typeof UpstreamStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const BRANCH = {
  branch: 'feature/compact-source-control',
  upstream: 'origin/main',
};

export const AheadOnly: Story = {
  args: {
    upstreamStatus: { ...BRANCH, ahead: 3, behind: 0 },
  },
};

export const BehindOnly: Story = {
  args: {
    upstreamStatus: { ...BRANCH, ahead: 0, behind: 4 },
  },
};

export const Diverged: Story = {
  args: {
    upstreamStatus: { ...BRANCH, ahead: 2, behind: 5 },
  },
};
