// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Device Proofs
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { DevicePublicKeyJwk, EnrollmentQr, SessionChallengeResponse } from './types.js';

/** Produce the byte-stable enrollment statement signed by a new device. */
// ───────────────────────────────────────────────────────────────────
// 2. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function enrollmentProof(enrollment: EnrollmentQr, publicKey: DevicePublicKeyJwk): string {
  return [
    'pi-remote-enrollment-v1',
    enrollment.origin,
    enrollment.pairingId,
    enrollment.hostFingerprint,
    enrollment.challenge,
    enrollment.expiresAt,
    publicKey.kty,
    publicKey.crv,
    publicKey.x,
    publicKey.y,
  ].join('\n');
}

/** Produce the byte-stable proof used to exchange a device challenge for a session. */
export function sessionProof(
  origin: string,
  deviceId: string,
  challenge: SessionChallengeResponse,
): string {
  return [
    'pi-remote-session-v1',
    origin,
    deviceId,
    challenge.challengeId,
    challenge.challenge,
    challenge.expiresAt,
  ].join('\n');
}
