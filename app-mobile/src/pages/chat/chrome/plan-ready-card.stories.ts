import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

import PlanReadyCard from './plan-ready-card.svelte';

// No plan-artifact fixture exists in demo.ts yet, so this DTO literal follows
// the exact PlanArtifactDto shape (planId · planRevision · title · summary ·
// stepCount · approachCount · validity · occurredAt) and reuses real demo
// values: the todo plan id (`plan_demo_todos`) and its demo timestamp from
// demo.ts. `validity: 'valid'` + live + newest satisfies the component's own
// isReviewablePlanArtifact gate so the card renders.
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
    // A live host snapshot, never a cached value — the card only renders then.
    isLive: true,
    isNewest: true,
    canReview: true,
    onReview: noop,
  },
};

export const WaitingForLiveConfirmation: Story = {
  args: {
    ...Ready.args,
    // False until the live session has an opaque binding in memory; the CTA
    // reads "Waiting for live confirmation" and stays disabled.
    canReview: false,
  },
};
