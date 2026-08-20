import { describe, expect, it, vi } from 'vitest';

import {
  askQuestionAnswerDigest,
  type AskQuestionAnswer,
  type AskQuestionPresentedEvent,
} from '@pi-remote/pi-rpc-protocol';

import { AuthService, type ApplicationSession } from '../src/auth/auth-service.js';
import { AskQuestionService } from '../src/ask-question/ask-question-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { projectAskQuestionDisplay, redactEnvelope } from '../src/store/redaction.js';
import { RelayStore } from '../src/store/relay-store.js';
import { serializePushHint, createAttentionPayload } from '../src/push/push-service.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
  epoch: 'epoch_local',
} as const;

const SESSION: ApplicationSession = {
  token: 'session_token_local',
  deviceId: 'device_local',
  principal: 'operator@example.test',
  origin: 'https://pi-remote.example.test',
  expiresAt: '2099-01-01T00:00:00.000Z',
  revoked: false,
};

const PRESENTATION: AskQuestionPresentedEvent = {
  type: 'session.ask-question.presented',
  sessionId: IDENTITY.sessionId,
  questionId: 'question_local',
  activityId: 'activity_local',
  revision: 3,
  display: {
    prompt: 'question-content-canary',
    options: [
      { id: 'option_a', label: 'label-content-canary' },
      { id: 'option_b', label: 'second-label', description: 'description-content-canary' },
    ],
    freeText: { allowed: true, required: false, placeholder: 'placeholder-content-canary', maxLength: 80 },
    minSelections: 1,
    maxSelections: 2,
  },
  selectionMode: 'multiple',
  answerCapability: {
    scope: 'ask-question.answer',
    ticketRef: 'ticket_reference',
    boundRevision: 3,
    expiresAt: '2099-01-01T00:00:10.000Z',
  },
  redaction: {
    applied: true,
    policyVersion: 1,
    contentAvailability: 'available',
    redactedFields: [],
  },
  requiresReadOnlyHint: true,
};

describe('host-owned ask-question mutation lane', () => {
  it('rejects a duplicate question identity at the same revision', () => {
    const harness = createHarness(vi.fn(async () => ({ status: 'accepted' as const })));
    try {
      expect(() => harness.service.presentQuestion(PRESENTATION)).toThrow(
        'identity already exists',
      );
    } finally {
      harness.store.close();
    }
  });

  it('rejects the second of two distinct valid tickets before a second handoff', async () => {
    let release!: () => void;
    const firstHandoff = new Promise<{ readonly status: 'accepted' }>((resolve) => {
      release = () => resolve({ status: 'accepted' });
    });
    const handoff = vi.fn(async () => firstHandoff);
    const harness = createHarness(handoff);
    try {
      const firstTicket = await issueTicket(harness, { optionIds: ['option_a'] }, 'mutation_a');
      const secondTicket = await issueTicket(harness, { optionIds: ['option_b'] }, 'mutation_b');
      const first = harness.service.commitAnswer(
        SESSION,
        answerRequest(firstTicket.ticket, { optionIds: ['option_a'] }, 'mutation_a'),
        harness.auth,
      );
      const second = harness.service.commitAnswer(
        SESSION,
        answerRequest(secondTicket.ticket, { optionIds: ['option_b'] }, 'mutation_b'),
        harness.auth,
      );

      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(handoff).toHaveBeenCalledOnce();
      release();

      await expect(first).resolves.toMatchObject({ status: 'accepted' });
      await expect(second).resolves.toMatchObject({
        status: 'rejected',
        reason: 'question-already-answered',
      });
      expect(handoff).toHaveBeenCalledOnce();
    } finally {
      harness.store.close();
    }
  });

  it('rejects a revision that moves during the fresh pre-handoff read', async () => {
    let revision = 3;
    const handoff = vi.fn(async () => ({ status: 'accepted' as const }));
    const harness = createHarness(handoff, () => ({
      questionId: PRESENTATION.questionId,
      sessionId: PRESENTATION.sessionId,
      revision,
      status: 'pending' as const,
    }));
    try {
      const ticket = await issueTicket(harness, { optionIds: ['option_a'] }, 'mutation_stale');
      revision = 4;
      const result = await harness.service.commitAnswer(
        SESSION,
        answerRequest(ticket.ticket, { optionIds: ['option_a'] }, 'mutation_stale'),
        harness.auth,
      );
      expect(result).toMatchObject({ status: 'rejected', reason: 'revision-mismatch' });
      expect(handoff).not.toHaveBeenCalled();
    } finally {
      harness.store.close();
    }
  });

  it('rejects an answer swap even when the transmitted digest matches the ticket', async () => {
    const handoff = vi.fn(async () => ({ status: 'accepted' as const }));
    const harness = createHarness(handoff);
    try {
      const original: AskQuestionAnswer = { optionIds: ['option_a'] };
      const ticket = await issueTicket(harness, original, 'mutation_swap');
      const swapped: AskQuestionAnswer = { optionIds: ['option_b'] };
      const result = await harness.service.commitAnswer(
        SESSION,
        answerRequest(
          ticket.ticket,
          swapped,
          'mutation_swap',
          askQuestionAnswerDigest(original, digestBinding()),
        ),
        harness.auth,
      );
      expect(result).toMatchObject({ status: 'rejected', reason: 'validation-failed' });
      expect(handoff).not.toHaveBeenCalled();
    } finally {
      harness.store.close();
    }
  });

  it('accepts multi-select answers in either option order and hands off sorted IDs', async () => {
    const handoff = vi.fn(async () => ({ status: 'accepted' as const }));
    const harness = createHarness(handoff);
    try {
      const answer: AskQuestionAnswer = { optionIds: ['option_a', 'option_b'] };
      const ticket = await issueTicket(harness, answer, 'mutation_order');
      const result = await harness.service.commitAnswer(
        SESSION,
        answerRequest(ticket.ticket, { optionIds: ['option_b', 'option_a'] }, 'mutation_order'),
        harness.auth,
      );
      expect(result).toMatchObject({ status: 'accepted' });
      expect(handoff).toHaveBeenCalledWith(
        expect.objectContaining({ answer: { optionIds: ['option_a', 'option_b'] } }),
      );
    } finally {
      harness.store.close();
    }
  });

  it('keeps delivery-unknown terminal and refuses reconciliation by re-mint or retry', async () => {
    const handoff = vi.fn(async () => ({ status: 'delivery-unknown' as const }));
    const harness = createHarness(handoff);
    try {
      const ticket = await issueTicket(harness, { optionIds: ['option_a'] }, 'mutation_unknown');
      const request = answerRequest(ticket.ticket, { optionIds: ['option_a'] }, 'mutation_unknown');
      const first = await harness.service.commitAnswer(SESSION, request, harness.auth);
      expect(first).toMatchObject({ status: 'rejected', reason: 'delivery-unknown' });
      expect(harness.service.getQuestionState(PRESENTATION.questionId)?.status).toBe(
        'delivery-unknown',
      );
      await expect(harness.service.commitAnswer(SESSION, request, harness.auth)).resolves.toEqual(first);
      await expect(
        harness.service.issueAnswerTicket(
          SESSION,
          ticketRequest({ optionIds: ['option_a'] }, 'mutation_retry'),
          harness.auth,
        ),
      ).resolves.toMatchObject({ status: 'rejected', reason: 'question-already-answered' });
      expect(handoff).toHaveBeenCalledOnce();
    } finally {
      harness.store.close();
    }
  });

  it('keeps display content out of persisted, redacted, pushed and logged representations', () => {
    const handoff = vi.fn(async () => ({ status: 'accepted' as const }));
    const harness = createHarness(handoff);
    try {
      const metadata = harness.store.getTranscriptPage({
        hostId: IDENTITY.hostId,
        workspaceRef: IDENTITY.workspaceRef,
        sessionId: IDENTITY.sessionId,
      }).items[0];
      const persisted = JSON.stringify(
        harness.store.getTranscriptPage({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: IDENTITY.sessionId,
        }),
      );
      const sync = JSON.stringify(
        harness.store.createSyncPlan({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: IDENTITY.sessionId,
        }),
      );
      const pushed = serializePushHint(createAttentionPayload('needs_input', 1));
      const logged = JSON.stringify({ metadata, pushed });
      for (const serialized of [persisted, sync, pushed, logged]) {
        expect(serialized).not.toContain('question-content-canary');
        expect(serialized).not.toContain('label-content-canary');
        expect(serialized).not.toContain('description-content-canary');
        expect(serialized).not.toContain('placeholder-content-canary');
      }
      expect(harness.service.getDisplay(IDENTITY.sessionId, PRESENTATION.questionId, 3)).toEqual(
        projectAskQuestionDisplay(PRESENTATION),
      );
      expect(() => redactEnvelope(envelopeWithDisplay())).toThrow(
        'authenticated volatile read',
      );
    } finally {
      harness.store.close();
    }
  });

  it('keeps a committed answer out of persisted, broadcast, push, and result boundaries', async () => {
    const handoff = vi.fn(async () => ({ status: 'accepted' as const }));
    const harness = createHarness(handoff);
    try {
      const answer: AskQuestionAnswer = {
        optionIds: ['option_a'],
        freeText: 'answer-content-canary',
      };
      const ticket = await issueTicket(harness, answer, 'mutation_boundary');
      const result = await harness.service.commitAnswer(
        SESSION,
        answerRequest(ticket.ticket, answer, 'mutation_boundary'),
        harness.auth,
      );
      expect(result).toMatchObject({ status: 'accepted' });

      const boundary = JSON.stringify({
        page: harness.store.getTranscriptPage({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: IDENTITY.sessionId,
        }),
        sync: harness.store.createSyncPlan({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: IDENTITY.sessionId,
        }),
        pushed: serializePushHint(createAttentionPayload('finished', 2)),
        result,
      });
      for (const forbidden of [
        'question-content-canary',
        'label-content-canary',
        'description-content-canary',
        'placeholder-content-canary',
        'answer-content-canary',
        'ticket-content-canary',
        'digest-content-canary',
      ]) {
        expect(boundary).not.toContain(forbidden);
      }
      expect(handoff).toHaveBeenCalledWith(
        expect.objectContaining({ answer: { optionIds: ['option_a'], freeText: 'answer-content-canary' } }),
      );
    } finally {
      harness.store.close();
    }
  });
});

function createHarness(
  handoff: (input: unknown) => Promise<unknown>,
  readAuthoritativeQuestion?: () => {
    readonly questionId: string;
    readonly sessionId: string;
    readonly revision: number;
    readonly status: 'pending';
  },
) {
  const store = new RelayStore();
  const syncHub = new SyncHub(store);
  const auth = new AuthService({
    origin: SESSION.origin,
    hostId: IDENTITY.hostId,
  });
  const service = new AskQuestionService({
    store,
    syncHub,
    hostId: IDENTITY.hostId,
    workspaceRef: IDENTITY.workspaceRef,
    sessionId: IDENTITY.sessionId,
    epoch: IDENTITY.epoch,
    handoff: { submit: handoff },
    canAnswer: () => true,
    ...(readAuthoritativeQuestion === undefined ? {} : { readAuthoritativeQuestion }),
  });
  service.presentQuestion(PRESENTATION);
  return { store, auth, service };
}

async function issueTicket(
  harness: ReturnType<typeof createHarness>,
  answer: AskQuestionAnswer,
  clientMutationId: string,
) {
  const result = await harness.service.issueAnswerTicket(
    SESSION,
    ticketRequest(answer, clientMutationId),
    harness.auth,
  );
  if (result.status !== 'issued') throw new Error(`Ticket issue failed: ${result.reason}`);
  return result.ticket;
}

function ticketRequest(answer: AskQuestionAnswer, clientMutationId: string) {
  return {
    type: 'session.ask-question.answer-ticket' as const,
    sessionId: PRESENTATION.sessionId,
    questionId: PRESENTATION.questionId,
    expectedRevision: PRESENTATION.revision,
    answerDigest: askQuestionAnswerDigest(answer, digestBinding()),
    clientMutationId,
  };
}

function answerRequest(
  ticket: string,
  answer: AskQuestionAnswer,
  clientMutationId: string,
  answerDigest = askQuestionAnswerDigest(answer, digestBinding()),
) {
  return {
    type: 'session.ask-question.answer' as const,
    sessionId: PRESENTATION.sessionId,
    questionId: PRESENTATION.questionId,
    expectedRevision: PRESENTATION.revision,
    ticket,
    answer,
    answerDigest,
    clientMutationId,
  };
}

function digestBinding() {
  return {
    questionId: PRESENTATION.questionId,
    expectedRevision: PRESENTATION.revision,
    principal: SESSION.principal,
  } as const;
}

function envelopeWithDisplay() {
  return {
    v: 1 as const,
    eventId: 'event_display',
    kind: 'session.ask-question.presented',
    hostId: IDENTITY.hostId,
    workspaceRef: IDENTITY.workspaceRef,
    sessionId: IDENTITY.sessionId,
    epoch: IDENTITY.epoch,
    seq: 99,
    occurredAt: '2026-08-18T00:00:00.000Z',
    causedBy: PRESENTATION.questionId,
    payload: PRESENTATION,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}
