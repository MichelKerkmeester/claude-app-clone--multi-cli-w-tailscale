import { describe, expect, it } from 'vitest';

import {
  askQuestionAnswerDigest,
  isAskQuestionAnswer,
  isAskQuestionAnswerRequest,
  isAskQuestionDisplayDto,
  isAskQuestionPresentedEvent,
  isAskQuestionTranscriptMeta,
  isTranscriptBlock,
} from '../src/index.js';

const PRESENTATION = {
  type: 'session.ask-question.presented',
  sessionId: 'session_local',
  questionId: 'question_local',
  activityId: 'activity_local',
  revision: 3,
  display: {
    prompt: 'Choose a safe operation.',
    options: [
      { id: 'option_a', label: 'Allow' },
      { id: 'option_b', label: 'Deny', description: 'Keep the operation stopped.' },
    ],
    freeText: { allowed: true, required: false, placeholder: 'Optional note', maxLength: 80 },
    minSelections: 1,
    maxSelections: 2,
  },
  selectionMode: 'multiple',
  answerCapability: {
    scope: 'ask-question.answer',
    ticketRef: 'ticket_reference',
    boundRevision: 3,
    expiresAt: '2026-08-18T00:00:10.000Z',
  },
  redaction: {
    applied: true,
    policyVersion: 1,
    contentAvailability: 'available',
    redactedFields: [],
  },
  requiresReadOnlyHint: true,
} as const;

describe('ask-question protocol', () => {
  it('accepts the bounded display contract and rejects unknown display keys', () => {
    expect(isAskQuestionPresentedEvent(PRESENTATION)).toBe(true);
    expect(
      isAskQuestionPresentedEvent({
        ...PRESENTATION,
        display: { ...PRESENTATION.display, prompt: 'x'.repeat(4_097) },
      }),
    ).toBe(false);
    expect(
      isAskQuestionPresentedEvent({
        ...PRESENTATION,
        display: { ...PRESENTATION.display, unexpected: 'not allowed' },
      }),
    ).toBe(false);
    expect(
      isAskQuestionDisplayDto({
        type: 'session.ask-question.display',
        sessionId: PRESENTATION.sessionId,
        questionId: PRESENTATION.questionId,
        activityId: PRESENTATION.activityId,
        revision: PRESENTATION.revision,
        display: PRESENTATION.display,
        selectionMode: PRESENTATION.selectionMode,
        redaction: PRESENTATION.redaction,
        requiresReadOnlyHint: true,
      }),
    ).toBe(true);
  });

  it('rejects duplicate or unknown answer fields before the host lane', () => {
    expect(isAskQuestionAnswer({ optionIds: ['option_a', 'option_a'] })).toBe(false);
    expect(isAskQuestionAnswer({ optionIds: ['option_a'], answer: 'extra' })).toBe(false);
    expect(
      isAskQuestionAnswerRequest({
        type: 'session.ask-question.answer',
        sessionId: 'session_local',
        questionId: 'question_local',
        expectedRevision: 3,
        ticket: 'ticket_reference_long',
        answer: { optionIds: ['option_a'] },
        answerDigest: 'not-a-digest',
        clientMutationId: 'mutation_local',
      }),
    ).toBe(false);
  });

  it('canonicalizes multi-select order and binds the host context into the digest', () => {
    const binding = {
      questionId: 'question_local',
      expectedRevision: 3,
      principal: 'operator@example.test',
    } as const;
    const first = askQuestionAnswerDigest(
      { optionIds: ['option_b', 'option_a'], freeText: 'note' },
      binding,
    );
    const reordered = askQuestionAnswerDigest(
      { optionIds: ['option_a', 'option_b'], freeText: 'note' },
      binding,
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(reordered).toBe(first);
    expect(
      askQuestionAnswerDigest(
        { optionIds: ['option_a', 'option_b'], freeText: 'note' },
        { ...binding, expectedRevision: 4 },
      ),
    ).not.toBe(first);
  });

  it('keeps the durable transcript block metadata-only', () => {
    const metadata = {
      kind: 'ask-question',
      id: 'block_question',
      revision: 1,
      seq: 7,
      occurredAt: '2026-08-18T00:00:00.000Z',
      activityId: 'activity_local',
      questionId: 'question_local',
      sessionId: 'session_local',
      presentedRevision: 3,
      status: 'presented',
    } as const;
    expect(isAskQuestionTranscriptMeta(metadata)).toBe(true);
    expect(isTranscriptBlock(metadata)).toBe(true);
    expect(
      isAskQuestionTranscriptMeta({ ...metadata, prompt: 'must never persist' }),
    ).toBe(false);
    expect(
      isTranscriptBlock({ ...metadata, answer: { optionIds: ['option_a'] } }),
    ).toBe(false);
  });
});
