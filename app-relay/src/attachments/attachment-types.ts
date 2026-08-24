// ───────────────────────────────────────────────────────────────────
// MODULE: Relay Attachment Types
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type {
  AttachmentCancellationReason,
  AttachmentManifestItem,
  AttachmentPartStatus,
  AttachmentSetManifest,
  MediaOutputMimeType,
  MediaSourceMimeType,
} from '@pi-remote/pi-rpc-protocol';
import { isOpaqueId } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type AttachmentSetState =
  | 'reserved'
  | 'uploading'
  | 'checking'
  | 'ready'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'delivery-unknown';

export type AttachmentTicketOperation = 'reserve' | 'upload' | 'status' | 'cancel';

export interface AttachmentOwner {
  readonly sessionToken: string;
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
}

export interface AttachmentSetBinding {
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly expectedPromptRevision: number;
  readonly submissionId: string;
}

export interface AttachmentReserveTicketBinding extends AttachmentSetBinding {
  readonly operation: 'reserve';
}

export interface AttachmentUploadTicketBinding extends AttachmentSetBinding {
  readonly operation: 'upload';
  readonly setId: string;
  readonly attachmentId: string;
  readonly partId: string;
  readonly ordinal: number;
  readonly byteLength: number;
  readonly sha256: string;
  readonly declaredType: MediaSourceMimeType;
}

export interface AttachmentStatusTicketBinding extends AttachmentSetBinding {
  readonly operation: 'status';
  readonly setId: string;
}

export interface AttachmentCancelTicketBinding extends AttachmentSetBinding {
  readonly operation: 'cancel';
  readonly setId: string;
  readonly reason: AttachmentCancellationReason;
}

export type AttachmentTicketBinding =
  | AttachmentReserveTicketBinding
  | AttachmentUploadTicketBinding
  | AttachmentStatusTicketBinding
  | AttachmentCancelTicketBinding;

export interface AttachmentTicketDto {
  readonly ticket: string;
  readonly expiresAt: string;
}

export interface AttachmentPartTicketDto extends AttachmentTicketDto {
  readonly attachmentSetId: string;
  readonly attachmentId: string;
  readonly partId: string;
  readonly ordinal: number;
}

export interface AttachmentSetReservationDto {
  readonly attachmentSetId: string;
  readonly revision: number;
  readonly expiresAt: string;
  readonly parts: readonly AttachmentPartTicketDto[];
  readonly statusTicket: AttachmentTicketDto;
  readonly cancelTicket: AttachmentTicketDto;
}

export interface AttachmentPartStatusDto {
  readonly attachmentSetId: string;
  readonly attachmentId: string;
  readonly partId: string;
  readonly ordinal: number;
  readonly status: AttachmentPartStatus;
}

export interface AttachmentStatusDto {
  readonly attachmentSetId: string;
  readonly revision: number;
  readonly status: AttachmentSetState;
  readonly expiresAt: string;
  readonly parts: readonly AttachmentPartStatusDto[];
}

export interface AttachmentReservationRecord {
  readonly setId: string;
  readonly owner: AttachmentOwner;
  readonly binding: AttachmentSetBinding;
  readonly manifest: AttachmentSetManifest;
  readonly modelId: string;
  readonly policyVersion: number;
  readonly expiresAt: number;
}

export interface AttachmentPartRecord {
  readonly setId: string;
  readonly attachmentId: string;
  readonly partId: string;
  readonly item: AttachmentManifestItem;
}

export interface AttachmentLogEvent {
  readonly code: string;
  readonly count: number;
  readonly sizeBucket: string;
  readonly latencyBucket: string;
}

export type AttachmentErrorCode =
  | 'not_found'
  | 'ownership'
  | 'invalid_binding'
  | 'invalid_manifest'
  | 'rate_limited'
  | 'quarantine_full'
  | 'concurrency_limited'
  | 'expired'
  | 'cancelled'
  | 'invalid_content_length'
  | 'body_too_large'
  | 'digest_mismatch'
  | 'unsupported'
  | 'mime_mismatch'
  | 'invalid_image'
  | 'dimensions_exceeded'
  | 'channels_exceeded'
  | 'frames_exceeded'
  | 'animated'
  | 'decode_timeout'
  | 'decode_failed'
  | 'output_too_large'
  | 'internal';

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export class AttachmentServiceError extends Error {
  public constructor(readonly code: AttachmentErrorCode) {
    super(code);
    this.name = 'AttachmentServiceError';
  }
}

export function isAttachmentTicketOperation(value: unknown): value is AttachmentTicketOperation {
  return value === 'reserve' || value === 'upload' || value === 'status' || value === 'cancel';
}

export function isAttachmentTicketBinding(value: unknown): value is AttachmentTicketBinding {
  if (!isRecord(value) || !isAttachmentTicketOperation(value.operation)) return false;
  if (
    !isOpaqueId(value.sessionId) ||
    !isOpaqueId(value.sessionEpoch) ||
    !isOpaqueId(value.submissionId) ||
    !isSafeNonNegativeInteger(value.expectedPromptRevision)
  ) {
    return false;
  }
  if (value.operation === 'reserve') return hasOnlyKeys(value, baseKeys('operation'));
  if (!isOpaqueId(value.setId)) return false;
  if (value.operation === 'status') {
    return hasOnlyKeys(value, baseKeys('operation', 'setId'));
  }
  if (value.operation === 'cancel') {
    return (
      hasOnlyKeys(value, baseKeys('operation', 'setId', 'reason')) &&
      (value.reason === 'user' ||
        value.reason === 'stale' ||
        value.reason === 'expired' ||
        value.reason === 'revoked' ||
        value.reason === 'shutdown')
    );
  }
  return (
    hasOnlyKeys(
      value,
      baseKeys(
        'operation',
        'setId',
        'attachmentId',
        'partId',
        'ordinal',
        'byteLength',
        'sha256',
        'declaredType',
      ),
    ) &&
    isOpaqueId(value.attachmentId) &&
    isOpaqueId(value.partId) &&
    isSafePositiveInteger(value.ordinal) &&
    isSafePositiveInteger(value.byteLength) &&
    isSha256(value.sha256) &&
    isSourceMime(value.declaredType)
  );
}

export function attachmentTicketBindingsEqual(
  left: AttachmentTicketBinding,
  right: AttachmentTicketBinding,
): boolean {
  const leftKeys = Object.keys(left) as Array<keyof AttachmentTicketBinding>;
  const rightKeys = Object.keys(right) as Array<keyof AttachmentTicketBinding>;
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

export function isSourceMime(value: unknown): value is MediaSourceMimeType {
  return (
    value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/webp' ||
    value === 'image/heic' ||
    value === 'image/heif'
  );
}

export function isOutputMime(value: unknown): value is MediaOutputMimeType {
  return value === 'image/jpeg' || value === 'image/png';
}

export function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/u.test(value);
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function baseKeys(...extra: string[]): string[] {
  return [
    'operation',
    'sessionId',
    'sessionEpoch',
    'expectedPromptRevision',
    'submissionId',
    ...extra,
  ];
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return (
    Object.keys(value).every((key) => expected.has(key)) &&
    expected.size === Object.keys(value).length
  );
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
