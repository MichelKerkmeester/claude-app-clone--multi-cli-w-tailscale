// ───────────────────────────────────────────────────────────────────
// MODULE: Prompt Delivery Outcomes (relay transport)
// ───────────────────────────────────────────────────────────────────
// Proves submitPrompt settles into exactly three distinguishable delivery
// verdicts — accepted (resolve), rejected (definitive non-delivery), and
// delivery-unknown (may have landed) — and that the outcome survives a
// catch-and-rethrow.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TextBlock } from '@pi-remote/pi-rpc-protocol';

import {
  PROMPT_DELIVERY_UNKNOWN,
  PromptDeliveryError,
  submitPrompt,
} from '../src/shared/transport/relay.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session_delivery';
const SUBMISSION_ID = 'submission_delivery_01';

const ACK_BLOCK: TextBlock = {
  id: 'block_delivery_ack',
  kind: 'text',
  role: 'user',
  text: 'ack',
  revision: 1,
  seq: 1,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

const TICKET = { ticket: 'ticket_delivery_ok', expiresAt: '2026-01-01T00:05:00.000Z' };

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubFetch(handler: (path: string) => Promise<Response>): void {
  vi.stubGlobal('fetch', vi.fn(handler));
}

/** Counts how many catch-and-rethrow hops an error actually travelled. */
let rethrowHops = 0;

/** Submit through a wrapper that inspects the error and passes it on untouched. */
async function submitThroughRethrow(): Promise<unknown> {
  try {
    return await submitPrompt(SESSION_ID, SUBMISSION_ID, 'hello');
  } catch (error) {
    rethrowHops += 1;
    throw error;
  }
}

beforeEach(() => {
  rethrowHops = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('submitPrompt delivery outcomes', () => {
  it('accepted: resolves with the acknowledged block', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.resolve(jsonResponse({ accepted: true, block: ACK_BLOCK }, 202)),
    );
    const block = await submitPrompt(SESSION_ID, SUBMISSION_ID, 'hello');
    expect(block).toEqual(ACK_BLOCK);
  });

  it('rejected: a relay refusal below 5xx is definite non-delivery', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.resolve(jsonResponse({ error: 'access_denied' }, 401)),
    );
    const error = (await submitThroughRethrow().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual({ status: 'rejected', reasonCode: 'access_denied' });
  });

  it('rejected: a failed ticket request never reached the submit endpoint', async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: 'access_denied' }, 403)));
    const error = (await submitThroughRethrow().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual({ status: 'rejected', reasonCode: 'access_denied' });
  });

  it('delivery-unknown: a 5xx answer may still have accepted the prompt', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.resolve(jsonResponse({ error: 'host-unavailable' }, 503)),
    );
    const error = (await submitThroughRethrow().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual(PROMPT_DELIVERY_UNKNOWN);
  });

  it('delivery-unknown: a network-level failure carries no relay refusal', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.reject(new TypeError('Failed to fetch')),
    );
    const error = (await submitThroughRethrow().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual(PROMPT_DELIVERY_UNKNOWN);
  });

  it('delivery-unknown: an unreadable 202 body cannot confirm acceptance', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.resolve(jsonResponse({ accepted: true, unrelated: true }, 202)),
    );
    const error = (await submitThroughRethrow().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual(PROMPT_DELIVERY_UNKNOWN);
  });

  it('delivery-unknown: an aborted in-flight request may have landed', async () => {
    stubFetch((path, init) => {
      // The ticket settles so the abort lands only on the submit POST itself.
      if (path === '/api/auth/ticket') return Promise.resolve(jsonResponse(TICKET));
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        const abort = (): void => reject(new DOMException('Aborted', 'AbortError'));
        if (signal?.aborted === true) {
          abort();
          return;
        }
        signal?.addEventListener('abort', abort, { once: true });
      });
    });
    const controller = new AbortController();
    const pending = submitPrompt(SESSION_ID, SUBMISSION_ID, 'hello', undefined, controller.signal);
    const settle = async (): Promise<unknown> => {
      try {
        return await pending;
      } catch (error) {
        rethrowHops += 1;
        throw error;
      }
    };
    // Let the submit POST reach the wire before aborting, so the abort is
    // in-flight rather than pre-submit.
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const error = (await settle().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome).toEqual(PROMPT_DELIVERY_UNKNOWN);
  });

  it('the unknown outcome survives a catch-and-rethrow unchanged', async () => {
    stubFetch((path) =>
      path === '/api/auth/ticket'
        ? Promise.resolve(jsonResponse(TICKET))
        : Promise.reject(new TypeError('Failed to fetch')),
    );
    const outer = async (): Promise<unknown> => {
      try {
        return await submitThroughRethrow();
      } catch (error) {
        rethrowHops += 1;
        throw error;
      }
    };
    const error = (await outer().catch((cause) => cause)) as PromptDeliveryError;
    expect(error).toBeInstanceOf(PromptDeliveryError);
    expect(error.outcome.status).toBe('delivery-unknown');
    expect(error.outcome.reasonCode).toBe('delivery_unknown');
    // Two real hops carried it: the inner submit wrapper and the outer caller.
    expect(rethrowHops).toBe(2);
  });
});
