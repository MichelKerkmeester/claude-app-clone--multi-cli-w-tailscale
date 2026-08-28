// ───────────────────────────────────────────────────────────────────
// MODULE: PULL REQUEST CHIP STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import PrChip from './pr-chip.svelte';

const meta = {
  title: 'Source Control/PrChip',
  component: PrChip,
  tags: ['autodocs'],
} satisfies Meta<typeof PrChip>;

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

export const OpenWithChecks: Story = {
  args: {
    summary: OPEN_PULL_REQUEST,
    details: OPEN_PULL_REQUEST,
  },
};
