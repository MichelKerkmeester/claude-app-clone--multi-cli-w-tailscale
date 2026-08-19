// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Redaction Tests
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  isFilePreviewBlock,
  isRedactedAttachmentBlock,
  isTranscriptBlock,
  isRichTranscriptBlock,
  isPlanSnapshotDto,
  isTodoProjectionV1,
  type AskQuestionTranscriptMeta,
  type Envelope,
  type PiRpcEvent,
} from '@pi-remote/pi-rpc-protocol';

import { publishPiEvent } from '../src/index.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';
import {
  isControlPlaneProjection,
  projectPlanSnapshot,
  redactEnvelope,
} from '../src/store/redaction.js';

const ARTIFACT_EVENT = {
  type: 'extension_ui_request',
  method: 'setPlan',
  statusKey: 'pi-remote-plan-artifact',
  plan: {
    planId: 'plan_007',
    planRevision: 3,
    planToken: 'token_plan_binding_abcdef0123456789',
    validity: 'valid',
    title: 'Harden the relay boundary',
    summary: 'Redacted outline only',
    stepCount: 4,
    approachCount: 2,
  },
};

const RICH_FIXTURES = JSON.parse(
  readFileSync(new URL('../src/fixtures/rich-content-redacted.json', import.meta.url), 'utf8'),
) as {
  readonly fixtures: readonly {
    readonly name: string;
    readonly event?: unknown;
    readonly payload?: unknown;
    readonly expectedMarkers?: readonly string[];
    readonly expected?: string;
  }[];
};

function envelopeWith(payload: Envelope['payload']): Envelope {
  return {
    v: 1,
    eventId: 'event_redaction',
    kind: 'pi.tool_execution_end',
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: 'session_local',
    epoch: 'epoch_redaction',
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('canonical redaction', () => {
  it('keeps deterministic rich event fixtures redacted and legacy fixtures non-rich', () => {
    let sequence = 0;
    const projector = new TranscriptProjector();
    for (const fixture of RICH_FIXTURES.fixtures) {
      if (fixture.payload !== undefined) {
        expect(isTranscriptBlock(fixture.payload)).toBe(fixture.expected === 'legacy-only');
        expect(isRichTranscriptBlock(fixture.payload)).toBe(false);
        continue;
      }
      const blocks = projector.project(fixture.event as PiRpcEvent, {
        occurredAt: '2026-01-01T00:00:00.000Z',
        nextSequence: () => ++sequence,
      });
      const redacted = blocks.map((block) => redactEnvelope(envelopeWith(block)).payload);
      const serialized = JSON.stringify(redacted);
      for (const marker of fixture.expectedMarkers ?? []) {
        expect(serialized).toContain(marker);
      }
      for (const forbidden of ['fixture-canary', 'fixture-user:fixture-pass', '/Users/fixture/']) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it('removes path fields, private prompts and secret fields recursively', () => {
    const redacted = redactEnvelope(
      envelopeWith({
        cwd: '/Users/alice/private-project',
        prompt: 'private request',
        nested: {
          apiKey: 'sk-example-secret-value',
          output: 'read /Users/alice/private-project/file.ts with token=abc123',
        },
      }),
    );
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain('/Users/alice');
    expect(serialized).not.toContain('private request');
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('sk-example-secret-value');
    expect(serialized).toContain('[REDACTED_PATH]');
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(redacted.redaction.fieldsRedacted).toBeGreaterThanOrEqual(4);
    expect(redacted.redaction.reasons).toEqual(['path', 'private-text', 'secret']);
  });

  it('redacts todo display fields and refuses detail-bearing projection payloads', () => {
    const candidate: Envelope = {
      ...envelopeWith({
        planId: 'plan_redaction_001',
        source: 'pi',
        revision: 1,
        updatedAt: null,
        tasks: [
          {
            id: 'task_redaction_001',
            title: 'Read /Users/private/project.txt',
            state: 'pending',
            group: 'token=todo-group-secret',
            order: 0,
            revision: 1,
            updatedAt: null,
          },
        ],
      }),
      kind: 'todo.snapshot.v1',
    };
    const redacted = redactEnvelope(candidate);
    expect(isTodoProjectionV1(redacted.payload)).toBe(true);
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain('/Users/private');
    expect(serialized).not.toContain('todo-group-secret');

    const store = new RelayStore();
    try {
      const sync = new SyncHub(store);
      const logs: string[] = [];
      const messages: unknown[] = [];
      sync.onCommitted((envelope) => logs.push(JSON.stringify(envelope)));
      sync.subscribe(
        {
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        },
        (message) => messages.push(message),
      );
      sync.publish(candidate);
      const boundary = JSON.stringify({
        page: store.createSyncPlan({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        }),
        logs,
        messages,
      });
      expect(boundary).not.toContain('/Users/private');
      expect(boundary).not.toContain('todo-group-secret');
      expect(boundary).toContain('[REDACTED_PATH]');
      expect(boundary).toContain('[REDACTED_SECRET]');
    } finally {
      store.close();
    }

    expect(() =>
      redactEnvelope({
        ...candidate,
        payload: {
          ...(candidate.payload as object),
          tasks: [
            {
              ...((candidate.payload as { tasks: readonly object[] }).tasks[0] ?? {}),
              detail: 'detail-canary',
            },
          ],
        },
      }),
    ).toThrow('Relay refused a malformed todo task projection.');
  });

  it('does not mutate the incoming envelope', () => {
    const source = envelopeWith({ path: '/tmp/source.txt' });
    const redacted = redactEnvelope(source);

    expect(source.payload).toEqual({ path: '/tmp/source.txt' });
    expect(redacted.payload).toEqual({ path: '[REDACTED_PATH]' });
  });

  it('structurally allowlists attachment cards before storage and sync', () => {
    const candidate: Envelope = {
      ...envelopeWith({
        kind: 'attachment',
        id: 'attachment_block_001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-01-01T00:00:00.000Z',
        role: 'user',
        mediaKind: 'image',
        ordinal: 1,
        status: 'delivered',
        previewRetained: false,
        filename: 'private.png',
        path: '/Users/private.png',
        hash: 'digest-canary',
        url: 'https://private.example/image',
        exif: { gps: 'private' },
        ocr: 'private words',
        generatedCaption: 'private caption',
        providerPayload: { data: 'PIXEL_CANARY' },
        decoderError: 'private decoder detail',
      }),
      kind: 'transcript.block',
    };
    const redacted = redactEnvelope(candidate);
    expect(isRedactedAttachmentBlock(redacted.payload)).toBe(true);
    expect(redacted.payload).toEqual({
      kind: 'attachment',
      id: 'attachment_block_001',
      revision: 1,
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      role: 'user',
      mediaKind: 'image',
      ordinal: 1,
      status: 'delivered',
      previewRetained: false,
    });

    const store = new RelayStore();
    try {
      const committed = store.appendEnvelope(candidate);
      const durable = JSON.stringify({
        committed,
        page: store.getTranscriptPage({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        }),
        sync: store.createSyncPlan({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        }),
      });
      for (const forbidden of [
        'private.png',
        '/Users/private.png',
        'digest-canary',
        'https://private.example/image',
        'private words',
        'private caption',
        'PIXEL_CANARY',
        'private decoder detail',
      ]) {
        expect(durable).not.toContain(forbidden);
      }
    } finally {
      store.close();
    }
  });

  it('rejects ask-question display at redaction and keeps metadata-only replay content-free', () => {
    const displayPayload = {
      type: 'session.ask-question.presented',
      sessionId: 'session_local',
      questionId: 'question_release_001',
      activityId: 'activity_release_001',
      revision: 3,
      display: {
        prompt: 'question-content-canary',
        options: [{ id: 'option_release_001', label: 'option-content-canary' }],
        freeText: {
          allowed: true,
          required: false,
          placeholder: 'placeholder-content-canary',
          maxLength: 80,
        },
      },
      selectionMode: 'single',
      answerCapability: {
        scope: 'ask-question.answer',
        ticketRef: 'ticket-content-canary',
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
    expect(() => redactEnvelope(envelopeWith(displayPayload as Envelope['payload']))).toThrow(
      'authenticated volatile read',
    );

    const metadata: AskQuestionTranscriptMeta = {
      id: 'block_release_question_001',
      revision: 1,
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      kind: 'ask-question',
      activityId: 'activity_release_001',
      questionId: 'question_release_001',
      sessionId: 'session_local',
      presentedRevision: 3,
      status: 'presented',
    };
    const store = new RelayStore();
    try {
      const sync = new SyncHub(store);
      const messages: unknown[] = [];
      sync.subscribe(
        {
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        },
        (message) => messages.push(message),
      );
      sync.publish({
        ...envelopeWith(metadata as unknown as Envelope['payload']),
        kind: 'transcript.block',
      });
      const boundary = JSON.stringify({
        page: store.getTranscriptPage({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        }),
        messages,
      });
      for (const forbidden of [
        'question-content-canary',
        'option-content-canary',
        'placeholder-content-canary',
        'ticket-content-canary',
        'answer-content-canary',
        'digest-content-canary',
      ]) {
        expect(boundary).not.toContain(forbidden);
      }
      expect(boundary).toContain('question_release_001');
      expect(boundary).toContain('presented');
    } finally {
      store.close();
    }
  });

  it('redacts rich projections before storage, page responses, sync, and errors', () => {
    const projector = new TranscriptProjector();
    const block = projector.project(
      {
        type: 'tool_execution_end',
        toolCallId: 'call_redaction_001',
        toolName: 'custom /Users/private-tool',
        result: {
          content: [
            {
              type: 'text',
              text: 'read /Users/alice/private.txt token=rich-canary https://user:pass@example.test/x',
            },
          ],
        },
        isError: false,
        metadata: {
          shellKind: 'bash',
          lifecycle: 'completed',
          terminalCheckpoint: 'terminal',
          outputCompleteness: 'complete',
          note: '\u001b[31m\u202e rich-canary',
        },
      } as PiRpcEvent,
      { occurredAt: '2026-01-01T00:00:00.000Z', nextSequence: () => 1 },
    )[0];
    expect(block).toBeDefined();

    const candidate: Envelope = {
      ...envelopeWith(block ?? { value: 'missing' }),
      kind: 'transcript.block',
      payload: block ?? { value: 'missing' },
    };
    const redacted = redactEnvelope(candidate);
    const direct = JSON.stringify(redacted);
    expect(isRichTranscriptBlock(redacted.payload)).toBe(true);
    for (const sentinel of ['rich-canary', '/Users/alice', 'user:pass', 'private-tool']) {
      expect(direct).not.toContain(sentinel);
    }
    expect(direct).toContain('[REDACTED_PATH]');
    expect(direct).toContain('[REDACTED_SECRET]');
    expect(direct).toContain('[REDACTED_TOOL]');
    expect(redacted.redaction.fieldsRedacted).toBeGreaterThan(0);
    expect(
      JSON.stringify(
        redactEnvelope(envelopeWith({ metadata: { note: '\u001b[31m\u202e metadata-canary' } })),
      ),
    ).toContain('[REDACTED_CONTROL]');

    const store = new RelayStore();
    try {
      const sync = new SyncHub(store);
      const messages: unknown[] = [];
      const logs: string[] = [];
      sync.onCommitted((envelope) => logs.push(JSON.stringify(envelope)));
      sync.subscribe(
        {
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        },
        (message) => messages.push(message),
      );
      const stored = sync.publish(candidate);
      const page = store.getTranscriptPage({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      });
      const boundary = JSON.stringify({ stored, page, messages });
      for (const sentinel of ['rich-canary', '/Users/alice', 'user:pass', 'private-tool']) {
        expect(boundary).not.toContain(sentinel);
      }
      expect(boundary).toContain('[REDACTED_SECRET]');
      expect(boundary).toContain('[REDACTED_TOOL]');
      const serializedLogs = logs.join('\n');
      expect(serializedLogs).toContain('[REDACTED_SECRET]');
      expect(serializedLogs).toContain('[REDACTED_PATH]');
      for (const sentinel of ['rich-canary', '/Users/alice', 'user:pass', 'private-tool']) {
        expect(serializedLogs).not.toContain(sentinel);
      }

      let errorText = '';
      try {
        store.appendEnvelope({
          ...candidate,
          eventId: 'event_malformed_rich',
          payload: {
            ...(block as unknown as Record<string, unknown>),
            lifecycle: 'not-a-lifecycle',
            metadata: 'malformed-canary',
          } as unknown as Envelope['payload'],
        });
      } catch (error: unknown) {
        errorText = error instanceof Error ? error.message : String(error);
      }
      expect(errorText).toContain(
        'Relay refused a malformed transcript projection after redaction.',
      );
      expect(errorText).toContain('[REDACTED_SECRET]');
      expect(errorText).toContain('[REDACTED_PATH]');
      expect(errorText).not.toContain('rich-canary');
      expect(errorText).not.toContain('/Users/alice');
    } finally {
      store.close();
    }
  });

  it('redacts rich canonical source before it can become a renderer or worker input', () => {
    const canary = 'rich-source-secret-001';
    const redacted = redactEnvelope(
      envelopeWith({
        id: 'rich-source-block',
        revision: 4,
        seq: 4,
        kind: 'text_artifact',
        label: 'document',
        source: `token=${canary} path=/Users/alice/private.txt \u001b[31m\u202e`,
        redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      }),
    );
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain(canary);
    expect(serialized).not.toContain('/Users/alice');
    expect(serialized).not.toContain('\u001b');
    expect(serialized).not.toContain('\u202e');
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(serialized).toContain('[REDACTED_PATH]');
    expect(serialized).toContain('[REDACTED_CONTROL]');
  });

  it('strips the raw plan binding before any persistence, replay or broadcast', () => {
    const redacted = redactEnvelope(
      envelopeWith({
        ...ARTIFACT_EVENT,
        plan: {
          ...ARTIFACT_EVENT.plan,
          apiKey: 'sk-plan-canary',
          workingDirectory: '/Users/operator/private-repo',
        },
      }),
    );
    const serialized = JSON.stringify(redacted);
    for (const canary of [
      'token_plan_binding_abcdef0123456789',
      'sk-plan-canary',
      '/Users/operator',
    ]) {
      expect(serialized.includes(canary)).toBe(false);
    }
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(serialized).toContain('[REDACTED_PATH]');
  });

  it('projects the plan snapshot without ever emitting the opaque binding', () => {
    const snapshot = projectPlanSnapshot(
      {
        planId: 'plan_007',
        planRevision: 3,
        planToken: 'token_plan_binding_abcdef0123456789',
        validity: 'valid',
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
      },
      '2026-01-01T00:00:00.000Z',
    );
    expect(isPlanSnapshotDto(snapshot)).toBe(true);
    const serialized = JSON.stringify(snapshot);
    for (const canary of ['token_plan_binding', 'operator@example.com', 'host-42', '/Users/']) {
      expect(serialized.includes(canary)).toBe(false);
    }
    expect(snapshot).toEqual({
      planId: 'plan_007',
      planRevision: 3,
      validity: 'valid',
      artifact: {
        planId: 'plan_007',
        planRevision: 3,
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
        validity: 'valid',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(projectPlanSnapshot(null, '2026-01-01T00:00:00.000Z')).toEqual({
      planId: null,
      planRevision: 0,
      validity: 'none',
      artifact: null,
    });
  });

  it('suppresses control-plane transcript projections before persistence and sync', () => {
    const store = new RelayStore();
    try {
      const identity = {
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      } as const;
      const base = envelopeWith({ value: 1 });
      store.appendEnvelope({
        ...base,
        eventId: 'event_control_raw',
        kind: 'pi.extension_ui_request',
      });
      const controlResidue: Envelope = {
        ...base,
        eventId: 'event_control_block',
        kind: 'transcript.block',
        seq: 2,
        payload: {
          id: 'block_control',
          revision: 1,
          seq: 2,
          occurredAt: '2026-01-01T00:00:00.000Z',
          kind: 'plan',
          items: [{ text: 'Extension requested setStatus', done: false }],
        },
      };
      expect(isControlPlaneProjection(controlResidue.payload)).toBe(true);
      expect(store.appendEnvelope(controlResidue).inserted).toBe(false);
      const userBlock: Envelope = {
        ...base,
        eventId: 'event_user_block',
        kind: 'transcript.block',
        seq: 2,
        payload: {
          id: 'block_user',
          revision: 1,
          seq: 2,
          occurredAt: '2026-01-01T00:00:00.000Z',
          kind: 'plan',
          items: [{ text: 'Turn 1', done: false }],
        },
      };
      expect(isControlPlaneProjection(userBlock.payload)).toBe(false);
      expect(store.appendEnvelope(userBlock).inserted).toBe(true);

      const page = store.getTranscriptPage(identity);
      expect(page.items.map((item) => item.id)).toEqual(['block_user']);
      const replay = store.createSyncPlan(identity);
      const serialized = JSON.stringify({ page, replay });
      expect(serialized).not.toContain('Extension requested setStatus');
      expect(serialized).not.toContain('event_control_block');
    } finally {
      store.close();
    }
  });

  it('publishes a preview only from an explicit approved snapshot and never persists its source bytes', () => {
    const store = new RelayStore();
    try {
      const sync = new SyncHub(store);
      const approved = {
        type: 'tool_execution_end',
        toolCallId: 'call_artifact_001',
        toolName: 'read',
        result: {
          artifactSnapshot: {
            approved: true,
            artifactId: 'artifact_redaction_001',
            revision: 'rev_redaction_001',
            displayName: 'safe.txt',
            renderer: 'text',
            mimeType: 'text/plain',
            text: 'safe sanitized bytes',
            redaction: 'applied',
            completeness: 'complete',
            shareAllowed: false,
          },
        },
        isError: false,
      } as unknown as PiRpcEvent;
      publishPiEvent(
        store,
        sync,
        new TranscriptProjector(store.artifactStore),
        approved,
        'epoch_artifact',
      );

      const page = store.getTranscriptPage({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      });
      const preview = page.items.find((item) => item.kind === 'file_preview');
      expect(preview).toBeDefined();
      expect(isFilePreviewBlock(preview)).toBe(true);
      const durable = JSON.stringify({
        page,
        replay: store.createSyncPlan({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: 'session_local',
        }),
      });
      expect(durable).not.toContain('safe sanitized bytes');
      expect(durable).not.toContain('artifactSnapshot');

      const unapproved = {
        type: 'tool_execution_end',
        toolCallId: 'call_unapproved_001',
        toolName: 'read',
        result: { content: [{ type: 'text', text: 'tool output only' }] },
        isError: false,
      } as unknown as PiRpcEvent;
      const blocks = new TranscriptProjector(store.artifactStore).project(unapproved, {
        occurredAt: '2026-01-01T00:00:00.000Z',
        nextSequence: () => 99,
        sessionId: 'session_local',
      });
      expect(blocks.some((block) => block.kind === 'file_preview')).toBe(false);
      expect(blocks.some((block) => block.kind === 'tool_result')).toBe(true);
    } finally {
      store.close();
    }
  });
});
