// ───────────────────────────────────────────────────────────────────
// MODULE: PULL REQUEST DETAILS SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import SheetPrDetails from './sheet-pr-details.svelte';

const meta = {
  title: 'Source Control/SheetPrDetails',
  component: SheetPrDetails,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Details are shown only for an open, capability-supported read-only sheet; missing optional provider fields are left out rather than replaced with placeholders. External navigation is allowed only for host URLs with a safe external scheme.',
      },
    },
  },
} satisfies Meta<typeof SheetPrDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const OPEN_PULL_REQUEST = {
  state: 'open',
  rollup: 'passing',
  commentCount: 8,
  stateLabel: 'Open',
  rollupLabel: 'Checks passing',
  title: 'Add compact source-control surfaces to the chat view',
  number: 1842,
  webUrl: 'https://github.com/acme/atlas/pull/1842',
  description:
    'Adds the read-only pull-request summary, check rollup, and reviewer context to the session sidebar.',
};

export const OpenPullRequest: Story = {
  args: {
    open: true,
    details: OPEN_PULL_REQUEST,
  },
};
