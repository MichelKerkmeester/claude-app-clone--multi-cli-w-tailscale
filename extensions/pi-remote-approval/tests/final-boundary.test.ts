// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Final Boundary Tests
// ───────────────────────────────────────────────────────────────────

import { approvalActionDigest } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it, vi } from 'vitest';

import {
  createAskQuestionAnswerAdapter,
  createFinalBoundaryHandler,
} from '../src/index.js';

const context = { sessionManager: { getSessionId: () => 'session_local' } };

describe('Pi final-boundary fixture', () => {
  it('allows only an exact requested and consumed action', async () => {
    const request = vi.fn(async () => ({
      requested: true as const,
      approvalId: 'approval_fixture',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
    }));
    const consume = vi.fn(
      async (input: {
        readonly action: Parameters<typeof approvalActionDigest>[0];
        readonly digest: string;
      }) => {
        return input.digest === approvalActionDigest(input.action) &&
          input.action.arguments === FIXTURE_INPUT
          ? { allowed: true as const }
          : { allowed: false as const, reason: 'digest-mismatch' };
      },
    );
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledOnce();
    expect(await handler({ toolName: 'edit', input: { path: 'changed.txt' } }, context)).toEqual({
      block: true,
      reason: 'digest-mismatch',
    });
  });

  it('fails closed when the relay is unavailable and ignores read-only tools', async () => {
    const request = vi.fn(async () => {
      throw new Error('offline');
    });
    const consume = vi.fn(async () => ({ allowed: true as const }));
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toEqual({
      block: true,
      reason: 'approval-authorizer-unavailable',
    });
    expect(await handler({ toolName: 'read', input: FIXTURE_INPUT }, context)).toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
    expect(consume).not.toHaveBeenCalled();
  });

  it('blocks a denied request before attempting lease consumption', async () => {
    const request = vi.fn(async () => ({ requested: false as const, reason: 'mutation-disabled' }));
    const consume = vi.fn(async () => ({ allowed: true as const }));
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toEqual({
      block: true,
      reason: 'mutation-disabled',
    });
    expect(consume).not.toHaveBeenCalled();
  });

  it('re-reads the current question and maps a confirmed callback to accepted', async () => {
    const readCurrentPendingQuestion = vi.fn(async () => PENDING_QUESTION);
    const submitAnswer = vi.fn(async () => ({ status: 'accepted' }));
    const adapter = createAskQuestionAnswerAdapter({
      readCurrentPendingQuestion,
      submitAnswer,
    });

    await expect(
      adapter({
        sessionId: 'session_local',
        questionId: 'question_local',
        expectedRevision: 3,
        principal: 'operator@example.com',
        answer: { optionIds: ['option_b', 'option_a'] },
        clientMutationId: 'mutation_local',
      }),
    ).resolves.toEqual({ status: 'accepted' });
    expect(submitAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ answer: { optionIds: ['option_a', 'option_b'] } }),
    );
  });

  it('rejects a superseded pending question before invoking the callback', async () => {
    const submitAnswer = vi.fn(async () => ({ status: 'accepted' }));
    const adapter = createAskQuestionAnswerAdapter({
      readCurrentPendingQuestion: vi.fn(async () => ({ ...PENDING_QUESTION, revision: 4 })),
      submitAnswer,
    });

    await expect(
      adapter({
        sessionId: 'session_local',
        questionId: 'question_local',
        expectedRevision: 3,
        principal: 'operator@example.com',
        answer: { optionIds: ['option_a'] },
        clientMutationId: 'mutation_stale',
      }),
    ).resolves.toEqual({ status: 'rejected', reason: 'revision-mismatch' });
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('re-validates the final pending-question shape and rejects plan or full-access fields', async () => {
    const submitAnswer = vi.fn(async () => ({ status: 'accepted' }));
    const readCurrentPendingQuestion = vi.fn(async () => ({
      ...PENDING_QUESTION,
      planMode: 'build',
      fullAccess: true,
    }));
    const adapter = createAskQuestionAnswerAdapter({
      readCurrentPendingQuestion,
      submitAnswer,
    });

    await expect(
      adapter({
        sessionId: 'session_local',
        questionId: 'question_local',
        expectedRevision: 3,
        principal: 'operator@example.com',
        answer: { optionIds: ['option_a'] },
        clientMutationId: 'mutation_authority_fields',
      }),
    ).resolves.toEqual({ status: 'rejected', reason: 'question-withdrawn' });
    expect(readCurrentPendingQuestion).toHaveBeenCalledOnce();
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('maps a lost callback acknowledgement to terminal delivery-unknown', async () => {
    const submitAnswer = vi.fn(async () => {
      throw new Error('callback transport unavailable');
    });
    const adapter = createAskQuestionAnswerAdapter({
      readCurrentPendingQuestion: vi.fn(async () => PENDING_QUESTION),
      submitAnswer,
    });

    await expect(
      adapter({
        sessionId: 'session_local',
        questionId: 'question_local',
        expectedRevision: 3,
        principal: 'operator@example.com',
        answer: { optionIds: ['option_a'] },
        clientMutationId: 'mutation_unknown',
      }),
    ).resolves.toEqual({ status: 'delivery-unknown' });
    expect(submitAnswer).toHaveBeenCalledOnce();
  });
});

const FIXTURE_INPUT = { path: 'safe.txt', content: 'hello' } as const;

const PENDING_QUESTION = {
  sessionId: 'session_local',
  questionId: 'question_local',
  revision: 3,
  selectionMode: 'multiple' as const,
  display: {
    prompt: 'Choose an operation.',
    options: [
      { id: 'option_a', label: 'Allow' },
      { id: 'option_b', label: 'Deny' },
    ],
    freeText: { allowed: false, required: false },
    minSelections: 1,
    maxSelections: 2,
  },
};

function fixtureOptions(
  authorizer = {
    request: async () => ({
      requested: true as const,
      approvalId: 'approval_fixture',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
    }),
    consume: async () => ({ allowed: true as const }),
  },
) {
  return {
    principal: () => 'operator@example.com',
    epoch: () => 'epoch_one',
    policyVersion: 1,
    protectedTools: new Set(['edit', 'write', 'bash']),
    authorizer,
  };
}
