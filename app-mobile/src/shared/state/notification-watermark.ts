// ───────────────────────────────────────────────────────────────────
// MODULE: Notification Catch-up Watermark
// ───────────────────────────────────────────────────────────────────

// The watermark is device-local progress. It is advanced only by a complete,
// contiguous stream from the same epoch, so a host restart cannot make an old
// sequence number skip unseen events.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface NotificationWatermark {
  readonly seq: number;
  readonly epoch: string;
}

export interface NotificationCatchUpEvent {
  readonly seq: number;
  readonly epoch: string;
}

export interface NotificationCatchUp {
  readonly epoch: string;
  readonly events: readonly NotificationCatchUpEvent[];
  readonly complete: boolean;
}

export interface NotificationWatermarkStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

export interface NotificationWatermarkStore {
  readonly read: () => NotificationWatermark | null;
  readonly write: (watermark: NotificationWatermark) => boolean;
}

export type NotificationCatchUpQuarantineReason =
  | 'missing-watermark'
  | 'missing-catch-up'
  | 'malformed-catch-up'
  | 'epoch-mismatch'
  | 'incomplete'
  | 'sequence-gap';

export type NotificationCatchUpResult =
  | {
      readonly status: 'advanced';
      readonly watermark: NotificationWatermark;
    }
  | {
      readonly status: 'unchanged';
      readonly watermark: NotificationWatermark;
    }
  | {
      readonly status: 'quarantined';
      readonly watermark: NotificationWatermark | null;
      readonly reason: NotificationCatchUpQuarantineReason;
    }
  | {
      readonly status: 'write-failed';
      readonly watermark: NotificationWatermark;
    };

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const NOTIFICATION_WATERMARK_STORAGE_KEY = 'pi-remote.notification-watermark';

// ───────────────────────────────────────────────────────────────────
// 3. VALIDATION AND STORAGE
// ───────────────────────────────────────────────────────────────────

function isEpoch(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSequence(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isWatermark(value: unknown): value is NotificationWatermark {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isSequence(candidate.seq) && isEpoch(candidate.epoch);
}

function isCatchUpEvent(value: unknown): value is NotificationCatchUpEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isSequence(candidate.seq) && isEpoch(candidate.epoch);
}

function isCatchUp(value: unknown): value is NotificationCatchUp {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isEpoch(candidate.epoch) &&
    candidate.complete !== undefined &&
    typeof candidate.complete === 'boolean' &&
    Array.isArray(candidate.events) &&
    candidate.events.every(isCatchUpEvent)
  );
}

function browserStorage(): NotificationWatermarkStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read one complete device-local watermark; malformed storage fails closed. */
export function readNotificationWatermark(
  storage?: NotificationWatermarkStorage | null,
): NotificationWatermark | null {
  const source = storage === undefined ? browserStorage() : storage;
  if (source === null) return null;

  try {
    const raw = source.getItem(NOTIFICATION_WATERMARK_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWatermark(parsed) ? { seq: parsed.seq, epoch: parsed.epoch } : null;
  } catch {
    return null;
  }
}

/** Write both watermark fields in one storage value, never as separate keys. */
export function writeNotificationWatermark(
  watermark: NotificationWatermark,
  storage?: NotificationWatermarkStorage | null,
): boolean {
  const source = storage === undefined ? browserStorage() : storage;
  if (source === null || !isWatermark(watermark)) return false;

  try {
    source.setItem(
      NOTIFICATION_WATERMARK_STORAGE_KEY,
      JSON.stringify({ seq: watermark.seq, epoch: watermark.epoch }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Bind the pure watermark decisions to the browser's optional local store. */
export function createNotificationWatermarkStore(
  storage?: NotificationWatermarkStorage | null,
): NotificationWatermarkStore {
  const source = storage === undefined ? browserStorage() : storage;
  return {
    read: () => readNotificationWatermark(source),
    write: (watermark) => writeNotificationWatermark(watermark, source),
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. CATCH-UP DECISION
// ───────────────────────────────────────────────────────────────────

function quarantined(
  watermark: NotificationWatermark | null,
  reason: NotificationCatchUpQuarantineReason,
): NotificationCatchUpResult {
  return { status: 'quarantined', watermark, reason };
}

/**
 * Apply a catch-up only when its epoch and every sequence step are safe.
 * `store.write` is called once for a successful batch, after all validation.
 */
export function reconcileNotificationCatchUp(
  current: NotificationWatermark | null,
  catchUp: NotificationCatchUp | null | undefined,
  store: Pick<NotificationWatermarkStore, 'write'>,
): NotificationCatchUpResult {
  if (current === null || !isWatermark(current)) {
    return quarantined(null, 'missing-watermark');
  }
  if (catchUp === undefined || catchUp === null) {
    return quarantined(current, 'missing-catch-up');
  }
  if (!isCatchUp(catchUp)) return quarantined(current, 'malformed-catch-up');
  if (catchUp.epoch !== current.epoch) return quarantined(current, 'epoch-mismatch');
  if (!catchUp.complete) return quarantined(current, 'incomplete');

  let nextSeq = current.seq;
  for (const event of catchUp.events) {
    if (event.epoch !== current.epoch || event.seq !== nextSeq + 1) {
      return quarantined(current, 'sequence-gap');
    }
    nextSeq = event.seq;
  }

  if (nextSeq === current.seq) return { status: 'unchanged', watermark: current };

  const next = { seq: nextSeq, epoch: current.epoch };
  if (!store.write(next)) return { status: 'write-failed', watermark: current };
  return { status: 'advanced', watermark: next };
}
