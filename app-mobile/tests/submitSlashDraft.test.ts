// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Slash Draft Submission Tests
// ───────────────────────────────────────────────────────────────────
// Proves the fail-closed orchestration: every local gate runs before any
// transport work, a valid draft spends exactly ONE fresh ticket and ONE
// expected-revision envelope, revision races and denied rows make ZERO
// relay calls, and every settled outcome maps to a typed code that the UI
// reconciles without retry or send-as-text fallback.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TextBlock } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScopedCommandSnapshot, SelectedCommandBinding } from '../src/shared/commands/commands.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const relay = vi.hoisted(() => {
  class SlashSubmitError extends Error {
    readonly reasonCode: 'stale_catalog' | 'command_denied';

    constructor(reasonCode: 'stale_catalog' | 'command_denied') {
      super(reasonCode);
      this.name = 'SlashSubmitError';
      this.reasonCode = reasonCode;
    }
  }
  class RelayRequestError extends Error {
    readonly code: 'access_denied' | 'request_failed';
    readonly status: number | null;
    readonly retryAfterMs: number | null;

    constructor(code: 'access_denied' | 'request_failed', status: number | null = null) {
      super(code);
      this.name = 'RelayRequestError';
      this.code = code;
      this.status = status;
      this.retryAfterMs = null;
    }
  }
  return {
    SlashSubmitError,
    RelayRequestError,
    requestTicket: vi.fn(),
    submitSlashCommand: vi.fn(),
  };
});

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

vi.mock('../src/shared/transport/relay.js', () => relay);

import { canonicalSlashMessage, submitSlashDraft } from '../src/shared/commands/submit-slash-draft.js';

const SESSION = 'session_submit';
const EPOCH = 'epoch_submit';
const BLOCK: TextBlock = {
  id: 'block_slash_001',
  kind: 'text',
  role: 'user',
  text: '/plan a b',
  revision: 1,
  seq: 9,
  occurredAt: '2026-08-13T10:00:00.000Z',
};

function descriptor(name: string, enabled = true) {
  return {
    name,
    description: null,
    source: 'extension' as const,
    enabled,
    disabledReason: enabled ? null : 'disabled for tests',
    requiresConfirmation: false,
  };
}

const SNAPSHOT: ScopedCommandSnapshot = {
  hostEpoch: EPOCH,
  sessionId: SESSION,
  sessionRevision: 2,
  catalogRevision: 3,
  commands: [descriptor('plan'), descriptor('lock', false)],
  fetchedAt: 0,
};

const BINDING: SelectedCommandBinding = {
  hostEpoch: EPOCH,
  sessionId: SESSION,
  name: 'plan',
  sessionRevision: 2,
  catalogRevision: 3,
};

const BASE_INPUT = {
  sessionId: SESSION,
  draft: '/plan a b',
  binding: BINDING,
  snapshot: SNAPSHOT,
  connection: 'live' as const,
  awaitingSnapshot: false,
  runtimeAuthority: true,
  running: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  relay.requestTicket.mockResolvedValue('ticket_fresh_1');
  relay.submitSlashCommand.mockResolvedValue(BLOCK);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('canonicalSlashMessage', () => {
  it('builds the exact canonical command plus user arguments', () => {
    expect(canonicalSlashMessage('/plan', 'plan')).toBe('/plan');
    expect(canonicalSlashMessage('/plan a b', 'plan')).toBe('/plan a b');
    expect(canonicalSlashMessage('/plan   ', 'plan')).toBe('/plan');
    expect(canonicalSlashMessage('/plan\targ', 'plan')).toBe('/plan arg');
  });

  it('rejects drafts that no longer match the binding token', () => {
    expect(canonicalSlashMessage('plan a', 'plan')).toBeNull();
    expect(canonicalSlashMessage('/model a', 'plan')).toBeNull();
    expect(canonicalSlashMessage('/plana', 'plan')).toBeNull();
    expect(canonicalSlashMessage('/', 'plan')).toBeNull();
    expect(canonicalSlashMessage('', 'plan')).toBeNull();
  });
});

describe('local gates run before any relay call', () => {
  it('fails closed on a missing binding with zero relay calls', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, binding: null });
    expect(outcome).toEqual({ status: 'failed', code: 'invalid-draft' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('fails closed on a malformed draft token with zero relay calls', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, draft: '/model x' });
    expect(outcome).toEqual({ status: 'failed', code: 'invalid-draft' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  const racePatches: ReadonlyArray<[string, Partial<ScopedCommandSnapshot>]> = [
    ['host epoch changed', { hostEpoch: 'epoch_other' }],
    ['session changed', { sessionId: 'session_other' }],
    ['session revision advanced', { sessionRevision: 3 }],
    ['catalog revision advanced', { catalogRevision: 4 }],
    ['row removed from catalog', { commands: [descriptor('model')] }],
    ['row disabled in catalog', { commands: [descriptor('plan', false)] }],
  ];
  it.each(racePatches)('makes zero Pi calls when %s', async (_label, snapshotPatch) => {
    const outcome = await submitSlashDraft({
      ...BASE_INPUT,
      snapshot: { ...SNAPSHOT, ...snapshotPatch },
    });
    expect(outcome.status).toBe('failed');
    expect(outcome.status === 'failed' && outcome.code).toBe('stale');
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('fails closed with zero relay calls when the snapshot is gone', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, snapshot: null });
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('fails closed on a disabled or unknown canonical row with zero relay calls', async () => {
    const disabled = await submitSlashDraft({
      ...BASE_INPUT,
      binding: { ...BINDING, name: 'lock' },
      draft: '/lock',
    });
    expect(disabled).toEqual({ status: 'failed', code: 'denied' });
    const unknown = await submitSlashDraft({
      ...BASE_INPUT,
      binding: { ...BINDING, name: 'missing' },
      draft: '/missing',
    });
    expect(unknown).toEqual({ status: 'failed', code: 'denied' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('fails closed while the connection is not live', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, connection: 'reconnecting' });
    expect(outcome).toEqual({ status: 'failed', code: 'not-live' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
  });

  it('fails closed while a snapshot barrier is active', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, awaitingSnapshot: true });
    expect(outcome).toEqual({ status: 'failed', code: 'not-live' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
  });

  it('fails closed when running-state authority is missing (never guesses)', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, runtimeAuthority: false });
    expect(outcome).toEqual({ status: 'failed', code: 'no-running-authority' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
  });

  it('fails closed on an authoritative running turn and never steers', async () => {
    const outcome = await submitSlashDraft({ ...BASE_INPUT, running: true });
    expect(outcome).toEqual({ status: 'failed', code: 'running' });
    expect(relay.requestTicket).not.toHaveBeenCalled();
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });
});

describe('one fresh ticket and one expected-revision envelope per valid send', () => {
  it('spends exactly one ticket and one prompt request for a valid draft', async () => {
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'accepted', block: BLOCK });
    expect(relay.requestTicket).toHaveBeenCalledTimes(1);
    expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
    const [sessionId, submissionId, message, binding, signal] = relay.submitSlashCommand.mock
      .calls[0] as [string, string, string, SelectedCommandBinding, AbortSignal | undefined];
    expect(sessionId).toBe(SESSION);
    expect(submissionId).toMatch(/^slash_/u);
    expect(message).toBe('/plan a b');
    expect(binding).toEqual(BINDING);
    expect(signal).toBeUndefined();
  });

  it('mints a fresh submission identity per attempt (no id reuse, no retry)', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(new relay.SlashSubmitError('command_denied'));
    await submitSlashDraft(BASE_INPUT);
    relay.submitSlashCommand.mockResolvedValueOnce(BLOCK);
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome.status).toBe('accepted');
    const submissionIds = relay.submitSlashCommand.mock.calls.map((call) => call[1] as string);
    expect(submissionIds[0]).toMatch(/^slash_/u);
    expect(submissionIds[1]).toMatch(/^slash_/u);
    expect(submissionIds[0]).not.toBe(submissionIds[1]);
  });
});

describe('relay outcomes map fail-closed with no retry', () => {
  it('maps a relay stale_catalog to stale after exactly one ticket and one prompt', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(new relay.SlashSubmitError('stale_catalog'));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    expect(relay.requestTicket).toHaveBeenCalledTimes(1);
    expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  });

  it('maps a relay command_denied to denied after exactly one ticket and one prompt', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(new relay.SlashSubmitError('command_denied'));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'denied' });
    expect(relay.requestTicket).toHaveBeenCalledTimes(1);
    expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  });

  it('maps a ticket-phase 403 to forbidden with zero prompt requests', async () => {
    relay.requestTicket.mockRejectedValueOnce(new relay.RelayRequestError('access_denied', 403));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'forbidden' });
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('maps a ticket-phase transport failure to unavailable with zero prompt requests', async () => {
    relay.requestTicket.mockRejectedValueOnce(new TypeError('Network request failed'));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'unavailable' });
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('maps an offline ticket phase to unavailable', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      relay.requestTicket.mockRejectedValueOnce(new TypeError('Network request failed'));
      const outcome = await submitSlashDraft(BASE_INPUT);
      expect(outcome).toEqual({ status: 'failed', code: 'unavailable' });
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    }
  });

  it('maps a malformed ticket response to incompatible with zero prompt requests', async () => {
    relay.requestTicket.mockRejectedValueOnce(new SyntaxError('invalid JSON'));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'incompatible' });
    expect(relay.submitSlashCommand).not.toHaveBeenCalled();
  });

  it('maps a submit-phase network failure to delivery-unknown (never retried)', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(new TypeError('Network request failed'));
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'delivery-unknown' });
    expect(relay.requestTicket).toHaveBeenCalledTimes(1);
    expect(relay.submitSlashCommand).toHaveBeenCalledTimes(1);
  });

  it('maps an ambiguous submit-phase status to delivery-unknown', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(
      new relay.RelayRequestError('request_failed', null),
    );
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'delivery-unknown' });
  });

  it('maps a definitive submit-phase 503 to unavailable', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(
      new relay.RelayRequestError('request_failed', 503),
    );
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'unavailable' });
  });

  it('maps an unreadable submit response to delivery-unknown', async () => {
    relay.submitSlashCommand.mockRejectedValueOnce(
      new Error('Relay returned an invalid slash submission response.'),
    );
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'delivery-unknown' });
  });
});
