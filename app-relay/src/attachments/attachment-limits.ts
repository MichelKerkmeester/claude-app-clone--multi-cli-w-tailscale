// ───────────────────────────────────────────────────────────────────
// MODULE: Relay Attachment Limits
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { DEFAULT_MEDIA_POLICY } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const MAX_ATTACHMENTS_PER_SET = DEFAULT_MEDIA_POLICY.maxImagesPerTurn;
export const MAX_SOURCE_BYTES_PER_IMAGE = DEFAULT_MEDIA_POLICY.maxSourceBytesPerImage;
export const MAX_SOURCE_BYTES_PER_BATCH = DEFAULT_MEDIA_POLICY.maxSourceBytesPerBatch;
export const MAX_DECODED_AREA = DEFAULT_MEDIA_POLICY.maxDecodedMegapixels * 1_000_000;
export const MAX_SOURCE_EDGE = DEFAULT_MEDIA_POLICY.maxSourceEdgePixels;
export const MAX_NORMALIZED_EDGE = DEFAULT_MEDIA_POLICY.maxNormalizedEdgePixels;
export const MAX_NORMALIZED_BYTES_PER_IMAGE = DEFAULT_MEDIA_POLICY.maxNormalizedBytesPerImage;
export const MAX_NORMALIZED_BYTES_PER_SET = DEFAULT_MEDIA_POLICY.maxNormalizedBytesPerTurn;
export const MAX_PARALLEL_UPLOADS = DEFAULT_MEDIA_POLICY.maxParallelUploads;
export const UNCOMMITTED_TTL_MS = DEFAULT_MEDIA_POLICY.uncommittedTtlSeconds * 1_000;
export const UPLOAD_TICKET_TTL_MS = DEFAULT_MEDIA_POLICY.uploadTicketTtlSeconds * 1_000;
export const UPLOAD_BODY_DEADLINE_MS = DEFAULT_MEDIA_POLICY.uploadBodyDeadlineSeconds * 1_000;
export const ATTACHMENT_RATE_LIMIT_COUNT = DEFAULT_MEDIA_POLICY.maxAttachmentsPerWindow;
export const ATTACHMENT_RATE_LIMIT_WINDOW_MS =
  DEFAULT_MEDIA_POLICY.attachmentRateWindowSeconds * 1_000;
export const ATTACHMENT_RATE_LIMIT_BYTES = DEFAULT_MEDIA_POLICY.maxBytesPerWindow;
export const ATTACHMENT_BYTE_RATE_WINDOW_MS = DEFAULT_MEDIA_POLICY.byteRateWindowSeconds * 1_000;
export const MAX_QUARANTINE_BYTES_PER_DEVICE = DEFAULT_MEDIA_POLICY.maxQuarantineBytesPerDevice;
export const MAX_QUARANTINE_BYTES_RELAY_WIDE = DEFAULT_MEDIA_POLICY.maxQuarantineBytesRelayWide;
export const IMAGE_DECODE_TIMEOUT_MS = 5_000;
export const IMAGE_BATCH_TIMEOUT_MS = 15_000;

export const ATTACHMENT_SOURCE_MIME_TYPES = DEFAULT_MEDIA_POLICY.sourceMimeTypes;
export const ATTACHMENT_OUTPUT_MIME_TYPES = DEFAULT_MEDIA_POLICY.outputMimeTypes;

export const SIZE_LOG_BUCKETS = [
  0,
  64 * 1024,
  256 * 1024,
  1 * 1024 * 1024,
  4 * 1024 * 1024,
  15 * 1024 * 1024,
] as const;

export const LATENCY_LOG_BUCKETS_MS = [
  100,
  500,
  1_000,
  5_000,
  15_000,
  Number.POSITIVE_INFINITY,
] as const;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type AttachmentSizeBucket = 'empty' | 'tiny' | 'small' | 'medium' | 'large' | 'maximum';
export type AttachmentLatencyBucket = 'fast' | 'short' | 'medium' | 'long' | 'batch' | 'timeout';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function sizeBucket(bytes: number): AttachmentSizeBucket {
  if (bytes <= SIZE_LOG_BUCKETS[0]) return 'empty';
  if (bytes <= SIZE_LOG_BUCKETS[1]) return 'tiny';
  if (bytes <= SIZE_LOG_BUCKETS[2]) return 'small';
  if (bytes <= SIZE_LOG_BUCKETS[3]) return 'medium';
  if (bytes <= SIZE_LOG_BUCKETS[4]) return 'large';
  return 'maximum';
}

export function latencyBucket(milliseconds: number): AttachmentLatencyBucket {
  if (milliseconds < LATENCY_LOG_BUCKETS_MS[0]) return 'fast';
  if (milliseconds < LATENCY_LOG_BUCKETS_MS[1]) return 'short';
  if (milliseconds < LATENCY_LOG_BUCKETS_MS[2]) return 'medium';
  if (milliseconds < LATENCY_LOG_BUCKETS_MS[3]) return 'long';
  if (milliseconds < LATENCY_LOG_BUCKETS_MS[4]) return 'batch';
  return 'timeout';
}
