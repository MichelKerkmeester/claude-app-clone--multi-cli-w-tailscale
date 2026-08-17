// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Guard Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  approvalActionDigest,
  canonicalizeApprovalAction,
  enrollmentProof,
  isAvailableModelDto,
  isCommandBindingDto,
  isCommandCatalogDto,
  isCommandDescriptorDto,
  isEnrollmentQr,
  isFilePreviewBlock,
  isApprovalDecisionCommand,
  isEnvelope,
  isExecutePlanCommand,
  isSetModeCommand,
  isOpaqueToken,
  isPiRpcCommand,
  isPiRpcEvent,
  isPiRpcResponse,
  isPlanArtifactDto,
  isPlanControlCommand,
  isPlanControlReasonCode,
  isPlanControlResponse,
  isPlanSnapshotDto,
  isPlanValidityValue,
  isPromptAbortResponse,
  isPromptSubmitCommand,
  isPromptSubmitResponse,
  isRuntimeControlCommand,
  isRuntimeControlResponse,
  isRuntimeIssueCode,
  isRuntimeIssueDto,
  isRuntimeIssueResponse,
  isRuntimeModelCatalogDto,
  isRuntimeModelTicketRequest,
  isRuntimeModelTicketResponse,
  isRuntimeOperation,
  isRuntimeSnapshotDto,
  isRuntimeStateDto,
  isSessionCardDto,
  isSlashSubmitIssueCode,
  isSlashSubmitIssueResponse,
  isSyncMessage,
  isTranscriptBlock,
  PLAN_CONTROL_REASON_CODES,
  PLAN_VALIDITY_VALUES,
  RUNTIME_ISSUE_CODES,
  SLASH_SUBMIT_ISSUE_CODES,
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

  it('accepts exact relay artifact descriptors and rejects unsafe state combinations', () => {
    const ready = {
      id: 'block_preview_001',
      revision: 'rev_001',
      seq: 8,
      occurredAt: '2026-01-01T00:00:00.000Z',
      kind: 'file_preview',
      artifactId: 'artifact_001',
      displayName: 'policy.ts',
      renderer: 'code',
      mimeType: 'text/typescript',
      byteLength: 12,
      digest: 'a'.repeat(64),
      language: 'typescript',
      redaction: 'applied',
      completeness: 'complete',
      shareAllowed: false,
      availability: 'ready',
      content: { kind: 'artifact-ref' },
    } as const;
    expect(isFilePreviewBlock(ready)).toBe(true);
    expect(isTranscriptBlock(ready)).toBe(true);
    expect(
      isFilePreviewBlock({
        ...ready,
        content: { kind: 'inline-text', text: 'safe text', firstLine: 1 },
      }),
    ).toBe(true);
    expect(
      isFilePreviewBlock({
        ...ready,
        renderer: 'pdf',
        mimeType: 'application/pdf',
        byteLength: null,
        digest: 'b'.repeat(64),
        redaction: 'withheld',
        availability: 'withheld',
        content: { kind: 'none' },
        pageCount: 1,
      }),
    ).toBe(true);
    expect(isFilePreviewBlock({ ...ready, extra: true })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, displayName: '/Users/private/policy.ts' })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, artifactId: '../artifact' })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, revision: 'latest' })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, digest: 'A'.repeat(64) })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, byteLength: 50 * 1024 * 1024 + 1 })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, renderer: 'image' })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, redaction: 'withheld' })).toBe(false);
    expect(isFilePreviewBlock({ ...ready, availability: 'ready', content: { kind: 'none' } })).toBe(
      false,
    );
    expect(
      isFilePreviewBlock({
        ...ready,
        content: { kind: 'inline-text', text: 'safe', firstLine: 0 },
      }),
    ).toBe(false);
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
    const model = {
      provider: 'openai',
      id: 'gpt-4o',
      label: 'GPT-4o',
      reasoning: true,
      input: ['text', 'image'],
      contextWindow: 128_000,
      maxTokens: 16_384,
      tools: true,
      availability: 'available',
      availabilityReasonCode: 'unavailable',
      pricing: { currency: 'USD', inputPerMillion: 2.5, outputPerMillion: 10 },
    };
    expect(isAvailableModelDto(model)).toBe(true);
    expect(isAvailableModelDto({ ...model, extra: true })).toBe(false);
    expect(isAvailableModelDto({ ...model, provider: 'a/b' })).toBe(false);
    expect(isAvailableModelDto({ ...model, label: 'a\\b' })).toBe(true);
    expect(isAvailableModelDto({ ...model, id: '' })).toBe(false);
    expect(isAvailableModelDto({ ...model, id: 'x'.repeat(201) })).toBe(false);
    expect(isAvailableModelDto({ ...model, provider: 42 })).toBe(false);
    expect(isAvailableModelDto({ ...model, availabilityReasonCode: 'raw host error' })).toBe(false);
    expect(isAvailableModelDto({ ...model, contextWindow: 1.5 })).toBe(false);
    expect(isAvailableModelDto({ ...model, pricing: { currency: 'USD', secret: 'x' } })).toBe(
      false,
    );
    expect(isAvailableModelDto({ ...model, label: 'x'.repeat(201) })).toBe(false);
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
      expectedCatalogRevision: 4,
      operation: { type: 'set_model', provider: 'openai', modelId: 'gpt-4o' },
      ticket: 'ticket_control_001',
    } as const;
    expect(isRuntimeControlCommand(command)).toBe(true);
    expect(isRuntimeControlCommand({ ...command, extra: true })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedRevision: -1 })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedRevision: 1.5 })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedCatalogRevision: -1 })).toBe(false);
    expect(isRuntimeControlCommand({ ...command, expectedCatalogRevision: 1.5 })).toBe(false);
    const { expectedCatalogRevision: _missing, ...missingCatalogRevision } = command;
    expect(isRuntimeControlCommand(missingCatalogRevision)).toBe(false);
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
      catalogRevision: 2,
      runtimeRevision: 1,
      currentModel: { provider: 'retired', id: 'old-model', label: 'Retired Model' },
      streaming: true,
      canSetModelWhileStreaming: false,
      models: [
        { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
        { provider: 'anthropic', id: 'claude-sonnet', label: 'Claude Sonnet' },
      ],
    } as const;
    expect(isRuntimeModelCatalogDto(catalog)).toBe(true);
    expect(isRuntimeModelCatalogDto({ ...catalog, extra: true })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, runtimeRevision: -1 })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, runtimeRevision: 1.5 })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, catalogRevision: -1 })).toBe(false);
    expect(isRuntimeModelCatalogDto({ ...catalog, catalogRevision: 1.5 })).toBe(false);
    expect(
      isRuntimeModelCatalogDto({ ...catalog, models: [{ ...catalog.models[0], provider: 'a/b' }] }),
    ).toBe(false);
  });

  it('accepts three-, five-, and seven-level session snapshots in host order', () => {
    const levels = [
      ['low', 'medium', 'high'],
      ['off', 'minimal', 'low', 'medium', 'high'],
      ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
    ] as const;
    const snapshots = levels.map((availableThinkingLevels) => ({
      sessionId: 'session_local',
      state: { ...state, availableThinkingLevels },
      models: {
        sessionId: 'session_local',
        catalogRevision: 4,
        runtimeRevision: state.revision,
        currentModel: state.model,
        streaming: state.streaming,
        canSetModelWhileStreaming: false,
        models: [state.model],
      },
    }));

    expect(snapshots.every(isRuntimeSnapshotDto)).toBe(true);
    expect(snapshots[2]?.state.availableThinkingLevels).toEqual(levels[2]);
  });

  it('rejects malformed snapshots and every non-allowlisted runtime issue', () => {
    const snapshot = {
      sessionId: 'session_local',
      state,
      models: {
        sessionId: 'session_local',
        catalogRevision: 4,
        runtimeRevision: state.revision,
        currentModel: state.model,
        streaming: state.streaming,
        canSetModelWhileStreaming: false,
        models: [state.model],
      },
    } as const;

    expect(RUNTIME_ISSUE_CODES).toEqual([
      'unsupported',
      'host-unavailable',
      'foreground-required',
      'rate-limited',
      'delivery-unknown',
      'invalid-response',
      'offline',
    ]);
    expect(RUNTIME_ISSUE_CODES.every(isRuntimeIssueCode)).toBe(true);
    expect(isRuntimeIssueCode('raw host rejection')).toBe(false);
    expect(isRuntimeIssueResponse({ error: 'host-unavailable' })).toBe(true);
    expect(isRuntimeIssueResponse({ error: 'host-unavailable', reason: 'raw' })).toBe(false);
    expect(isRuntimeIssueResponse({ error: 'raw host rejection' })).toBe(false);
    expect(isRuntimeIssueDto({ issueCode: 'invalid-response' })).toBe(true);
    expect(isRuntimeIssueDto({ issueCode: 'invalid-response', extra: true })).toBe(false);

    expect(isRuntimeSnapshotDto(snapshot)).toBe(true);
    expect(isRuntimeSnapshotDto({ ...snapshot, extra: true })).toBe(false);
    expect(isRuntimeSnapshotDto({ ...snapshot, sessionId: 'session_other' })).toBe(false);
    expect(
      isRuntimeSnapshotDto({
        ...snapshot,
        models: { ...snapshot.models, sessionId: 'session_other' },
      }),
    ).toBe(false);
    expect(
      isRuntimeSnapshotDto({
        ...snapshot,
        models: { ...snapshot.models, runtimeRevision: state.revision + 1 },
      }),
    ).toBe(false);
    expect(
      isRuntimeSnapshotDto({
        ...snapshot,
        state: { ...state, revision: 1.5 },
      }),
    ).toBe(false);
    expect(
      isRuntimeSnapshotDto({
        ...snapshot,
        state: { ...state, availableThinkingLevels: ['x'.repeat(65)] },
      }),
    ).toBe(false);
    expect(
      isRuntimeSnapshotDto({
        ...snapshot,
        state: { ...state, availableThinkingLevels: ['high', 'high'] },
      }),
    ).toBe(false);
  });

  it('accepts exact runtime model ticket payloads and rejects malformed bindings', () => {
    const request = {
      sessionId: 'session_local',
      expectedRevision: 3,
      expectedCatalogRevision: 7,
      operation: { type: 'set_model', provider: 'openai', modelId: 'gpt-4o' },
    } as const;
    expect(isRuntimeModelTicketRequest(request)).toBe(true);
    expect(isRuntimeModelTicketRequest({ ...request, extra: true })).toBe(false);
    expect(isRuntimeModelTicketRequest({ ...request, expectedRevision: -1 })).toBe(false);
    expect(isRuntimeModelTicketRequest({ ...request, expectedCatalogRevision: 2.5 })).toBe(false);
    expect(
      isRuntimeModelTicketRequest({
        ...request,
        operation: { type: 'set_model', provider: '../openai', modelId: 'gpt-4o' },
      }),
    ).toBe(false);
    expect(
      isRuntimeModelTicketRequest({
        ...request,
        operation: { type: 'set_thinking_level', level: 'high' },
      }),
    ).toBe(false);
    expect(
      isRuntimeModelTicketResponse({
        ticket: 'runtime_ticket_001',
        expiresAt: '2026-01-01T00:00:10.000Z',
      }),
    ).toBe(true);
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
      hostEpoch: 'epoch_001',
      sessionId: 'session_local',
      sessionRevision: 2,
      catalogRevision: 3,
      commands: [descriptor, { ...descriptor, name: 'compact', source: 'skill' }],
    } as const;
    expect(isCommandCatalogDto(catalog)).toBe(true);
    // The pre-versioning shape is a stale/incompatible shape and is rejected whole.
    expect(
      isCommandCatalogDto({ sessionId: 'session_local', revision: 2, commands: catalog.commands }),
    ).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, extra: true })).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, sessionRevision: -1 })).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, catalogRevision: 2.5 })).toBe(false);
    expect(isCommandCatalogDto({ ...catalog, hostEpoch: 42 })).toBe(false);
    expect(
      isCommandCatalogDto({ ...catalog, commands: [{ ...descriptor, source: 'script' }] }),
    ).toBe(false);
  });

  it('accepts exact slash bindings and rejects unknown, non-canonical, and stale shapes', () => {
    const binding = {
      hostEpoch: 'epoch_001',
      name: 'review:1',
      sessionRevision: 2,
      catalogRevision: 3,
    } as const;
    expect(isCommandBindingDto(binding)).toBe(true);
    expect(isCommandBindingDto({ ...binding, extra: true })).toBe(false);
    expect(isCommandBindingDto({ ...binding, name: '../review' })).toBe(false);
    expect(isCommandBindingDto({ ...binding, name: '/review' })).toBe(false);
    expect(isCommandBindingDto({ ...binding, name: 'review cmd' })).toBe(false);
    expect(isCommandBindingDto({ ...binding, sessionRevision: -1 })).toBe(false);
    expect(isCommandBindingDto({ ...binding, catalogRevision: 1.5 })).toBe(false);
    expect(isCommandBindingDto({ ...binding, hostEpoch: 7 })).toBe(false);
  });

  it('accepts slash submissions only with a valid binding and never with steering', () => {
    const command = {
      type: 'prompt.submit',
      submissionId: 'prompt_slash_001',
      sessionId: 'session_local',
      message: '/plan on',
      ticket: 'ticket_prompt_001',
      command: { hostEpoch: 'epoch_001', name: 'plan', sessionRevision: 2, catalogRevision: 3 },
    } as const;
    expect(isPromptSubmitCommand(command)).toBe(true);
    expect(isPromptSubmitCommand({ ...command, streamingBehavior: 'steer' })).toBe(false);
    expect(isPromptSubmitCommand({ ...command, streamingBehavior: 'followUp' })).toBe(false);
    // An undefined binding serializes as absent and reads as an ordinary prompt.
    expect(isPromptSubmitCommand({ ...command, command: undefined })).toBe(true);
    expect(
      isPromptSubmitCommand({ ...command, command: { ...command.command, name: '../plan' } }),
    ).toBe(false);
    expect(
      isPromptSubmitCommand({ ...command, command: { ...command.command, sessionRevision: -1 } }),
    ).toBe(false);
    expect(
      isPromptSubmitCommand({ ...command, command: { ...command.command, extra: true } }),
    ).toBe(false);
    // Without a binding the ordinary prompt shape keeps steering.
    const { command: _binding, ...ordinary } = command;
    expect(isPromptSubmitCommand({ ...ordinary, streamingBehavior: 'followUp' })).toBe(true);
    expect(isPromptSubmitCommand({ ...ordinary, streamingBehavior: 'steer' })).toBe(true);
    expect(isPromptSubmitCommand(ordinary)).toBe(true);
  });

  it('rejects control, bidi, path-like, and oversized descriptor names', () => {
    expect(isCommandDescriptorDto({ ...descriptor, name: 'plan\u0007' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'plan\u001b' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'plan\u202e' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: '../plan' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'plan$' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: '!bash' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'x'.repeat(201) })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, name: 'plan cmd' })).toBe(false);
  });

  it('accepts opt-in aliases and argument hints only when bounded, unique, and safe', () => {
    expect(isCommandDescriptorDto({ ...descriptor, aliases: ['p'], argumentHint: 'on|off' })).toBe(
      true,
    );
    expect(isCommandDescriptorDto({ ...descriptor, aliases: ['p', 'planx'] })).toBe(true);
    expect(isCommandDescriptorDto({ ...descriptor, aliases: [] })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, aliases: ['p', 'p'] })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, aliases: ['/p'] })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, aliases: ['p ', 'q'] })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, aliases: Array(17).fill('a') })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, argumentHint: 'x'.repeat(501) })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, argumentHint: '/Users/x' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, argumentHint: 'Bearer sk-LEAK' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, argumentHint: '' })).toBe(false);
    expect(isCommandDescriptorDto({ ...descriptor, argumentHint: null })).toBe(true);
  });

  it('keeps cross-session rejection at the relay boundary, not in the shape guard', () => {
    const catalog = {
      hostEpoch: 'epoch_001',
      sessionId: 'session_other',
      sessionRevision: 0,
      catalogRevision: 1,
      commands: [descriptor],
    } as const;
    // The guard validates shape only; the relay rejects foreign sessions before Pi.
    expect(isCommandCatalogDto(catalog)).toBe(true);
    const command = {
      type: 'prompt.submit',
      submissionId: 'prompt_cross_session',
      sessionId: 'session_other',
      message: '/plan on',
      ticket: 'ticket_prompt_001',
      command: { hostEpoch: 'epoch_001', name: 'plan', sessionRevision: 0, catalogRevision: 1 },
    } as const;
    expect(isPromptSubmitCommand(command)).toBe(true);
  });

  it('accepts only the fixed slash submission issue codes and exact response shapes', () => {
    expect(SLASH_SUBMIT_ISSUE_CODES).toEqual(['stale_catalog', 'command_denied']);
    expect(SLASH_SUBMIT_ISSUE_CODES.every(isSlashSubmitIssueCode)).toBe(true);
    expect(isSlashSubmitIssueCode('raw host rejection')).toBe(false);
    expect(isSlashSubmitIssueCode('stale')).toBe(false);
    expect(isSlashSubmitIssueResponse({ error: 'stale_catalog' })).toBe(true);
    expect(isSlashSubmitIssueResponse({ error: 'command_denied' })).toBe(true);
    expect(isSlashSubmitIssueResponse({ error: 'stale_catalog', reason: 'x' })).toBe(false);
    expect(isSlashSubmitIssueResponse({ error: 'pi_unavailable' })).toBe(false);
  });

  it('accepts every runtime control outcome and rejects stray statuses and malformed outcomes', () => {
    expect(isRuntimeControlResponse({ outcome: { status: 'accepted', state } })).toBe(true);
    expect(isRuntimeControlResponse({ outcome: { status: 'stale', state } })).toBe(true);
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'unsupported', reasonCode: 'unsupported_operation' },
      }),
    ).toBe(true);
    expect(
      isRuntimeControlResponse({
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'host-unavailable',
        },
      }),
    ).toBe(true);
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
      }),
    ).toBe(true);
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'policy_blocked', reasonCode: 'policy_blocked' },
      }),
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
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'unsupported', reasonCode: 'not_allowlisted' },
      }),
    ).toBe(false);
    expect(
      isRuntimeControlResponse({
        outcome: { status: 'unsupported', reasonCode: 'unsupported_operation', issueCode: 'raw' },
      }),
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
    expect(
      isPiRpcCommand({ type: 'set_model', provider: 'openai', modelId: 'gpt-4o', secret: 'x' }),
    ).toBe(false);
    expect(isPiRpcCommand({ type: 'set_model', provider: '../openai', modelId: 'gpt-4o' })).toBe(
      false,
    );
    expect(isPiRpcCommand({ type: 'set_thinking_level', level: 'high' })).toBe(true);
    expect(isPiRpcCommand({ type: 'set_thinking_level' })).toBe(false);
    expect(isPiRpcCommand({ type: 'get_state' })).toBe(true);
  });
});

describe('plan control guards', () => {
  const artifact = {
    planId: 'plan_001',
    planRevision: 2,
    title: 'Migrate the relay store',
    summary: 'Redacted outline of the migration steps',
    stepCount: 6,
    approachCount: 2,
    validity: 'valid',
    occurredAt: '2026-01-01T00:00:00.000Z',
  } as const;
  const snapshot = {
    planId: 'plan_001',
    planRevision: 2,
    validity: 'valid',
    artifact,
  } as const;
  const setMode = {
    type: 'set_mode',
    target: 'plan',
    expectedRuntimeRevision: 3,
    controlId: 'control_plan_001',
    oneUseTicket: 'ticket_plan_mode_abcdef',
  } as const;
  const executePlan = {
    type: 'execute_plan',
    planId: 'plan_001',
    expectedPlanRevision: 2,
    planToken: 'token_plan_binding_abcdef0123456789',
    expectedRuntimeRevision: 3,
    postRunMode: 'plan',
    controlId: 'control_exec_001',
    oneUseTicket: 'ticket_plan_exec_abcdef',
  } as const;

  it('accepts bounded plan artifacts and rejects extras, host-only values and unbounded fields', () => {
    expect(isPlanArtifactDto(artifact)).toBe(true);
    expect(isPlanArtifactDto({ ...artifact, extra: true })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, planToken: 'token_secret' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, planId: 'a/b' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, planId: '' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, planRevision: -1 })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, planRevision: 1.5 })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, title: 'x'.repeat(501) })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, summary: '/Users/secret' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, stepCount: 10_001 })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, approachCount: 101 })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, stepCount: -1 })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, validity: 'none' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, validity: 'ready' })).toBe(false);
    expect(isPlanArtifactDto({ ...artifact, occurredAt: 'not-a-date' })).toBe(false);
  });

  it('accepts consistent plan snapshots and rejects mismatched or token-bearing ones', () => {
    expect(isPlanSnapshotDto(snapshot)).toBe(true);
    expect(isPlanSnapshotDto({ ...snapshot, planId: null, artifact: null })).toBe(true);
    expect(isPlanSnapshotDto({ ...snapshot, extra: true })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, planToken: 'token_secret' })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, planRevision: -1 })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, planId: 'plan_other', artifact })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, planRevision: 3, artifact })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, validity: 'superseded', artifact })).toBe(false);
    expect(isPlanSnapshotDto({ ...snapshot, planId: 'plan_001', artifact: null })).toBe(false);
    expect(
      isPlanSnapshotDto({ planId: 'plan_001', planRevision: 2, validity: 'valid', artifact: null }),
    ).toBe(false);
  });

  it('accepts an exact set_mode request and rejects extras, bad targets and short tickets', () => {
    expect(isSetModeCommand(setMode)).toBe(true);
    expect(isSetModeCommand({ ...setMode, target: 'build' })).toBe(true);
    expect(isSetModeCommand({ ...setMode, extra: true })).toBe(false);
    expect(isSetModeCommand({ ...setMode, target: 'executing-plan' })).toBe(false);
    expect(isSetModeCommand({ ...setMode, target: 'unknown' })).toBe(false);
    expect(isSetModeCommand({ ...setMode, expectedRuntimeRevision: -1 })).toBe(false);
    expect(isSetModeCommand({ ...setMode, expectedRuntimeRevision: 1.5 })).toBe(false);
    expect(isSetModeCommand({ ...setMode, controlId: '' })).toBe(false);
    expect(isSetModeCommand({ ...setMode, oneUseTicket: 'short' })).toBe(false);
    expect(isSetModeCommand({ ...setMode, oneUseTicket: 'ticket has spaces' })).toBe(false);
    expect(isSetModeCommand({ ...setMode, type: 'runtime.control' })).toBe(false);
  });

  it('rejects execute_plan without postRunMode plan, with extra keys or weak tokens', () => {
    expect(isExecutePlanCommand(executePlan)).toBe(true);
    expect(isExecutePlanCommand({ ...executePlan, selectedApproachId: 'approach_2' })).toBe(true);
    expect(isExecutePlanCommand({ ...executePlan, extra: true })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, postRunMode: 'build' })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, postRunMode: undefined })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, planToken: 'token_short' })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, planToken: 42 })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, planId: 'plan/1' })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, expectedPlanRevision: -1 })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, expectedRuntimeRevision: 1.5 })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, selectedApproachId: '../escape' })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, controlId: 'x' })).toBe(false);
    expect(isExecutePlanCommand({ ...executePlan, type: 'set_mode' })).toBe(false);
  });

  it('narrows plan control commands and validates the fail-closed outcome family', () => {
    expect(isPlanControlCommand(setMode)).toBe(true);
    expect(isPlanControlCommand(executePlan)).toBe(true);
    expect(isPlanControlCommand({ ...executePlan, postRunMode: 'build' })).toBe(false);
    expect(isPlanControlCommand({ type: 'set_theme' })).toBe(false);
    expect(isOpaqueToken('ticket_plan_mode_abcdef')).toBe(true);
    expect(isOpaqueToken('t!')).toBe(false);
    expect(isOpaqueToken('/etc/passwd')).toBe(false);

    const state = {
      sessionId: 'session_local',
      revision: 4,
      model: { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
      thinkingLevel: 'high',
      availableThinkingLevels: ['high'],
      mode: 'executing-plan',
      streaming: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
      plan: snapshot,
    } as const;
    expect(isRuntimeStateDto(state)).toBe(true);
    expect(isRuntimeStateDto({ ...state, plan: { ...snapshot, planToken: 'x' } })).toBe(false);

    expect(isPlanControlResponse({ outcome: { status: 'accepted', state } })).toBe(true);
    expect(isPlanControlResponse({ outcome: { status: 'stale', state } })).toBe(true);
    expect(
      isPlanControlResponse({
        outcome: { status: 'unsupported', reasonCode: 'unsupported_operation' },
      }),
    ).toBe(true);
    expect(
      isPlanControlResponse({
        outcome: { status: 'unavailable', reasonCode: 'runtime_unavailable' },
      }),
    ).toBe(true);
    expect(
      isPlanControlResponse({
        outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
      }),
    ).toBe(true);
    expect(
      isPlanControlResponse({
        outcome: { status: 'policy_blocked', reasonCode: 'policy_blocked' },
      }),
    ).toBe(true);
    expect(isPlanControlResponse({ outcome: { status: 'pending' } })).toBe(false);
    expect(isPlanControlResponse({ outcome: { status: 'accepted', state }, extra: true })).toBe(
      false,
    );
    expect(
      isPlanControlResponse({
        outcome: { status: 'unavailable', reasonCode: 'stale_catalog' },
      }),
    ).toBe(false);
    expect(
      isPlanControlResponse({
        outcome: { status: 'unavailable', reasonCode: 'stale_plan' },
      }),
    ).toBe(true);
    expect(
      isPlanControlResponse({
        outcome: { status: 'unsupported', reasonCode: 'unsupported_operation', issueCode: 'raw' },
      }),
    ).toBe(false);
  });

  it('pins the validity and reason code families', () => {
    expect(PLAN_VALIDITY_VALUES).toEqual(['none', 'valid', 'superseded', 'invalid']);
    expect(PLAN_VALIDITY_VALUES.every(isPlanValidityValue)).toBe(true);
    expect(isPlanValidityValue('ready')).toBe(false);
    expect(isPlanValidityValue(42)).toBe(false);
    expect(PLAN_CONTROL_REASON_CODES).toEqual([
      'stale_revision',
      'stale_plan',
      'unsupported_operation',
      'runtime_unavailable',
      'host_rejected',
      'policy_blocked',
      'delivery_unknown',
    ]);
    expect(PLAN_CONTROL_REASON_CODES.every(isPlanControlReasonCode)).toBe(true);
    expect(isPlanControlReasonCode('stale_catalog')).toBe(false);
  });
});
