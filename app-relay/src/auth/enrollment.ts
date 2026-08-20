// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Device Enrollment Registry
// ───────────────────────────────────────────────────────────────────

import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';

import {
  enrollmentProof,
  isDevicePublicKeyJwk,
  isEnrollmentQr,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type EnrollmentRequest,
} from '@pi-remote/pi-rpc-protocol';

// Private single-operator deployment favors a longer pairing window so phone enrollment over
// the tailnet is not a race. The challenge stays single-use and signature-bound, and is only
// reachable over the private tailnet, so the wider window adds little practical exposure.
const DEFAULT_CHALLENGE_TTL_MS = 30 * 60_000;

interface PendingEnrollment {
  readonly payload: EnrollmentQr;
  consumed: boolean;
}

export interface EnrolledDevice {
  readonly id: string;
  readonly publicKey: DevicePublicKeyJwk;
  readonly principal: string;
  readonly origin: string;
  revoked: boolean;
}

export interface EnrollmentRegistryOptions {
  readonly origin: string;
  readonly hostId: string;
  readonly now?: () => number;
  readonly challengeTtlMs?: number;
}

/** Own short-lived pairing challenges and enrolled device public keys. */
export class EnrollmentRegistry {
  private readonly pending = new Map<string, PendingEnrollment>();
  private readonly devices = new Map<string, EnrolledDevice>();
  private readonly now: () => number;
  private readonly challengeTtlMs: number;
  public readonly hostFingerprint: string;

  public constructor(private readonly options: EnrollmentRegistryOptions) {
    this.now = options.now ?? Date.now;
    this.challengeTtlMs = options.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;
    this.hostFingerprint = `host_${createHash('sha256')
      .update(`pi-remote-host\0${options.hostId}`)
      .digest('base64url')
      .slice(0, 32)}`;
  }

  /** Create data intended for a local operator to transfer once by QR. */
  public createChallenge(): EnrollmentQr {
    this.prune();
    const pairingId = opaqueId('pair');
    const payload: EnrollmentQr = {
      v: 1,
      origin: this.options.origin,
      pairingId,
      hostFingerprint: this.hostFingerprint,
      challenge: opaqueId('challenge'),
      expiresAt: new Date(this.now() + this.challengeTtlMs).toISOString(),
    };
    this.pending.set(pairingId, { payload, consumed: false });
    return payload;
  }

  /** Consume a valid pairing challenge only after proving possession of the submitted key. */
  public enroll(request: EnrollmentRequest, principal: string): EnrolledDevice | null {
    if (
      !isEnrollmentQr(request.enrollment) ||
      !isDevicePublicKeyJwk(request.publicKey) ||
      !isBase64Url(request.signature)
    ) {
      return null;
    }
    const pending = this.pending.get(request.enrollment.pairingId);
    if (
      pending === undefined ||
      pending.consumed ||
      !sameEnrollment(pending.payload, request.enrollment) ||
      request.enrollment.origin !== this.options.origin ||
      request.enrollment.hostFingerprint !== this.hostFingerprint ||
      Date.parse(request.enrollment.expiresAt) <= this.now() ||
      !verifyDeviceSignature(
        request.publicKey,
        enrollmentProof(request.enrollment, request.publicKey),
        request.signature,
      )
    ) {
      return null;
    }

    pending.consumed = true;
    this.pending.delete(request.enrollment.pairingId);
    const device: EnrolledDevice = {
      id: opaqueId('device'),
      publicKey: request.publicKey,
      principal,
      origin: request.enrollment.origin,
      revoked: false,
    };
    this.devices.set(device.id, device);
    return device;
  }

  public getActiveDevice(deviceId: string): EnrolledDevice | null {
    const device = this.devices.get(deviceId);
    return device === undefined || device.revoked ? null : device;
  }

  public revoke(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (device === undefined || device.revoked) return false;
    device.revoked = true;
    return true;
  }

  private prune(): void {
    for (const [id, enrollment] of this.pending) {
      if (enrollment.consumed || Date.parse(enrollment.payload.expiresAt) <= this.now()) {
        this.pending.delete(id);
      }
    }
  }
}

export function verifyDeviceSignature(
  publicKey: DevicePublicKeyJwk,
  statement: string,
  signature: string,
): boolean {
  try {
    return verify(
      'sha256',
      Buffer.from(statement, 'utf8'),
      {
        key: createPublicKey({ key: { ...publicKey }, format: 'jwk' }),
        dsaEncoding: 'ieee-p1363',
      },
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    return false;
  }
}

function opaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

function sameEnrollment(left: EnrollmentQr, right: EnrollmentQr): boolean {
  return (
    left.v === right.v &&
    left.origin === right.origin &&
    left.pairingId === right.pairingId &&
    left.hostFingerprint === right.hostFingerprint &&
    left.challenge === right.challenge &&
    left.expiresAt === right.expiresAt
  );
}

function isBase64Url(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 64 &&
    value.length <= 256 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}
