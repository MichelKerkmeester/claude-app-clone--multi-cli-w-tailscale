// ───────────────────────────────────────────────────────────────────
// MODULE: REVIEW SCREEN STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { ApprovalCardDto, SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { demoPostJson } from '$shared/fixtures/demo.js';
import {
  installStoryHostFetch,
  storyHostHttpError,
} from '$shared/fixtures/story-host-fetch.js';
import Review from './screen-review.svelte';

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

const noop = (): void => {};

const meta = {
  title: 'Views/Review',
  component: Review,
  tags: ['autodocs'],
} satisfies Meta<typeof Review>;

export default meta;
type Story = StoryObj<typeof meta>;

function installPopulatedApprovals(): () => void {
  return installStoryHostFetch({
    '/api/approvals': (body) => {
      const sessionId =
        typeof body === 'object' && body !== null && 'sessionId' in body
          ? String((body as { sessionId: unknown }).sessionId)
          : SESSION_IDS[0]?.id ?? 'demo-session-refactor';
      const tool = sessionId.includes('triage') ? 'edit' : 'shell';
      return { approvals: [demoApproval(sessionId, tool)] };
    },
  });
}

export const Default: Story = {
  args: { sessions: SESSION_IDS, onBack: noop, focusId: null },
  beforeEach: installPopulatedApprovals,
};

export const Focused: Story = {
  args: {
    sessions: SESSION_IDS,
    onBack: noop,
    focusId: SESSION_IDS[0] ? `approval_${SESSION_IDS[0].id.replaceAll('-', '_')}_shell` : null,
  },
  beforeEach: installPopulatedApprovals,
};

export const HostError: Story = {
  args: { sessions: SESSION_IDS, onBack: noop, focusId: null },
  beforeEach: () =>
    installStoryHostFetch({
      '/api/approvals': () => storyHostHttpError(502),
    }),
};
