// ───────────────────────────────────────────────────────────────────
// MODULE: Ticketed Attachment Submission Client
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  DEFAULT_MEDIA_POLICY,
  type AttachmentManifestItem,
  type AttachmentSetManifest,
  type MediaSourceMimeType,
} from '@pi-remote/pi-rpc-protocol';

import {
  AttachmentTransportError,
  cancelAttachmentSet,
  fetchAttachmentStatus,
  reserveAttachmentSet,
  submitPromptWithAttachmentRefs,
  uploadAttachmentPart,
  type AttachmentReservationResponse,
  type AttachmentReserveBinding,
  type AttachmentStatusResponse,
} from '$shared/transport/relay.js';
import type { AttachmentDraftItem } from './attachment-state.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const MAX_PARALLEL_UPLOADS = 2;
const SHA256_LENGTH = 43;

// ───────────────────────────────────────────────────────────────────
// 3. CLIENT ERROR AND SUBMISSION TYPES
// ───────────────────────────────────────────────────────────────────

export type AttachmentClientErrorCode = 'retryable' | 'stale' | 'expired' | 'canceled' | 'unknown';

export class AttachmentClientError extends Error {
  public constructor(
    readonly code: AttachmentClientErrorCode,
    message = attachmentErrorMessage(code),
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AttachmentClientError';
  }
}

export interface AttachmentTransferSource {
  readonly item: AttachmentDraftItem;
  readonly file: Blob | null;
  readonly declaredType?: MediaSourceMimeType;
}

export interface PreparedAttachmentTransfer {
  readonly item: AttachmentDraftItem;
  readonly declaredType: MediaSourceMimeType;
  readonly bytes: Blob;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface AttachmentSubmissionInputs {
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly expectedPromptRevision: number;
  readonly submissionId: string;
  readonly message: string;
  readonly sources: readonly AttachmentTransferSource[];
  readonly streamingBehavior?: 'steer' | 'followUp';
}

export interface AttachmentSubmissionReservation {
  readonly manifest: AttachmentSetManifest;
  readonly binding: AttachmentReserveBinding;
  readonly reservation: AttachmentReservationResponse;
}

export interface AttachmentProgressUpdate {
  readonly clientId: string;
  readonly loaded: number;
  readonly total: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. TRANSFER PREPARATION
// ───────────────────────────────────────────────────────────────────

export function createAttachmentSubmissionId(): string {
  return `attachment_submission_${crypto.randomUUID().replaceAll('-', '_')}`;
}

/** Read local bytes only after explicit Send and produce exact transfer blobs. */
export async function prepareAttachmentTransfers(
  sources: readonly AttachmentTransferSource[],
  signal?: AbortSignal,
): Promise<readonly PreparedAttachmentTransfer[]> {
  if (sources.length === 0 || sources.length > DEFAULT_MEDIA_POLICY.maxImagesPerTurn) {
    throw new AttachmentClientError('stale', 'The selected photos are no longer valid.');
  }
  const prepared: PreparedAttachmentTransfer[] = [];
  try {
    for (const source of sources) {
      throwIfAborted(signal);
      if (source.file === null) {
        throw new AttachmentClientError(
          'retryable',
          'This photo is no longer available. Choose it again before sending.',
        );
      }
      const original = source.file;
      const declaredType = source.declaredType ?? mediaTypeFromBlob(original);
      if (declaredType === null) {
        throw new AttachmentClientError('retryable', 'This photo format is not supported.');
      }
      const transfer = isHeicType(declaredType)
        ? await convertHeicToJpeg(original, signal)
        : original;
      const transferType = isHeicType(declaredType)
        ? 'image/jpeg'
        : mediaTypeFromBlob(transfer, declaredType);
      if (transferType === null || !isSourceMimeType(transferType) || isHeicType(transferType)) {
        throw new AttachmentClientError('retryable', 'This photo format is not supported.');
      }
      if (transfer.size <= 0 || transfer.size > DEFAULT_MEDIA_POLICY.maxSourceBytesPerImage) {
        throw new AttachmentClientError(
          'retryable',
          'This photo is larger than the allowed limit.',
        );
      }
      const sha256 = await hashExactBlobInWorker(transfer, signal);
      prepared.push({
        item: source.item,
        declaredType: transferType,
        bytes: transfer,
        sha256,
        byteLength: transfer.size,
      });
    }
    const total = prepared.reduce((sum, item) => sum + item.byteLength, 0);
    if (total > DEFAULT_MEDIA_POLICY.maxSourceBytesPerBatch) {
      throw new AttachmentClientError('retryable', 'The selected photos exceed the batch limit.');
    }
    return prepared;
  } catch (error: unknown) {
    if (error instanceof AttachmentClientError) throw error;
    if (isAbortError(error)) throw new AttachmentClientError('canceled', undefined, error);
    throw new AttachmentClientError('retryable', undefined, error);
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. ATTACHMENT RESERVATION
// ───────────────────────────────────────────────────────────────────

export async function createAttachmentReservation(
  input: AttachmentSubmissionInputs,
  transfers: readonly PreparedAttachmentTransfer[],
  signal?: AbortSignal,
): Promise<AttachmentSubmissionReservation> {
  if (
    transfers.length === 0 ||
    transfers.length !== input.sources.length ||
    transfers.length > DEFAULT_MEDIA_POLICY.maxImagesPerTurn
  ) {
    throw new AttachmentClientError('stale', 'The selected photos are no longer valid.');
  }
  const items: readonly AttachmentManifestItem[] = transfers.map((transfer, index) => ({
    clientId: input.sources[index]?.item.id ?? transfer.item.id,
    ordinal: index + 1,
    declaredType: transfer.declaredType,
    byteLength: transfer.byteLength,
    sha256: transfer.sha256,
  }));
  const manifest: AttachmentSetManifest = {
    submissionId: input.submissionId,
    sessionId: input.sessionId,
    sessionEpoch: input.sessionEpoch,
    expectedPromptRevision: input.expectedPromptRevision,
    items,
  };
  const binding: AttachmentReserveBinding = {
    operation: 'reserve',
    sessionId: input.sessionId,
    sessionEpoch: input.sessionEpoch,
    expectedPromptRevision: input.expectedPromptRevision,
    submissionId: input.submissionId,
  };
  try {
    const reservation = await reserveAttachmentSet(manifest, binding, signal);
    if (
      reservation.attachmentSetId.length === 0 ||
      reservation.revision !== input.expectedPromptRevision ||
      reservation.parts.length !== transfers.length ||
      reservation.parts.some((part, index) => part.ordinal !== index + 1)
    ) {
      throw new AttachmentClientError(
        'stale',
        'The relay returned a stale attachment reservation.',
      );
    }
    return { manifest, binding, reservation };
  } catch (error: unknown) {
    throw classifyAttachmentError(error, 'authorizing');
  }
}

// ───────────────────────────────────────────────────────────────────
// 6. PARALLEL PART UPLOAD
// ───────────────────────────────────────────────────────────────────

/** Upload at most two parts at once, with progress emitted only by XHR events. */
export async function uploadPreparedAttachments(
  reservation: AttachmentSubmissionReservation,
  transfers: readonly PreparedAttachmentTransfer[],
  onProgress: (update: AttachmentProgressUpdate) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (reservation.reservation.parts.length !== transfers.length) {
    throw new AttachmentClientError('stale', 'The relay reservation no longer matches the draft.');
  }
  let nextIndex = 0;
  const uploadOne = async (): Promise<void> => {
    while (nextIndex < transfers.length) {
      throwIfAborted(signal);
      const index = nextIndex;
      nextIndex += 1;
      const transfer = transfers[index];
      const part = reservation.reservation.parts[index];
      if (transfer === undefined || part === undefined || part.ordinal !== index + 1) {
        throw new AttachmentClientError('stale', 'The relay reservation order changed.');
      }
      try {
        await uploadAttachmentPart(
          part,
          transfer.bytes,
          transfer.sha256,
          (loaded, total) => onProgress({ clientId: transfer.item.id, loaded, total }),
          signal,
        );
      } catch (error: unknown) {
        throw classifyAttachmentError(error, 'uploading');
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, transfers.length) }, () => uploadOne()),
  );
}

// ───────────────────────────────────────────────────────────────────
// 7. STATUS CHECK, CANCELLATION, AND COMMIT
// ───────────────────────────────────────────────────────────────────

export async function reconcileAttachmentSet(
  reservation: AttachmentSubmissionReservation,
  signal?: AbortSignal,
): Promise<AttachmentStatusResponse> {
  try {
    const status = await fetchAttachmentStatus(
      reservation.reservation.attachmentSetId,
      reservation.reservation.statusTicket,
      signal,
    );
    if (
      status.revision !== reservation.manifest.expectedPromptRevision ||
      status.parts.length !== reservation.manifest.items.length ||
      !statusPartsMatchReservation(status, reservation)
    ) {
      throw new AttachmentClientError('stale', 'The relay status no longer matches the draft.');
    }
    return status;
  } catch (error: unknown) {
    throw classifyAttachmentError(error, 'server-checking');
  }
}

export async function cancelAttachmentReservation(
  reservation: AttachmentSubmissionReservation,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await cancelAttachmentSet(
      reservation.reservation.attachmentSetId,
      reservation.reservation.cancelTicket,
      signal,
    );
  } catch {
    // Cancellation is best effort after the local generation has been invalidated.
    // The relay TTL and lifecycle reaper remain the authoritative cleanup path.
  }
}

export async function commitAttachmentSubmission(
  input: AttachmentSubmissionInputs,
  reservation: AttachmentSubmissionReservation,
  status: AttachmentStatusResponse,
  signal?: AbortSignal,
): Promise<void> {
  if (
    status.attachmentSetId !== reservation.reservation.attachmentSetId ||
    status.revision !== reservation.manifest.expectedPromptRevision ||
    status.status !== 'ready' ||
    status.parts.some((part) => part.status !== 'ready') ||
    status.parts.length !== reservation.reservation.parts.length ||
    !statusPartsMatchReservation(status, reservation)
  ) {
    throw new AttachmentClientError('retryable', 'The relay is still checking these photos.');
  }
  try {
    await submitPromptWithAttachmentRefs(
      input.sessionId,
      input.submissionId,
      input.message,
      input.expectedPromptRevision,
      reservation.reservation.attachmentSetId,
      reservation.reservation.parts.map((part) => part.attachmentId),
      input.streamingBehavior,
      signal,
    );
  } catch (error: unknown) {
    throw classifyAttachmentError(error, 'committing');
  }
}

// ───────────────────────────────────────────────────────────────────
// 8. STATUS MATCHING AND ERROR CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

function statusPartsMatchReservation(
  status: AttachmentStatusResponse,
  reservation: AttachmentSubmissionReservation,
): boolean {
  return (
    status.attachmentSetId === reservation.reservation.attachmentSetId &&
    status.parts.length === reservation.reservation.parts.length &&
    status.parts.every((part, index) => {
      const expected = reservation.reservation.parts[index];
      return (
        expected !== undefined &&
        part.attachmentSetId === expected.attachmentSetId &&
        part.attachmentId === expected.attachmentId &&
        part.partId === expected.partId &&
        part.ordinal === expected.ordinal
      );
    })
  );
}

export function classifyAttachmentError(
  error: unknown,
  phase: 'authorizing' | 'uploading' | 'server-checking' | 'committing',
): AttachmentClientError {
  if (error instanceof AttachmentClientError) return error;
  if (error instanceof AttachmentTransportError) {
    return new AttachmentClientError(
      error.code === 'canceled' ? 'canceled' : 'retryable',
      undefined,
      error,
    );
  }
  if (isAbortError(error)) return new AttachmentClientError('canceled', undefined, error);
  if (isRecordWithServerCode(error) && error.serverCode === 'pi_rejected') {
    return new AttachmentClientError('retryable', undefined, error);
  }
  if (isRecordWithServerCode(error) && error.serverCode === 'delivery_unknown') {
    return new AttachmentClientError('unknown', undefined, error);
  }
  if (isRecordWithStatus(error)) {
    if (error.status === 409 || error.status === 422) {
      return new AttachmentClientError('stale', undefined, error);
    }
    if (error.status === 410) return new AttachmentClientError('expired', undefined, error);
    if (error.status === 401 || error.status === 403) {
      return new AttachmentClientError('stale', undefined, error);
    }
    if (error.status >= 500 && phase === 'committing') {
      return new AttachmentClientError('unknown', undefined, error);
    }
  }
  return new AttachmentClientError(
    phase === 'committing' ? 'unknown' : 'retryable',
    undefined,
    error,
  );
}

// ───────────────────────────────────────────────────────────────────
// 9. HEIC TO JPEG CONVERSION
// ───────────────────────────────────────────────────────────────────

export async function convertHeicToJpeg(blob: Blob, signal?: AbortSignal): Promise<Blob> {
  throwIfAborted(signal);
  const bitmapFactory = globalThis.createImageBitmap;
  if (typeof bitmapFactory === 'function') {
    try {
      const bitmap = await bitmapFactory(blob);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (context === null) throw new Error('Canvas is unavailable.');
        context.drawImage(bitmap, 0, 0);
        return await canvasToJpeg(canvas, signal);
      } finally {
        bitmap.close();
      }
    } catch (error: unknown) {
      if (isAbortError(error)) throw error;
    }
  }
  return decodeHeicWithImageElement(blob, signal);
}

async function decodeHeicWithImageElement(blob: Blob, signal?: AbortSignal): Promise<Blob> {
  const createObjectUrl = URL.createObjectURL;
  if (typeof createObjectUrl !== 'function') {
    throw new AttachmentClientError('retryable', 'This photo cannot be decoded in this browser.');
  }
  const objectUrl = createObjectUrl(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('HEIC decode failed.'));
      image.src = objectUrl;
      if (signal !== undefined) {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      }
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (context === null || canvas.width <= 0 || canvas.height <= 0) {
      throw new Error('HEIC decode produced no pixels.');
    }
    context.drawImage(image, 0, 0);
    return await canvasToJpeg(canvas, signal);
  } catch (error: unknown) {
    if (isAbortError(error)) throw new AttachmentClientError('canceled', undefined, error);
    throw new AttachmentClientError(
      'retryable',
      'This photo cannot be decoded in this browser. Choose it again before sending.',
      error,
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<Blob> {
  throwIfAborted(signal);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null || blob.size === 0) {
          reject(
            new AttachmentClientError('retryable', 'This photo cannot be decoded in this browser.'),
          );
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

// ───────────────────────────────────────────────────────────────────
// 10. WORKER HASHING AND UTILITIES
// ───────────────────────────────────────────────────────────────────

async function hashExactBlobInWorker(blob: Blob, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  if (typeof Worker === 'undefined') {
    throw new AttachmentClientError('retryable', 'Photo hashing is unavailable in this browser.');
  }
  const bytes = await blob.arrayBuffer();
  const byteLength = bytes.byteLength;
  throwIfAborted(signal);
  const requestId = `hash_${crypto.randomUUID().replaceAll('-', '_')}`;
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL('./attachment-hash.worker.ts', import.meta.url), {
      type: 'module',
    });
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      callback();
    };
    const abort = (): void => finish(() => reject(new AttachmentClientError('canceled')));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const value = event.data as Partial<{
        requestId: string;
        byteLength: number;
        sha256: string;
        error: string;
      }>;
      if (value.requestId !== requestId) return;
      if (
        value.error !== undefined ||
        value.byteLength !== byteLength ||
        typeof value.sha256 !== 'string' ||
        value.sha256.length !== SHA256_LENGTH ||
        !/^[A-Za-z0-9_-]{43}$/u.test(value.sha256)
      ) {
        finish(() => reject(new AttachmentClientError('retryable', 'Photo hashing failed.')));
        return;
      }
      const sha256 = value.sha256;
      finish(() => resolve(sha256));
    };
    worker.onerror = () =>
      finish(() => reject(new AttachmentClientError('retryable', 'Photo hashing failed.')));
    signal?.addEventListener('abort', abort, { once: true });
    try {
      worker.postMessage({ requestId, bytes }, [bytes]);
    } catch (error: unknown) {
      finish(() => reject(new AttachmentClientError('retryable', 'Photo hashing failed.', error)));
    }
  });
}

function mediaTypeFromBlob(blob: Blob, fallback?: MediaSourceMimeType): MediaSourceMimeType | null {
  const type = blob.type.toLowerCase();
  if (isSourceMimeType(type)) return type;
  if (fallback !== undefined && isSourceMimeType(fallback)) return fallback;
  return null;
}

function isSourceMimeType(value: unknown): value is MediaSourceMimeType {
  return (
    value === 'image/jpeg' || value === 'image/png' || value === 'image/webp' || isHeicType(value)
  );
}

function isHeicType(value: unknown): value is 'image/heic' | 'image/heif' {
  return value === 'image/heic' || value === 'image/heif';
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw new AttachmentClientError('canceled');
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

function isRecordWithStatus(value: unknown): value is { readonly status: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { readonly status?: unknown }).status === 'number'
  );
}

function isRecordWithServerCode(value: unknown): value is { readonly serverCode: string | null } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'serverCode' in value &&
    (value as { readonly serverCode?: unknown }).serverCode !== undefined
  );
}

function attachmentErrorMessage(code: AttachmentClientErrorCode): string {
  switch (code) {
    case 'stale':
      return 'The session changed before these photos could be sent. Select Send again.';
    case 'expired':
      return 'The photo reservation expired. Select Send again.';
    case 'canceled':
      return 'Photo sending was canceled.';
    case 'unknown':
      return 'Photo delivery could not be confirmed. Do not resend automatically.';
    default:
      return 'Photos were not sent. Check the connection and try Send again.';
  }
}
