// ───────────────────────────────────────────────────────────────────
// MODULE: Ask-Question Activation Tests
// ───────────────────────────────────────────────────────────────────
// The service exists and is tested; what was never true is that anything
// constructed it. A service reachable only from its own test is
// indistinguishable from one that does not exist, so this boots the real relay
// entry point and asks its routes whether they can answer at all.

import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type SessionChallengeResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runRelay } from '../src/index.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const PORT = 4_411;
const SESSION_ID = 'session_local';

let shutdown: (() => Promise<void>) | null = null;
let databaseRoot: string | null = null;
let ingressUrl = '';
const savedEnvironment: Record<string, string | undefined> = {};

const ENVIRONMENT = {
  PI_REMOTE_PUBLIC_ORIGIN: ORIGIN,
  PI_REMOTE_SERVE_SECRET: SERVE_SECRET,
  PI_REMOTE_PORT: String(PORT),
  // Fixture mode keeps the supervisor from spawning a real Pi child; the
  // wiring under test is the relay's own, not the host's.
  PI_REMOTE_USE_FIXTURE: '1',
  // The entry point exposes no auth handle, but it prints one enrollment
  // challenge under this flag — which is the only way in from outside.
  PI_REMOTE_PRINT_ENROLLMENT: '1',
};

let enrollment: EnrollmentQr | null = null;

beforeEach(async () => {
  databaseRoot = mkdtempSync(join(tmpdir(), 'pi-remote-ask-question-'));
  for (const [key, value] of Object.entries({
    ...ENVIRONMENT,
    PI_REMOTE_DB: join(databaseRoot, 'relay.db'),
  })) {
    savedEnvironment[key] = process.env[key];
    process.env[key] = value;
  }
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (enrollment === null && text.trimStart().startsWith('{')) {
      try {
        enrollment = JSON.parse(text) as EnrollmentQr;
      } catch {
        // Not the enrollment line; leave it alone.
      }
    }
    return originalWrite(chunk as never, ...(rest as []));
  }) as typeof process.stdout.write;
  try {
    shutdown = await runRelay();
  } finally {
    process.stdout.write = originalWrite;
  }
  ingressUrl = `http://127.0.0.1:${PORT}/_serve/${SERVE_SECRET}`;
});

afterEach(async () => {
  enrollment = null;
  if (shutdown !== null) await shutdown();
  shutdown = null;
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (databaseRoot !== null) await rm(databaseRoot, { recursive: true, force: true });
  databaseRoot = null;
});

describe('ask-question activation', () => {
  it('answers from a constructed service rather than reporting itself unavailable', async () => {
    const cookie = await authorize();

    const response = await post(ingressUrl, '/api/ask-question/display', {
      headers: authorizedHeaders(cookie),
      body: { sessionId: SESSION_ID, questionId: 'question_activation_0001', revision: 1 },
    });

    const payload = (await response.json()) as { error?: string };

    // The distinction is the whole packet: an unwired relay reports that the
    // capability does not exist, while a wired one looks for the question and
    // reports that this particular one is not there.
    expect(payload.error).not.toBe('ask_question_unavailable');
    expect(response.status).not.toBe(503);
    expect(response.status).toBe(404);
  });

  it('refuses an answer ticket for an unknown question instead of reporting unavailable', async () => {
    const cookie = await authorize();

    const response = await post(ingressUrl, '/api/ask-question/ticket', {
      headers: authorizedHeaders(cookie),
      body: { sessionId: SESSION_ID, questionId: 'question_activation_0002', revision: 1 },
    });

    const payload = (await response.json()) as { error?: string };
    expect(payload.error).not.toBe('ask_question_unavailable');
    expect(response.status).not.toBe(503);
  });
});

async function authorize(): Promise<string> {
  if (enrollment === null) throw new Error('The relay printed no enrollment challenge.');
  const keys = deviceKeys();
  const enrolled = await post(ingressUrl, '/api/auth/enroll', {
    headers: trustedHeaders(),
    body: enrollmentBody(enrollment, keys),
  });
  const { deviceId } = (await enrolled.json()) as { deviceId: string };
  const challengeResponse = await post(ingressUrl, '/api/auth/challenge', {
    headers: trustedHeaders(),
    body: { deviceId },
  });
  const challenge = (await challengeResponse.json()) as SessionChallengeResponse;
  const sessionResponse = await post(ingressUrl, '/api/auth/session', {
    headers: trustedHeaders(),
    body: {
      deviceId,
      challengeId: challenge.challengeId,
      signature: signStatement(keys.privateKey, sessionProof(ORIGIN, deviceId, challenge)),
    },
  });
  const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
  if (cookie === undefined) throw new Error('Test session omitted its cookie.');
  return cookie;
}

function deviceKeys(): { publicKey: DevicePublicKeyJwk; privateKey: KeyObject } {
  const keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKey = keys.publicKey.export({ format: 'jwk' });
  if (
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    publicKey.x === undefined ||
    publicKey.y === undefined
  ) {
    throw new Error('Test key export failed.');
  }
  return {
    publicKey: { kty: 'EC', crv: 'P-256', x: publicKey.x, y: publicKey.y },
    privateKey: keys.privateKey,
  };
}

function enrollmentBody(
  enrollment: EnrollmentQr,
  keys: { readonly publicKey: DevicePublicKeyJwk; readonly privateKey: KeyObject },
) {
  return {
    enrollment,
    publicKey: keys.publicKey,
    signature: signStatement(keys.privateKey, enrollmentProof(enrollment, keys.publicKey)),
  };
}

function signStatement(privateKey: KeyObject, statement: string): string {
  return sign('sha256', Buffer.from(statement), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}

function trustedHeaders(origin = ORIGIN): Record<string, string> {
  return { origin, 'tailscale-user-login': PRINCIPAL };
}

function authorizedHeaders(cookie: string, origin = ORIGIN): Record<string, string> {
  return { ...trustedHeaders(origin), cookie };
}

function post(
  baseUrl: string,
  path: string,
  options: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
  } = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}
