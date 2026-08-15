// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Guard Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  approvalActionDigest,
  canonicalizeApprovalAction,
  enrollmentProof,
  isAvailableModelDto,
  isCommandCatalogDto,
  isCommandDescriptorDto,
  isEnrollmentQr,
  isApprovalDecisionCommand,
  isEnvelope,
  isPiRpcCommand,
  isPiRpcEvent,
  isPiRpcResponse,
  isPromptAbortResponse,
  isPromptSubmitCommand,
  isPromptSubmitResponse,
  isRuntimeControlCommand,
  isRuntimeControlResponse,
  isRuntimeModelCatalogDto,
  isRuntimeOperation,
  isRuntimeStateDto,
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
    expect(isPromptSubmitCommand({ ...command, streamingBehavior: 'steer' })).toBe(true);
    expect(isPromptSubmitCommand({ ...command, streamingBehavior: 'followUp' })).toBe(true);
    expect(isPromptSubmitCommand({ ...command, streamingBehavior: 'nope' })).toBe(false);
    expect(isPromptSubmitResponse({ accepted: true, block })).toBe(true);
    expect(isPromptSubmitResponse({ accepted: true, block: { ...block, role: 'assistant' } })).toBe(
      false,
    );
  });
});

describe('runtime control guards', () => {
  const state = {
    sessionId: 'session_local',
    revision: 3,
    model: { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
    thinkingLevel: 'high',
    availableThinkingLevels: ['low', 'medium', 'high'],
    mode: 'plan',
    streaming: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as const;
  const descriptor = {
    name: 'help',
    description: null,
    source: 'prompt',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
  } as const;

  it('accepts well-formed model descriptors and rejects extras, path values and overlong ids', () => {
    const model = { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' };
    expect(isAvailableModelDto(model)).toBe(true);
    expect(isAvailableModelDto({ ...model, extra: true })).toBe(false);
    expect(isAvailableModelDto({ ...model, provider: 'a/b' })).toBe(false);
    expect(isAvailableModelDto({ ...model, label: 'a\\b' })).toBe(false);
    expect(isAvailableModelDto({ ...model, id: '' })).toBe(false);
    expect(isAvailableModelDto({ ...model, id: 'x'.repeat(201) })).toBe(false);
    expect(isAvailableModelDto({ ...model, provider: 42 })).toBe(false);
  });

  it('accepts authoritative runtime state and rejects bad modes, revisions and nested models', () => {
    expect(isRuntimeStateDto(state)).toBe(true);
    expect(isRuntimeStateDto({ ...state, mode: 'executing-plan' })).toBe(true);
    expect(isRuntimeStateDto({ ...state, extra: true })).toBe(false);
    expect(isRuntimeStateDto({ ...state, mode: 'idle' })).toBe(false);
    expect(isRuntimeStateDto({ ...state, revision: -1 })).toBe(false);
    expect(isRuntimeStateDto({ ...state, revision: 1.5 })).toBe(false);
    expect(
      isRuntimeStateDto({ ...state, model: { provider: 'a/b', id: 'gpt-4o', label: 'GPT-4o' } }),
    ).toBe(false);
    expect(isRuntimeStateDto({ ...state, thinkingLevel: '' })).toBe(false);
    expect(isRuntimeStateDto({ ...state, availableThinkingLevels: ['low', 42] })).toBe(false);
    expect(isRuntimeStateDto({ ...state, streaming: 'no' })).toBe(false);
    expect(isRuntimeStateDto({ ...state, updatedAt: 'not-a-date' })).toBe(false);
  });

  it('accepts every runtime operation and rejects host-only modes and path-like ids', () => {
    expect(isRuntimeOperation({ type: 'set_model', provider: 'openai', modelId: 'gpt-4o' })).toBe(
      true,
    );
    expect(isRuntimeOperation({ type: 'set_thinking_level', level: 'high' })).toBe(true);
    expect(isRuntimeOperation({ type: 'set_mode', mode: 'build' })).toBe(true);
    expect(isRuntimeOperation({ type: 'set_mode', mode: 'plan' })).toBe(true);
    expect(isRuntimeOperation({ type: 'set_mode', mode: 'executing-plan' })).toBe(false);
    expect(isRuntimeOperation({ type: 'set_mode', mode: 'unknown' })).toBe(false);
    expect(isRuntimeOperation({ type: 'set_model', provider: 'a/b', modelId: 'gpt-4o' })).toBe(
      false,
    );
    expect(isRuntimeOperation({ type: 'set_model', provider: 'openai', modelId: 'a\\b' })).toBe(
      false,
    );
    expect(
      isRuntimeOperation({
        type: 'set_model',
        provider: 'openai',
        modelId: 'gpt-4o',
        extra: true,
      }),
    ).toBe(false);
    expect(isRuntimeOperation({ type: 'set_thinking_level', level: '' })).toBe(false);
    expect(isRuntimeOperation({ type: 'set_theme', level: 'dark' })).toBe(false);
  });

  it('accepts exact runtime control commands and rejects extras, bad revisions and bad operations', () => {
    const command = {
      type: 'runtime.control',
      controlId: 'control_001',
      sessionId: 'session_local',
      expectedRevision: 2,
      operation: { type: 'set_model', provider: 'openai', modelId: 'gpt-4o' },
      ticket: 'ticket_control_001',
    } as const;
    expect(isRuntimeControlCommand(command)).toBe(true);
    expect(isRuntimeControlCommand({ ...command, extra: true })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedRevision: -1 })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedRevision: 1.5 })).toBe(false);
    expect(
      isRuntimeControlCommand({
        ...command,
        operation: { type: 'set_mode', mode: 'executing-plan' },
      }),
    ).toBe(false);
    expect(isRuntimeControlCommand({ ...command, ticket: 't!' })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, type: 'runtime.steer' })).toBe(false);
  });

  it('accepts model catalogs and rejects malformed catalog items', () => {
    const catalog = {
      sessionId: 'session_local',
      runtimeRevision: 1,
      models: [
        { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
        { provider: 'anthropic', id: 'claude-sonnet', label: 'Claude Sonnet' },
      ],
    } as const;
    expect(isRuntimeModelCatalogDto(catalog)).toBe(true);
    expect(isRuntimeModelCatalogDto({ ...catalog, extra: true })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, runtimeRevision: -1 })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, runtimeRevision: 1.5 })).toBe(false);
    expect(
      isRuntimeModelCatalogDto({ ...catalog, models: [{ ...catalog.models[0], provider: 'a/b' }] }),
    ).toBe(false);
  });

  it('accepts command descriptors and catalogs and rejects bad sources and names', () => {
    expect(isCommandDescriptorDto(descriptor)).toBe(true);
    expect(
      isCommandDescriptorDto({ ...descriptor, description: 'Shows help', source: 'extension' }),
    ).toBe(true);
    expect(isCommandDescriptorDto({ ...descriptor, extra: true })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, source: 'script' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: '../x' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'a\\b' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, enabled: 'yes' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, description: 'x'.repeat(2001) })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, disabledReason: 'x'.repeat(501) })).toBe(false);

    const catalog = {
      sessionId: 'session_local',
      revision: 2,
      commands: [descriptor, { ...descriptor, name: 'compact', source: 'skill' }],
    } as const;
    expect(isCommandCatalogDto(catalog)).toBe(true);
    expect(isCommandCatalogDto({ ...catalog, extra: true })).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, revision: -1 })).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, revision: 2.5 })).toBe(false);
    expect(
      isCommandCatalogDto({ ...catalog, commands: [{ ...descriptor, source: 'script' }] }),
    ).toBe(false);
  });

  it('accepts every runtime control outcome and rejects stray statuses and malformed outcomes', () => {
    expect(isRuntimeControlResponse({ outcome: { status: 'accepted', state } })).toBe(true);
    expect(isRuntimeControlResponse({ outcome: { status: 'stale', state } })).toBe(true);
    expect(
      isRuntimeControlResponse({ outcome: { status: 'unsupported', reason: 'no such op' } }),
    ).toBe(true);
    expect(
      isRuntimeControlResponse({ outcome: { status: 'unavailable', reason: 'host offline' } }),
    ).toBe(true);
    expect(
      isRuntimeControlResponse({ outcome: { status: 'delivery-unknown', reason: 'lost' } }),
    ).toBe(true);

    expect(isRuntimeControlResponse({ outcome: { status: 'accepted', state }, extra: true })).toBe(
      false,
    );
    expect(isRuntimeControlResponse({ outcome: { status: 'pending' } })).toBe(false);
    expect(isRuntimeControlResponse({ outcome: { status: 'accepted' } })).toBe(false);
    expect(isRuntimeControlResponse({ outcome: { status: 'accepted', state, extra: true } })).toBe(
      false,
    );
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'accepted', state: { ...state, mode: 'idle' } },
      }),
    ).toBe(false);
    expect(isRuntimeControlResponse({ outcome: { status: 'unsupported' } })).toBe(false);
    expect(isRuntimeControlResponse({ outcome: { status: 'unsupported', reason: '' } })).toBe(
      false,
    );
    expect(
      isRuntimeControlResponse({ outcome: { status: 'unsupported', reason: 'x'.repeat(501) } }),
    ).toBe(false);
  });

  it('accepts every prompt abort outcome and rejects extras and empty reasons', () => {
    expect(isPromptAbortResponse({ outcome: { status: 'aborted' } })).toBe(true);
    expect(
      isPromptAbortResponse({ outcome: { status: 'unavailable', reason: 'no active prompt' } }),
    ).toBe(true);
    expect(isPromptAbortResponse({ outcome: { status: 'delivery-unknown', reason: 'lost' } })).toBe(
      true,
    );

    expect(isPromptAbortResponse({ outcome: { status: 'aborted', reason: 'extra' } })).toBe(false);
    expect(isPromptAbortResponse({ outcome: { status: 'denied' } })).toBe(false);
    expect(isPromptAbortResponse({ outcome: { status: 'unavailable' } })).toBe(false);
    expect(isPromptAbortResponse({ outcome: { status: 'unavailable', reason: '' } })).toBe(false);
    expect(isPromptAbortResponse({ outcome: { status: 'aborted' }, extra: true })).toBe(false);
  });

  it('accepts the pi-facing runtime commands and rejects extra fields or missing args', () => {
    expect(isPiRpcCommand({ type: 'get_available_models' })).toBe(true);
    expect(isPiRpcCommand({ type: 'get_available_thinking_levels' })).toBe(true);
    expect(isPiRpcCommand({ id: 'request_2', type: 'get_commands' })).toBe(true);
    expect(isPiRpcCommand({ type: 'get_available_models', extra: true })).toBe(false);
    expect(isPiRpcCommand({ type: 'set_model', provider: 'openai', modelId: 'gpt-4o' })).toBe(true);
    expect(isPiRpcCommand({ type: 'set_model', provider: 'openai' })).toBe(false);
    expect(isPiRpcCommand({ type: 'set_model', provider: 'openai', modelId: 42 })).toBe(false);
    expect(isPiRpcCommand({ type: 'set_thinking_level', level: 'high' })).toBe(true);
    expect(isPiRpcCommand({ type: 'set_thinking_level' })).toBe(false);
    expect(isPiRpcCommand({ type: 'get_state' })).toBe(true);
  });
});
