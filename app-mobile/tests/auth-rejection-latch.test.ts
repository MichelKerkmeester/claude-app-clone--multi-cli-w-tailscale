import { readFileSync } from 'node:fs';

// ───────────────────────────────────────────────────────────────────
// MODULE: E2EE Auth Rejection Latch Tests
// ───────────────────────────────────────────────────────────────────
// Three consecutive socket auth rejections trip the re-pairing latch; one or
// two must not. Only a successful full auth (establishSession) clears the
// count — a failed auth attempt must leave it standing, and nothing decays it.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_REJECTION_LATCH_THRESHOLD,
  authRejectionLatchTripped,
  clearAuthRejectionStrikes,
  recordAuthRejectionStrike,
} from '../src/shared/transport/auth-rejection-latch.js';
import { establishSession } from '../src/shared/transport/auth.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const FUTURE = '2099-01-01T00:00:00.000Z';

// Node's webcrypto keys are opaque brand-checked objects that fail the
// `instanceof CryptoKey` record check in this environment, so the auth round
// trip is exercised with a stub signing boundary: the behavior under test is
// the latch-clear wiring around the auth flow, not ECDSA itself.
class FakeCryptoKey {}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubSigningBoundary(): void {
  vi.stubGlobal('CryptoKey', FakeCryptoKey);
  vi.stubGlobal('crypto', {
    subtle: { sign: async () => new Uint8Array([1, 2, 3]) },
  });
}

function deviceRecord(): Record<string, unknown> {
  return {
    id: 'device',
    deviceId: 'device_latch_recovery',
    hostFingerprint: 'fp_latch_recovery',
    origin: window.location.origin,
    privateKey: new FakeCryptoKey(),
  };
}

/** Minimal indexedDB fake carrying one device record for the auth module. */
function stubDeviceStorage(device: Record<string, unknown>): void {
  const database = {
    objectStoreNames: { contains: () => true },
    close: () => undefined,
    transaction: () => {
      const transaction = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        objectStore: () => ({
          get: () => {
            const request = {
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
              result: device,
            };
            queueMicrotask(() => {
              request.onsuccess?.();
              transaction.oncomplete?.();
            });
            return request;
          },
          put: () => ({}),
          delete: () => ({}),
        }),
      };
      return transaction;
    },
  };
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request = {
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        result: database as unknown,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  });
}

/** Stub the two auth endpoints so establishSession completes its round trip. */
function stubAuthRoundTrip(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/auth/challenge') {
        return jsonResponse({
          challengeId: 'challenge_latch_001',
          challenge: 'challenge_secret_001',
          expiresAt: FUTURE,
        });
      }
      if (path === '/api/auth/session') {
        return jsonResponse({ expiresAt: FUTURE, mode: 'read-only' });
      }
      throw new Error(`Unexpected auth fetch: ${path}`);
    }),
  );
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  clearAuthRejectionStrikes();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('auth rejection latch threshold', () => {
  it('stays quiet through two strikes and trips on the third', () => {
    expect(AUTH_REJECTION_LATCH_THRESHOLD).toBe(3);

    expect(recordAuthRejectionStrike()).toBe(1);
    expect(authRejectionLatchTripped()).toBe(false);
    expect(recordAuthRejectionStrike()).toBe(2);
    expect(authRejectionLatchTripped()).toBe(false);

    expect(recordAuthRejectionStrike()).toBe(3);
    expect(authRejectionLatchTripped()).toBe(true);
  });

  it('re-authenticating does NOT clear the latch — the socket still gets rejected', async () => {
    stubSigningBoundary();
    stubDeviceStorage(deviceRecord());
    stubAuthRoundTrip();

    recordAuthRejectionStrike();
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(false);

    // A reconnect re-authenticates before its socket opens. Succeeding here
    // says nothing about whether the socket will accept the device, so the
    // count must survive it — otherwise a revoked device retries forever and
    // the re-pairing screen is never reached.
    const identity = await establishSession();
    expect(identity?.deviceId).toBe('device_latch_recovery');

    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(true);
  });

  it('a failed auth attempt never clears the latch', async () => {
    stubSigningBoundary();
    stubDeviceStorage(deviceRecord());
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Relay unreachable.');
      }),
    );

    recordAuthRejectionStrike();
    recordAuthRejectionStrike();

    await expect(establishSession()).rejects.toThrow();

    // The standing strikes survive the failure; one more trips re-pairing.
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(true);
  });

  it('clearing resets the count so a later blip starts from zero', () => {
    recordAuthRejectionStrike();
    recordAuthRejectionStrike();
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(true);

    clearAuthRejectionStrikes();
    expect(authRejectionLatchTripped()).toBe(false);
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(false);
  });
});

describe('the latch survives the reconnect path that resets it', () => {
  it('is not cleared by re-authenticating — only a proven-live socket clears it', () => {
    // Every reconnect completes a full challenge before its socket opens, so
    // if establishing a session cleared the count, a rejection could never
    // accumulate past one and the re-pairing screen would be unreachable.
    const authSource = readFileSync('app-mobile/src/shared/transport/auth.ts', 'utf8');
    const establishBody = authSource.slice(
      authSource.indexOf('export async function establishSession'),
      authSource.indexOf('export async function revokeDevice'),
    );
    expect(establishBody).not.toContain('clearAuthRejectionStrikes');

    // The clear belongs to the live-stream path instead.
    const socketSource = readFileSync(
      'app-mobile/src/shared/transport/use-sync-socket.svelte.ts',
      'utf8',
    );
    expect(socketSource).toContain('clearAuthRejectionStrikes');
    const liveBlock = socketSource.slice(
      socketSource.indexOf("dispatchConnection({ type: 'live'"),
      socketSource.indexOf("dispatchConnection({ type: 'live'") + 600,
    );
    expect(liveBlock).toContain('clearAuthRejectionStrikes');
  });

  it('accumulates across repeated rejections without an intervening live stream', () => {
    clearAuthRejectionStrikes();
    recordAuthRejectionStrike();
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(false);
    recordAuthRejectionStrike();
    expect(authRejectionLatchTripped()).toBe(true);
  });
});
