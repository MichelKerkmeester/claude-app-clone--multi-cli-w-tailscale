// ───────────────────────────────────────────────────────────────────
// MODULE: REVIEWER LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ReviewerList from './reviewer-list.svelte';

const meta = {
  title: 'Source Control/ReviewerList',
  component: ReviewerList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Displays reviewer identity alongside the host-provided review status, using fixed labels only when a row does not include its own label. Without source-control capability or reviewer rows, the section is omitted.',
      },
    },
  },
} satisfies Meta<typeof ReviewerList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const REVIEWERS = [
  { id: 'reviewer-maya-chen', name: 'Maya Chen', status: 'approved' as const },
  { id: 'reviewer-noah-williams', name: 'Noah Williams', status: 'changes-requested' as const },
  { id: 'reviewer-priya-shah', name: 'Priya Shah', status: 'commented' as const, label: 'Commented · 2 notes' },
  { id: 'reviewer-liam-osei', name: 'Liam Osei', status: 'pending' as const },
];

export const ReviewRoundInProgress: Story = {
  args: {
    reviewers: REVIEWERS,
  },
};
