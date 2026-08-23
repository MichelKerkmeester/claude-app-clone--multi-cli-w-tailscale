import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { PlanArtifactDto } from '@pi-remote/pi-rpc-protocol';

import PlanReviewSheet from './plan-review-sheet.svelte';

// No plan-artifact fixture exists in demo.ts yet, so this DTO literal follows
// the exact PlanArtifactDto shape (planId · planRevision · title · summary ·
// stepCount · approachCount · validity · occurredAt) and reuses real demo
// values: the todo plan id (`plan_demo_todos`) and its demo timestamp from
// demo.ts. The sheet renders only for a valid artifact; `isOpen: true` forces
// the real modal content through its portal.
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

const baseArgs = {
  isOpen: true,
  onOpenChange: noop,
  artifact: DEMO_PLAN_ARTIFACT,
  onKeepPlanning: noop,
  onRevisePlan: noop,
  onLeaveWithoutRunning: noop,
  onExecuteReviewedPlan: noop,
};

const meta = {
  title: 'Chrome/PlanReviewSheet',
  component: PlanReviewSheet,
  tags: ['autodocs'],
} satisfies Meta<typeof PlanReviewSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: baseArgs,
};

export const Executing: Story = {
  args: {
    ...baseArgs,
    // The execute CTA is disabled while the execution lease is in flight.
    isExecuting: true,
  },
};
