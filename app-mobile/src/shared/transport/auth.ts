// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Device Enrollment
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  enrollmentProof,
  isApplicationSessionResponse,
  isEnrollmentQr,
  isEnrollmentResponse,
  isSessionChallengeResponse,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
} from '@pi-remote/pi-rpc-protocol';

import { DEMO_IDENTITY, isDemoMode } from '../fixtures/demo.js';
import { clearAuthRejectionStrikes } from './auth-rejection-latch.js';
import {
  completeDeviceCleanup,
  enqueueDeviceCleanup,
} from '../state/device-cleanup-queue.js';
import { raceWithTimeout, RaceTimeoutError } from '../state/race-timeout.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS AND DEVICE TYPES
// ───────────────────────────────────────────────────────────────────

const DATABASE_NAME = 'pi-remote-device-v1';
const STORE_NAME = 'credentials';
const DEVICE_RECORD = 'device';
// Demo has no relay expiry, so keep its observable deadline outside normal app lifetimes.
export const DEMO_SESSION_EXPIRES_AT = '9999-12-31T23:59:59.999Z';

// Used pairing IDs are tracked in memory to enforce single-use tokens.
// A dropped enrollment must prompt a fresh code, never reuse the same QR.
const usedPairingIds = new Set<string>();

interface StoredDevice {
  readonly id: typeof DEVICE_RECORD;
  readonly deviceId: string;
  readonly hostFingerprint: string;
  readonly origin: string;
  readonly privateKey: CryptoKey;
}

export interface DeviceIdentity {
  readonly deviceId: string;
  readonly hostFingerprint: string;
}

export interface ApplicationSession extends DeviceIdentity {
  readonly expiresAt: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. DEVICE ENROLLMENT
// ───────────────────────────────────────────────────────────────────

export async function enrollDevice(serializedQr: string, signal?: AbortSignal): Promise<DeviceIdentity> {
  const enrollment = parseEnrollment(serializedQr);
  if (enrollment === null) {
    throw new Error('The enrollment data is invalid.');
  }
  const endpointValidation = validateEnrollmentEndpoint(enrollment.origin);
  if (!endpointValidation.accepted) {
    throw new Error(
      endpointValidation.reason === 'requires-tls'
        ? 'Enrollment requires a secure relay endpoint.'
        : 'Enrollment endpoint is invalid.',
    );
  }
  if (enrollment.origin !== window.location.origin) {
    throw new Error('This enrollment belongs to a different relay origin.');
  }
  if (Date.parse(enrollment.expiresAt) <= Date.now()) {
    throw new Error('This enrollment challenge has expired.');
  }
  if (usedPairingIds.has(enrollment.pairingId)) {
    throw new Error('This enrollment code has already been used. Please scan a fresh QR code.');
  }

  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify',
  ]);
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const devicePublicKey = parsePublicKey(publicKey);
  const signature = await sign(keyPair.privateKey, enrollmentProof(enrollment, devicePublicKey));
  // Owned abort controller lets the timeout dispose abort the in-flight fetch.
  // Wire the external signal to abort the internal controller so the timeout
  // dispose path is clean and fetch is not called with a to-be-aborted signal.
  const abortController = new AbortController();
  if (signal?.aborted === true) {
    throw new RaceTimeoutError('aborted');
  }
  signal?.addEventListener('abort', () => abortController.abort(), { once: true });
  const response = await raceWithTimeout(
    postJson('/api/auth/enroll', {
      enrollment,
      publicKey: devicePublicKey,
      signature,
    }, abortController.signal),
    {
      timeoutMs: 60_000,
      dispose: () => abortController.abort(),
    },
  );
  if (!isEnrollmentResponse(response) || response.hostFingerprint !== enrollment.hostFingerprint) {
    throw new Error('The relay returned an invalid enrollment response.');
  }
  // Mark the pairing token as spent after a successful response.
  usedPairingIds.add(enrollment.pairingId);
  await saveDevice({
    id: DEVICE_RECORD,
    deviceId: response.deviceId,
    hostFingerprint: response.hostFingerprint,
    origin: enrollment.origin,
    privateKey: keyPair.privateKey,
  });
  return response;
}

// ───────────────────────────────────────────────────────────────────
// 5. ENROLLMENT VALIDATION HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Parse a serialized enrollment QR string into an `EnrollmentQr` object.
 * Returns null on any malformed input instead of throwing.
 */
export function parseEnrollment(serialized: string): EnrollmentQr | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (isEnrollmentQr(value)) return value;
  } catch {
    // The null return below deliberately avoids reflecting untrusted QR contents.
  }
  return null;
}

export interface EndpointValidation {
  readonly accepted: boolean;
  readonly reason: 'ok' | 'loopback' | 'requires-tls' | 'unsupported-protocol' | 'invalid-origin';
}

/**
 * Validate that an enrollment endpoint is reachable over a secure connection.
 * Plaintext (http) is allowed only for loopback addresses (localhost, 127.0.0.1, ::1).
 */
export function validateEnrollmentEndpoint(origin: string): EndpointValidation {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return { accepted: false, reason: 'invalid-origin' };
  }
  const protocol = url.protocol;
  if (protocol === 'https:') return { accepted: true, reason: 'ok' };
  if (protocol === 'http:') {
    const hostname = url.hostname;
    // Strip brackets from IPv6 for comparison.
    const raw = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
    if (raw === 'localhost' || raw === '127.0.0.1' || raw === '::1') {
      return { accepted: true, reason: 'loopback' };
    }
    return { accepted: false, reason: 'requires-tls' };
  }
  return { accepted: false, reason: 'unsupported-protocol' };
}

/**
 * Check whether a pairing token has already been used (single-use enforcement).
 * A dropped enrollment must prompt a fresh code.
 */
export function isPairingTokenUsed(pairingId: string): boolean {
  return usedPairingIds.has(pairingId);
}

/**
 * Clear the used-pairing-token set. Called when the user starts a fresh enrollment flow.
 */
export function clearUsedPairingTokens(): void {
  usedPairingIds.clear();
}

/**
 * Register a pairing token as used (testing support).
 * Exported for tests to exercise the reject-on-reuse path without mocking
 * crypto, fetch, and indexedDB.
 */
export function _registerPairingTokenForTest(pairingId: string): void {
  usedPairingIds.add(pairingId);
}

// ───────────────────────────────────────────────────────────────────
// 4. SESSION ESTABLISHMENT AND REVOCATION
// ───────────────────────────────────────────────────────────────────

export async function establishSession(): Promise<ApplicationSession | null> {
  if (isDemoMode()) {
    return { ...DEMO_IDENTITY, expiresAt: DEMO_SESSION_EXPIRES_AT };
  }
  const device = await loadDevice();
  if (device === null) return null;
  if (device.origin !== window.location.origin) {
    await clearDevice();
    return null;
  }
  const challenge = await postJson('/api/auth/challenge', { deviceId: device.deviceId });
  if (!isSessionChallengeResponse(challenge)) {
    throw new Error('The relay returned an invalid authentication challenge.');
  }
  const signature = await sign(
    device.privateKey,
    sessionProof(window.location.origin, device.deviceId, challenge),
  );
  const session = await postJson('/api/auth/session', {
    deviceId: device.deviceId,
    challengeId: challenge.challengeId,
    signature,
  });
  if (!isApplicationSessionResponse(session)) {
    throw new Error('The relay returned an invalid application session.');
  }
  return {
    deviceId: device.deviceId,
    hostFingerprint: device.hostFingerprint,
    expiresAt: session.expiresAt,
  };
}

export async function revokeDevice(): Promise<void> {
  try {
    await postJson('/api/auth/revoke-device', undefined);
  } catch (cause) {
    enqueueDeviceCleanup('revoke');
    throw cause;
  }

  try {
    await clearDevice();
  } catch (cause) {
    enqueueDeviceCleanup('revoke');
    throw cause;
  }
  completeDeviceCleanup('revoke');
}

export async function logoutDevice(): Promise<void> {
  try {
    await postJson('/api/auth/logout', undefined);
  } catch (cause) {
    enqueueDeviceCleanup('logout');
    throw cause;
  }
  completeDeviceCleanup('logout');
}

// ───────────────────────────────────────────────────────────────────
// 7. QR IMAGE SCANNING
// ───────────────────────────────────────────────────────────────────

export async function scanQrImage(file: File): Promise<string> {
  const Detector = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect(source: ImageBitmap): Promise<Array<{ rawValue: string }>>;
      };
    }
  ).BarcodeDetector;
  if (Detector === undefined) {
    throw new Error(
      'QR image scanning is not available in this browser. Paste the QR data instead.',
    );
  }
  const image = await createImageBitmap(file);
  try {
    const results = await new Detector({ formats: ['qr_code'] }).detect(image);
    const value = results[0]?.rawValue;
    if (value === undefined) throw new Error('No QR code was found in that image.');
    return value;
  } finally {
    image.close();
  }
}

// ───────────────────────────────────────────────────────────────────
// 8. SIGNING AND RELAY REQUEST HELPERS
// ───────────────────────────────────────────────────────────────────

function parsePublicKey(value: JsonWebKey): DevicePublicKeyJwk {
  if (
    value.kty !== 'EC' ||
    value.crv !== 'P-256' ||
    typeof value.x !== 'string' ||
    typeof value.y !== 'string'
  ) {
    throw new Error('The browser generated an unsupported device key.');
  }
  return { kty: 'EC', crv: 'P-256', x: value.x, y: value.y };
}

async function sign(privateKey: CryptoKey, statement: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(statement),
  );
  return toBase64Url(new Uint8Array(signature));
}

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) throw new Error(`Relay authentication failed with HTTP ${response.status}.`);
  return response.status === 204 ? null : (response.json() as Promise<unknown>);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

// ───────────────────────────────────────────────────────────────────
// 9. DEVICE STORAGE
// ───────────────────────────────────────────────────────────────────

async function loadDevice(): Promise<StoredDevice | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(DEVICE_RECORD);
    request.onsuccess = () => resolve(isStoredDevice(request.result) ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error('Device storage read failed.'));
    transaction.oncomplete = () => database.close();
  });
}

async function saveDevice(device: StoredDevice): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(device);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Device storage write failed.'));
  });
}

async function clearDevice(): Promise<void> {
  // The strike count belongs to the device identity being torn down; a
  // freshly paired device must never start life part-way to re-pairing.
  clearAuthRejectionStrikes();
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(DEVICE_RECORD);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Device storage clear failed.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Device storage unavailable.'));
  });
}

function isStoredDevice(value: unknown): value is StoredDevice {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    value.id === DEVICE_RECORD &&
    'deviceId' in value &&
    typeof value.deviceId === 'string' &&
    'hostFingerprint' in value &&
    typeof value.hostFingerprint === 'string' &&
    'origin' in value &&
    typeof value.origin === 'string' &&
    'privateKey' in value &&
    value.privateKey instanceof CryptoKey
  );
}
