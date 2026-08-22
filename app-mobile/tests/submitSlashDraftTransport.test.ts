// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Draft Submission Transport Counts
// ───────────────────────────────────────────────────────────────────
// Runs the REAL relay client and the REAL orchestrator against a stubbed
// fetch to prove exact request counts at the wire: a valid Send spends
// exactly one /api/auth/ticket POST and one /api/prompt/submit POST with
// the expected-revision envelope, while every local race makes ZERO
// network calls.

import type { TextBlock } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScopedCommandSnapshot, SelectedCommandBinding } from '../src/shared/data/commands.js';
import { submitSlashDraft } from '../src/shared/data/submitSlashDraft.js';

const SESSION = 'session_transport';
const EPOCH = 'epoch_transport';
const BLOCK: TextBlock = {
  id: 'block_slash_transport',
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
  commands: [descriptor('plan')],
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

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fetch stub that records every request and answers like the relay. */
function stubRelayFetch(
  options: {
    readonly ticketStatus?: number;
    readonly submitStatus?: number;
    readonly submitBody?: unknown;
  } = {},
): ReturnType<typeof vi.fn> {
  const { ticketStatus = 200, submitStatus = 202, submitBody } = options;
  const mock = vi.fn(async (path: string) => {
    if (path === '/api/auth/ticket') {
      return jsonResponse(
        { ticket: 'ticket_wire_1', expiresAt: '2099-01-01T00:00:00.000Z' },
        ticketStatus,
      );
    }
    if (path === '/api/prompt/submit') {
      return jsonResponse(submitBody ?? { accepted: true, block: BLOCK }, submitStatus);
    }
    throw new Error(`Unexpected path: ${path}`);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

function callsOf(
  mock: ReturnType<typeof vi.fn>,
): ReadonlyArray<readonly [string, RequestInit | undefined]> {
  return mock.mock.calls as ReadonlyArray<readonly [string, RequestInit | undefined]>;
}

function promptBodies(
  calls: ReadonlyArray<readonly [string, RequestInit | undefined]>,
): ReadonlyArray<Record<string, unknown>> {
  return calls
    .filter(([path]) => path === '/api/prompt/submit')
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('wire-level request counts (real relay client)', () => {
  it('spends exactly one ticket POST and one prompt POST for a valid send', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft(BASE_INPUT);

    expect(outcome).toEqual({ status: 'accepted', block: BLOCK });
    const calls = callsOf(fetchMock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(1);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(1);

    const [submitBody] = promptBodies(calls);
    expect(submitBody).toMatchObject({
      type: 'prompt.submit',
      sessionId: SESSION,
      message: '/plan a b',
      ticket: 'ticket_wire_1',
      command: BINDING,
    });
    expect(String(submitBody?.submissionId)).toMatch(/^slash_/u);
  });

  it('makes zero network calls on a catalog revision race', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({
      ...BASE_INPUT,
      snapshot: { ...SNAPSHOT, catalogRevision: 4 },
    });
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes zero network calls on a host epoch race', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({
      ...BASE_INPUT,
      snapshot: { ...SNAPSHOT, hostEpoch: 'epoch_other' },
    });
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes zero network calls on a session revision race', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({
      ...BASE_INPUT,
      snapshot: { ...SNAPSHOT, sessionRevision: 3 },
    });
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes zero network calls for a disabled row', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({
      ...BASE_INPUT,
      snapshot: { ...SNAPSHOT, commands: [descriptor('plan', false)] },
    });
    expect(outcome).toEqual({ status: 'failed', code: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes zero network calls while a turn is running', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({ ...BASE_INPUT, running: true });
    expect(outcome).toEqual({ status: 'failed', code: 'running' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes zero network calls without running-state authority', async () => {
    const fetchMock = stubRelayFetch();
    const outcome = await submitSlashDraft({ ...BASE_INPUT, runtimeAuthority: false });
    expect(outcome).toEqual({ status: 'failed', code: 'no-running-authority' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a relay-detected stale catalog to stale after one ticket and one prompt', async () => {
    const fetchMock = stubRelayFetch({
      submitStatus: 409,
      submitBody: { error: 'stale_catalog' },
    });
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'stale' });
    const calls = callsOf(fetchMock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(1);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(1);
  });

  it('maps a relay denial to denied after one ticket and one prompt', async () => {
    const fetchMock = stubRelayFetch({
      submitStatus: 403,
      submitBody: { error: 'command_denied' },
    });
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'denied' });
    const calls = callsOf(fetchMock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(1);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(1);
  });

  it('never retries: a failed submit is followed by zero additional requests', async () => {
    const fetchMock = stubRelayFetch({
      submitStatus: 403,
      submitBody: { error: 'command_denied' },
    });
    await submitSlashDraft(BASE_INPUT);
    await submitSlashDraft(BASE_INPUT);
    // Two explicit Send attempts each spend exactly one ticket + one prompt;
    // nothing is retried automatically inside either attempt.
    const calls = callsOf(fetchMock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(2);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(2);
  });

  it('classifies a ticket-phase transport failure without any prompt request', async () => {
    const mock = vi.fn(async (path: string) => {
      if (path === '/api/auth/ticket') throw new TypeError('Network request failed');
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', mock);
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'unavailable' });
    const calls = callsOf(mock);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(0);
  });

  it('classifies a submit-phase transport failure as delivery-unknown', async () => {
    const mock = vi.fn(async (path: string) => {
      if (path === '/api/auth/ticket') {
        return jsonResponse({ ticket: 'ticket_wire_1', expiresAt: '2099-01-01T00:00:00.000Z' });
      }
      throw new TypeError('Network request failed');
    });
    vi.stubGlobal('fetch', mock);
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'delivery-unknown' });
    const calls = callsOf(mock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(1);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(1);
  });

  it('rejects a malformed submit response as delivery-unknown', async () => {
    const fetchMock = stubRelayFetch({ submitStatus: 202, submitBody: { nope: true } });
    const outcome = await submitSlashDraft(BASE_INPUT);
    expect(outcome).toEqual({ status: 'failed', code: 'delivery-unknown' });
    const calls = callsOf(fetchMock);
    expect(calls.filter(([path]) => path === '/api/auth/ticket')).toHaveLength(1);
    expect(calls.filter(([path]) => path === '/api/prompt/submit')).toHaveLength(1);
  });
});
