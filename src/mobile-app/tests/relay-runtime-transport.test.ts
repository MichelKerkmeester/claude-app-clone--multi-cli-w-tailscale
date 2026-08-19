// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Relay Transport Tests
// ───────────────────────────────────────────────────────────────────
// Proves the reconcile hydration normalizes every transport outcome to a
// bounded issue code, parses only bounded Retry-After metadata, and that
// the mutation lane mints a fresh ticket and unique control ID per attempt
// while classifying ambiguous delivery as terminal.

import { describe, expect, it, vi } from 'vitest';

import type {
  RuntimeModelCatalogDto,
  RuntimeSnapshotDto,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import {
  RuntimeRelayError,
  controlRuntime,
  fetchRuntimeSnapshot,
  parseBoundedRetryAfter,
} from '../src/relay.js';

const CURRENT_MODEL = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' };

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_transport',
  revision: 4,
  model: CURRENT_MODEL,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MODELS: RuntimeModelCatalogDto = {
  sessionId: 'session_transport',
  catalogRevision: 7,
  runtimeRevision: 4,
  currentModel: CURRENT_MODEL,
  streaming: false,
  canSetModelWhileStreaming: false,
  models: [CURRENT_MODEL],
};

const SNAPSHOT: RuntimeSnapshotDto = {
  sessionId: HOST_STATE.sessionId,
  state: HOST_STATE,
  models: MODELS,
};

function jsonResponse(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function stubFetch(
  handler: (path: string, init: RequestInit | undefined) => Promise<Response>,
): ReturnType<typeof vi.fn> {
  const mock = vi.fn(handler);
  vi.stubGlobal('fetch', mock);
  return mock;
}

function expectRuntimeIssue(error: unknown): RuntimeRelayError {
  expect(error).toBeInstanceOf(RuntimeRelayError);
  return error as RuntimeRelayError;
}

describe('parseBoundedRetryAfter', () => {
  it('accepts only integer delta-seconds and clamps to the bound', () => {
    expect(parseBoundedRetryAfter(null)).toBeNull();
    expect(parseBoundedRetryAfter('2')).toBe(2_000);
    expect(parseBoundedRetryAfter('0')).toBe(0);
    expect(parseBoundedRetryAfter(' 3 ')).toBe(3_000);
    expect(parseBoundedRetryAfter('999999')).toBe(60_000);
    expect(parseBoundedRetryAfter('abc')).toBeNull();
    expect(parseBoundedRetryAfter('1.5')).toBeNull();
    expect(parseBoundedRetryAfter('')).toBeNull();
    expect(parseBoundedRetryAfter('-1')).toBeNull();
  });
});

describe('fetchRuntimeSnapshot (reconcile hydration)', () => {
  it('validates and returns a snapshot', async () => {
    stubFetch(() => Promise.resolve(jsonResponse(SNAPSHOT)));
    await expect(fetchRuntimeSnapshot()).resolves.toEqual(SNAPSHOT);
  });

  it('maps 429 with a bounded Retry-After to rate-limited metadata', async () => {
    stubFetch(() =>
      Promise.resolve(jsonResponse({ error: 'rate-limited' }, 429, { 'retry-after': '2' })),
    );
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('rate-limited');
    expect(error.retryAfterMs).toBe(2_000);
  });

  it('drops unbounded Retry-After values', async () => {
    stubFetch(() =>
      Promise.resolve(jsonResponse({ error: 'rate-limited' }, 429, { 'retry-after': 'soon' })),
    );
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('rate-limited');
    expect(error.retryAfterMs).toBeNull();
  });

  it('maps 403 to foreground-required', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: 'foreground_required' }, 403)));
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('foreground-required');
  });

  it('maps 422 to unsupported', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: 'unsupported' }, 422)));
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('unsupported');
  });

  it('maps accepted-status bodies carrying issue codes', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: 'host-unavailable' }, 503)));
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('host-unavailable');
  });

  it('maps an unreadable body to invalid-response', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ unrelated: true }, 200)));
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('invalid-response');
  });

  it('maps a malformed JSON body to invalid-response', async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response('not json', { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    );
    const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
    expect(error.issueCode).toBe('invalid-response');
  });

  it('maps an aborted read to host-unavailable', async () => {
    stubFetch(
      (_path, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();
    const pending = fetchRuntimeSnapshot(controller.signal).catch((cause) => cause);
    controller.abort();
    const error = expectRuntimeIssue(await pending);
    expect(error.issueCode).toBe('host-unavailable');
  });

  it('maps an offline transport to offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
      const error = expectRuntimeIssue(await fetchRuntimeSnapshot().catch((cause) => cause));
      expect(error.issueCode).toBe('offline');
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    }
  });
});

describe('controlRuntime (mutation lane)', () => {
  it('mints a fresh ticket and unique control ID per attempt', async () => {
    let ticketNumber = 0;
    const fetchMock = stubFetch((path, init) => {
      if (path === '/api/runtime/ticket') {
        ticketNumber += 1;
        return Promise.resolve(
          jsonResponse(
            { ticket: `ticket_${ticketNumber}`, expiresAt: '2099-01-01T00:00:00.000Z' },
            201,
          ),
        );
      }
      if (path === '/api/runtime/control') {
        const body = JSON.parse(String(init?.body)) as { ticket: string; controlId: string };
        return Promise.resolve(
          jsonResponse({
            outcome: { status: 'accepted', state: { ...HOST_STATE, revision: 5 } },
          }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });

    const first = await controlRuntime(
      'session_transport',
      4,
      { type: 'set_model', provider: 'deepseek', modelId: 'deepseek-v4-flash' },
      7,
    );
    const second = await controlRuntime(
      'session_transport',
      4,
      { type: 'set_model', provider: 'deepseek', modelId: 'deepseek-v4-flash' },
      7,
    );
    expect(first.outcome.status).toBe('accepted');
    expect(second.outcome.status).toBe('accepted');
    // Two tickets minted, two control POSTs, distinct control IDs.
    const ticketCalls = fetchMock.mock.calls.filter(([path]) => path === '/api/runtime/ticket');
    const controlCalls = fetchMock.mock.calls.filter(([path]) => path === '/api/runtime/control');
    expect(ticketCalls).toHaveLength(2);
    expect(controlCalls).toHaveLength(2);
    const firstBody = JSON.parse(String(controlCalls[0]?.[1]?.body)) as {
      ticket: string;
      controlId: string;
    };
    const secondBody = JSON.parse(String(controlCalls[1]?.[1]?.body)) as {
      ticket: string;
      controlId: string;
    };
    expect(firstBody.ticket).toBe('ticket_1');
    expect(secondBody.ticket).toBe('ticket_2');
    expect(firstBody.controlId).not.toBe(secondBody.controlId);
    expect(firstBody.controlId).toMatch(/^control_/u);
  });

  it('maps a ticket-time 403 to foreground-required without submitting', async () => {
    stubFetch((path) => {
      if (path === '/api/runtime/ticket')
        return Promise.resolve(jsonResponse({ error: 'foreground_required' }, 403));
      return Promise.resolve(jsonResponse({}));
    });
    const response = await controlRuntime(
      'session_transport',
      4,
      {
        type: 'set_model',
        provider: 'deepseek',
        modelId: 'deepseek-v4-flash',
      },
      7,
    );
    expect(response.outcome.status).toBe('unavailable');
    expect(response.outcome.issueCode).toBe('foreground-required');
  });

  it('maps a ticket-time 429 to rate-limited', async () => {
    stubFetch((path) => {
      if (path === '/api/runtime/ticket')
        return Promise.resolve(jsonResponse({ error: 'rate_limited' }, 429));
      return Promise.resolve(jsonResponse({}));
    });
    const response = await controlRuntime('session_transport', 4, {
      type: 'set_mode',
      mode: 'plan',
    });
    expect(response.outcome.status).toBe('unavailable');
    expect(response.outcome.issueCode).toBe('rate-limited');
  });

  it('classifies transport failure after submission as delivery-unknown', async () => {
    stubFetch((path) => {
      if (path === '/api/auth/ticket') {
        return Promise.resolve(
          jsonResponse({ ticket: 'ticket_1', expiresAt: '2099-01-01T00:00:00.000Z' }),
        );
      }
      return Promise.reject(new TypeError('Network request failed'));
    });
    const response = await controlRuntime('session_transport', 4, {
      type: 'set_thinking_level',
      level: 'max',
    });
    expect(response.outcome.status).toBe('delivery-unknown');
  });

  it('classifies an aborted submission as delivery-unknown', async () => {
    stubFetch(
      (path, init) =>
        new Promise<Response>((_resolve, reject) => {
          if (path === '/api/auth/ticket') {
            _resolve(jsonResponse({ ticket: 'ticket_1', expiresAt: '2099-01-01T00:00:00.000Z' }));
            return;
          }
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();
    const pending = controlRuntime(
      'session_transport',
      4,
      { type: 'set_thinking_level', level: 'max' },
      undefined,
      controller.signal,
    );
    controller.abort();
    const response = await pending;
    expect(response.outcome.status).toBe('delivery-unknown');
  });

  it('classifies an unreadable control body as delivery-unknown', async () => {
    stubFetch((path) => {
      if (path === '/api/auth/ticket') {
        return Promise.resolve(
          jsonResponse({ ticket: 'ticket_1', expiresAt: '2099-01-01T00:00:00.000Z' }),
        );
      }
      return Promise.resolve(jsonResponse({ nope: true }, 202));
    });
    const response = await controlRuntime('session_transport', 4, {
      type: 'set_thinking_level',
      level: 'max',
    });
    expect(response.outcome.status).toBe('delivery-unknown');
  });

  it('returns host outcomes untouched', async () => {
    stubFetch((path) => {
      if (path === '/api/auth/ticket') {
        return Promise.resolve(
          jsonResponse({ ticket: 'ticket_1', expiresAt: '2099-01-01T00:00:00.000Z' }),
        );
      }
      return Promise.resolve(
        jsonResponse({ outcome: { status: 'stale', state: { ...HOST_STATE, revision: 9 } } }, 409),
      );
    });
    const response = await controlRuntime('session_transport', 4, {
      type: 'set_thinking_level',
      level: 'max',
    });
    expect(response.outcome.status).toBe('stale');
    expect(response.outcome.state.revision).toBe(9);
  });
});
