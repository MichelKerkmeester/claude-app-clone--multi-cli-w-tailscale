// ───────────────────────────────────────────────────────────────────
// MODULE: REVIEW SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { StoryObj } from '@storybook/sveltekit';
import type { ApprovalCardDto, SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import {
  installStoryHostFetch,
  storyHostHttpError,
} from '$shared/fixtures/story-host-fetch.js';
import Review from './screen-review.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const DEMO_SESSIONS = demoPostJson('/api/sessions', {}) as {
  sessions: readonly SessionCardDto[];
};
const SESSION_IDS: readonly { readonly id: string }[] = DEMO_SESSIONS.sessions.map(
  (session) => ({ id: session.id }),
);

const APPROVAL_DIGEST = '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';

function demoApproval(sessionId: string, tool: 'shell' | 'edit'): ApprovalCardDto {
  return {
    approvalId: `approval_${sessionId.replaceAll('-', '_')}_${tool}`,
    sessionId,
    epoch: 'demo-epoch-01',
    tool,
    canonicalArguments:
      tool === 'shell' ? '{"command":"npm test"}' : '{"path":"app-mobile/src/shared/format/view-helpers.ts"}',
    digest: APPROVAL_DIGEST,
    policyVersion: 1,
    revision: 1,
    requestedAt: '2026-08-28T11:52:00.000Z',
    expiresAt: '2026-08-28T12:05:00.000Z',
    source: 'explicit',
    status: 'pending',
    reason: null,
  };
}

const DEMO_APPROVALS: readonly ApprovalCardDto[] = SESSION_IDS.map((session) =>
  demoApproval(session.id, session.id.includes('triage') ? 'edit' : 'shell'),
);

const FOCUSED_APPROVAL_ID = SESSION_IDS[0]
  ? `approval_${SESSION_IDS[0].id.replaceAll('-', '_')}_shell`
  : null;

const noop = (): void => {};

// ───────────────────────────────────────────────────────────────────
// 2. STORY CONTROLS
// ───────────────────────────────────────────────────────────────────

const STORY_CONTROLS = 'Story controls';

const QUEUE_STATE_OPTIONS = ['empty', 'populated', 'error'] as const;
type QueueState = (typeof QUEUE_STATE_OPTIONS)[number];

type ReviewStoryArgs = {
  queueState: QueueState;
  pendingCount: number;
  focusId: string | null;
};

function clampCount(pendingCount: number): number {
  if (!Number.isFinite(pendingCount) || pendingCount <= 0) return 0;
  return Math.min(Math.floor(pendingCount), DEMO_APPROVALS.length);
}

function sessionIdFromBody(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'sessionId' in body) {
    return String((body as { sessionId: unknown }).sessionId);
  }
  return SESSION_IDS[0]?.id ?? 'demo-session-refactor';
}

// Queue state owns the host answer. Count slices the demo approvals only when
// that state actually shows cards — empty/error with leftover items would still
// look populated because the list renders any returned approval. There is no
// loading branch: the screen stays on the empty copy until a host page arrives.
function approvalsFor(queueState: QueueState, pendingCount: number): readonly ApprovalCardDto[] {
  if (queueState !== 'populated') return [];
  return DEMO_APPROVALS.slice(0, clampCount(pendingCount));
}

function installReviewHost(queueState: QueueState, pendingCount: number): () => void {
  if (queueState === 'error') {
    return installStoryHostFetch({
      '/api/approvals': () => storyHostHttpError(502),
    });
  }
  const pending = approvalsFor(queueState, pendingCount);
  return installStoryHostFetch({
    '/api/approvals': (body) => ({
      approvals: pending.filter((approval) => approval.sessionId === sessionIdFromBody(body)),
    }),
  });
}

function reviewProps(focusId: string | null) {
  return {
    sessions: SESSION_IDS,
    onBack: noop,
    focusId,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. META
// ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Views/Review',
  component: Review,
  tags: ['autodocs'],
  args: {
    queueState: 'populated',
    pendingCount: DEMO_APPROVALS.length,
    focusId: null,
  },
  argTypes: {
    queueState: {
      control: 'radio',
      options: [...QUEUE_STATE_OPTIONS],
      table: { category: STORY_CONTROLS },
    },
    pendingCount: {
      control: { type: 'range', min: 0, max: DEMO_APPROVALS.length, step: 1 },
      table: { category: STORY_CONTROLS },
    },
  },
  parameters: {
    controls: {
      exclude: ['sessions', 'onBack'],
    },
  },
  beforeEach: ({ args }: { args: Partial<ReviewStoryArgs> }) =>
    installReviewHost(
      args.queueState ?? 'populated',
      args.pendingCount ?? DEMO_APPROVALS.length,
    ),
  render: (args: Partial<ReviewStoryArgs>) => ({
    Component: Review,
    props: reviewProps(args.focusId ?? null),
  }),
};

export default meta;
type Story = StoryObj<ReviewStoryArgs>;

export const Default: Story = {
  args: {
    queueState: 'populated',
    pendingCount: DEMO_APPROVALS.length,
    focusId: null,
  },
};

export const Focused: Story = {
  args: {
    queueState: 'populated',
    pendingCount: DEMO_APPROVALS.length,
    focusId: FOCUSED_APPROVAL_ID,
  },
};

export const HostError: Story = {
  args: {
    queueState: 'error',
    pendingCount: 0,
    focusId: null,
  },
};
