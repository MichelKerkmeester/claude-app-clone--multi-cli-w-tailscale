// ───────────────────────────────────────────────────────────────────
// MODULE: PLAN READY CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

import PlanReadyCard from './card-plan-ready.svelte';

// Demo DTO shape + timestamp fixtures.
const DEMO_PLAN_ARTIFACT = {
  planId: 'plan_demo_todos',
  planRevision: 1,
  title: 'Refactor the session composer',
  summary:
    'Split the composer into attachment, draft and submit phases with a read-only plan gate before execution.',
  stepCount: 4,
  approachCount: 2,
  validity: 'valid',
  occurredAt: '2026-08-18T09:05:00.000Z',
} satisfies PlanArtifactDto;

const noop = (): void => {};

const meta = {
  title: 'Chrome/PlanReadyCard',
  component: PlanReadyCard,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanReadyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    artifact: DEMO_PLAN_ARTIFACT,
    // Requires a live host snapshot, not cache.
    isLive: true,
    isNewest: true,
    canReview: true,
    onReview: noop,
  },
};

export const WaitingForLiveConfirmation: Story = {
  args: {
    ...Ready.args,
    // No binding: CTA fails closed.
    canReview: false,
  },
};
