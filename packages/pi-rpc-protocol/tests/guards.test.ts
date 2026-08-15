// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Guard Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  approvalActionDigest,
  canonicalizeApprovalAction,
  enrollmentProof,
  isEnrollmentQr,
  isApprovalDecisionCommand,
  isEnvelope,
  isPiRpcCommand,
  isPiRpcEvent,
  isPiRpcResponse,
  isPromptSubmitCommand,
  isPromptSubmitResponse,
  isSessionCardDto,
  isSyncMessage,
  isTranscriptBlock,
  sha256,
} from '../src/index.js';

const ENVELOPE = {
  v: 1,
  eventId: 'event_001',
  kind: 'pi.message_update',
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
  epoch: 'epoch_001',
  seq: 1,
  occurredAt: '2026-01-01T00:00:00.000Z',
  causedBy: null,
  payload: { type: 'message_update' },
  redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
  replay: { eligible: true, snapshotEligible: true },
} as const;

describe('protocol guards', () => {
  it('accepts supported commands, responses and events', () => {
    expect(isPiRpcCommand({ id: 'request_1', type: 'get_state' })).toBe(true);
    expect(isPiRpcCommand({ type: 'prompt', message: 'hello' })).toBe(true);
    expect(
      isPiRpcResponse({
        id: 'request_1',
        type: 'response',
        command: 'get_state',
        success: true,
        data: {},
      }),
    ).toBe(true);
    expect(isPiRpcEvent({ type: 'agent_settled' })).toBe(true);
  });

  it('rejects malformed or unsupported RPC records', () => {
    expect(isPiRpcCommand({ type: 'prompt' })).toBe(false);
    expect(isPiRpcResponse({ type: 'response', command: 'get_state' })).toBe(false);
    expect(isPiRpcEvent({ type: 'response', success: true })).toBe(false);
    expect(isPiRpcEvent({ type: 'future_unpinned_event' })).toBe(false);
  });

  it('validates versioned envelopes and sync bounds', () => {
    expect(isEnvelope(ENVELOPE)).toBe(true);
    expect(isEnvelope({ ...ENVELOPE, seq: 0 })).toBe(false);
    expect(
      isSyncMessage({
        kind: 'sync.delta',
        sessionId: 'session_local',
        epoch: 'epoch_001',
        coversThrough: 1,
        envelopes: [ENVELOPE],
      }),
    ).toBe(true);
    expect(
      isSyncMessage({
        kind: 'sync.gap',
        sessionId: 'session_local',
        epoch: 'epoch_001',
        coversThrough: -1,
        reason: 'retention',
      }),
    ).toBe(false);
    expect(
      isSyncMessage({
        kind: 'sync.delta',
        sessionId: 'session_local',
        epoch: 'epoch_001',
        coversThrough: 1,
        envelopes: [{ ...ENVELOPE, sessionId: 'session_other' }],
      }),
    ).toBe(false);
    expect(
      isSyncMessage({
        kind: 'sync.delta',
        sessionId: 'session_local',
        epoch: 'epoch_001',
        coversThrough: 2,
        envelopes: [{ ...ENVELOPE, eventId: 'event_002', seq: 2 }, ENVELOPE],
      }),
    ).toBe(false);
    expect(
      isSyncMessage({
        kind: 'sync.delta',
        sessionId: 'session_local',
        epoch: 'epoch_001',
        coversThrough: 1,
        envelopes: [{ ...ENVELOPE, eventId: 'event_002', seq: 2 }],
      }),
    ).toBe(false);
  });

  it('validates opaque session cards and all transcript block families', () => {
    expect(
      isSessionCardDto({
        id: 'session_local',
        status: 'idle',
        updatedAt: '2026-01-01T00:00:00.000Z',
        messageCount: 0,
      }),
    ).toBe(true);

    const common = {
      id: 'block_001',
      revision: 1,
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
    };
    const blocks = [
      { ...common, kind: 'text', text: 'hello' },
      { ...common, kind: 'thinking', summary: 'considering' },
      { ...common, kind: 'plan', items: [{ text: 'test', done: false }] },
      { ...common, kind: 'tool_call', toolName: 'read', inputSummary: 'opaque input' },
      { ...common, kind: 'tool_result', toolName: 'read', output: 'ok', isError: false },
      { ...common, kind: 'file_diff', summary: 'one change', patch: '@@ redacted @@' },
      { ...common, kind: 'usage', inputTokens: 1, outputTokens: 2, cost: 0.01 },
    ];

    expect(blocks.every(isTranscriptBlock)).toBe(true);
    expect(isTranscriptBlock({ ...blocks[0], revision: 0 })).toBe(false);
    expect(isTranscriptBlock({ ...common, kind: 'unknown' })).toBe(false);
  });

  it('validates exact-origin enrollment payloads and stable proofs', () => {
    const enrollment = {
      v: 1,
      origin: 'https://pi.example.ts.net',
      pairingId: 'pair_001',
      hostFingerprint: 'host_fingerprint_001',
      challenge: 'challenge_001',
      expiresAt: '2026-01-01T00:05:00.000Z',
    } as const;
    const publicKey = {
      kty: 'EC',
      crv: 'P-256',
      x: 'x'.repeat(43),
      y: 'y'.repeat(43),
    } as const;

    expect(isEnrollmentQr(enrollment)).toBe(true);
    expect(isEnrollmentQr({ ...enrollment, origin: 'https://pi.example.ts.net/path' })).toBe(false);
    expect(enrollmentProof(enrollment, publicKey)).toContain('pi-remote-enrollment-v1');
  });

  it('canonicalizes and binds every exact-action field deterministically', () => {
    const action = {
      principal: 'operator@example.com',
      sessionId: 'session_local',
      epoch: 'epoch_001',
      tool: 'edit',
      arguments: { z: 1, nested: { b: true, a: 'value' }, a: -0 },
      policyVersion: 3,
    } as const;
    const reordered = {
      ...action,
      arguments: { a: 0, nested: { a: 'value', b: true }, z: 1 },
    } as const;

    expect(canonicalizeApprovalAction(action)).toBe(canonicalizeApprovalAction(reordered));
    expect(approvalActionDigest(action)).toBe(approvalActionDigest(reordered));
    expect(approvalActionDigest({ ...action, tool: 'bash' })).not.toBe(
      approvalActionDigest(action),
    );
    expect(approvalActionDigest({ ...action, arguments: { ...action.arguments, z: 2 } })).not.toBe(
      approvalActionDigest(action),
    );
    expect(approvalActionDigest(action)).toHaveLength(64);
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('accepts only exact approval decision command shapes', () => {
    const command = {
      type: 'approval.decide',
      approvalId: 'approval_001',
      decision: 'approve',
      idempotencyKey: 'decision_001',
      epoch: 'epoch_001',
      revision: 1,
      digest: 'a'.repeat(64),
    } as const;
    expect(isApprovalDecisionCommand(command)).toBe(true);
    expect(isApprovalDecisionCommand({ ...command, extra: true })).toBe(false);
    expect(isApprovalDecisionCommand({ ...command, revision: 0 })).toBe(false);
    expect(isApprovalDecisionCommand({ ...command, digest: 'not-a-digest' })).toBe(false);
  });

  it('validates transient prompt commands and authoritative user-block responses', () => {
    const command = {
      type: 'prompt.submit',
      submissionId: 'prompt_submission_001',
      sessionId: 'session_local',
      message: 'Continue',
      ticket: 'ticket_prompt_001',
    } as const;
    const block = {
      id: 'block_prompt_001',
      kind: 'text',
      role: 'user',
      text: 'Continue',
      revision: 1,
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
    } as const;

    expect(isPromptSubmitCommand(command)).toBe(true);
    expect(isPromptSubmitCommand({ ...command, extra: true })).toBe(false);
    expect(isPromptSubmitCommand({ ...command, message: '   ' })).toBe(false);
    expect(isPromptSubmitResponse({ accepted: true, block })).toBe(true);
    expect(isPromptSubmitResponse({ accepted: true, block: { ...block, role: 'assistant' } })).toBe(
      false,
    );
  });
});
