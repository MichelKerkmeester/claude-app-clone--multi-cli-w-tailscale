// ───────────────────────────────────────────────────────────────────
// MODULE: Device Enrollment Parsing and Validation Tests
// ───────────────────────────────────────────────────────────────────

// Proves that parseEnrollment returns a typed null on malformed input
// instead of throwing; that validateEnrollmentEndpoint rejects non-TLS
// endpoints (loopback-only for plaintext); and that the pairing token
// is treated as single-use.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, beforeEach } from 'vitest';

import {
  parseEnrollment,
  validateEnrollmentEndpoint,
  isPairingTokenUsed,
  clearUsedPairingTokens,
  _registerPairingTokenForTest,
  enrollDevice,
} from '../src/shared/transport/auth.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearUsedPairingTokens();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('parseEnrollment', () => {
  it('returns null on malformed JSON', () => {
    expect(parseEnrollment('not-json')).toBeNull();
  });

  it('returns null on a plain JSON object missing enrollment fields', () => {
    expect(parseEnrollment('{"hello":"world"}')).toBeNull();
  });

  it('returns null on an empty string', () => {
    expect(parseEnrollment('')).toBeNull();
  });

  it('returns null on a number', () => {
    expect(parseEnrollment('42')).toBeNull();
  });

  it('returns null on an array', () => {
    expect(parseEnrollment('[]')).toBeNull();
  });

  it('returns null for an enrollment with a wrong version', () => {
    const qr = JSON.stringify({
      v: 2,
      origin: 'https://relay.example.com',
      pairingId: 'pair_abc123',
      hostFingerprint: 'fp_abc',
      challenge: 'ch_abc',
      expiresAt: '2099-12-31T23:59:59.999Z',
    });
    expect(parseEnrollment(qr)).toBeNull();
  });

  it('returns null for an enrollment with a non-opaque-id pairingId', () => {
    const qr = JSON.stringify({
      v: 1,
      origin: 'https://relay.example.com',
      pairingId: 'not-opaque-with-spaces and more',
      hostFingerprint: 'fp_abc',
      challenge: 'ch_abc',
      expiresAt: '2099-12-31T23:59:59.999Z',
    });
    expect(parseEnrollment(qr)).toBeNull();
  });

  it('parses a valid enrollment QR successfully', () => {
    const qr = JSON.stringify({
      v: 1,
      origin: 'https://relay.example.com',
      pairingId: 'pair_abc123',
      hostFingerprint: 'fp_abc123',
      challenge: 'ch_def456',
      expiresAt: '2099-12-31T23:59:59.999Z',
    });
    const result = parseEnrollment(qr);
    expect(result).not.toBeNull();
    expect(result!.origin).toBe('https://relay.example.com');
    expect(result!.pairingId).toBe('pair_abc123');
  });
});

describe('validateEnrollmentEndpoint', () => {
  it('accepts https: origins', () => {
    const result = validateEnrollmentEndpoint('https://relay.example.com');
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('accepts https: with a port', () => {
    const result = validateEnrollmentEndpoint('https://relay.example.com:8443');
    expect(result.accepted).toBe(true);
  });

  it('rejects http: for non-loopback origins', () => {
    const result = validateEnrollmentEndpoint('http://relay.example.com');
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('requires-tls');
  });

  it('accepts http: for localhost', () => {
    const result = validateEnrollmentEndpoint('http://localhost:8080');
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('loopback');
  });

  it('accepts http: for 127.0.0.1', () => {
    const result = validateEnrollmentEndpoint('http://127.0.0.1');
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('loopback');
  });

  it('accepts http: for IPv6 loopback ::1', () => {
    const result = validateEnrollmentEndpoint('http://[::1]:3000');
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('loopback');
  });

  it('rejects unsupported protocols', () => {
    const result = validateEnrollmentEndpoint('ftp://relay.example.com');
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('unsupported-protocol');
  });

  it('rejects invalid origin strings', () => {
    const result = validateEnrollmentEndpoint('');
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('invalid-origin');
  });

  it('rejects malformed origin strings', () => {
    const result = validateEnrollmentEndpoint('not-a-url');
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('invalid-origin');
  });
});

describe('pairing token single-use tracking', () => {
  it('reports a token as not used initially', () => {
    expect(isPairingTokenUsed('pair_abc')).toBe(false);
  });

  it('reports a token as used after it is registered via the registrar', () => {
    _registerPairingTokenForTest('pair_abc');
    expect(isPairingTokenUsed('pair_abc')).toBe(true);
  });

  it('clears all used token state', () => {
    _registerPairingTokenForTest('pair_abc');
    clearUsedPairingTokens();
    expect(isPairingTokenUsed('pair_abc')).toBe(false);
  });

  it('rejects reuse of a pairing token via enrollDevice after registration', async () => {
    _registerPairingTokenForTest('pair_abc');

    // Use window.location.origin so the origin check passes before the reuse check fires.
    const qr = JSON.stringify({
      v: 1,
      origin: window.location.origin,
      pairingId: 'pair_abc',
      hostFingerprint: 'fp_abc123',
      challenge: 'ch_def456',
      expiresAt: '2099-12-31T23:59:59.999Z',
    });

    await expect(enrollDevice(qr)).rejects.toThrow('already been used');
    // The token is still reported as used after the rejection.
    expect(isPairingTokenUsed('pair_abc')).toBe(true);
  });

  it('reports a token as used after a real registration via the registrar', () => {
    _registerPairingTokenForTest('pair_registered');
    expect(isPairingTokenUsed('pair_registered')).toBe(true);
  });
});

describe('enrollDevice signal propagation', () => {
  it('aborts the fetch when an already-aborted signal is passed', async () => {
    const controller = new AbortController();
    controller.abort();

    const qr = JSON.stringify({
      v: 1,
      origin: window.location.origin,
      pairingId: 'pair_abort',
      hostFingerprint: 'fp_abort',
      challenge: 'ch_abort',
      expiresAt: '2099-12-31T23:59:59.999Z',
    });

    await expect(enrollDevice(qr, controller.signal)).rejects.toThrow('aborted');
  });
});