// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Fixed-Window Rate Limiter
// ───────────────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

interface ByteBucket {
  bytes: number;
  resetAt: number;
}

export const ARTIFACT_READ_WINDOW_MS = 5 * 60_000;
export const ARTIFACT_THUMBNAIL_READ_LIMIT = 60;
export const ARTIFACT_FULL_READ_LIMIT = 30;
export const ARTIFACT_THUMBNAIL_CONCURRENCY_LIMIT = 2;
export const ARTIFACT_FULL_CONCURRENCY_LIMIT = 1;
export const ARTIFACT_READ_CONCURRENCY_RETRY_AFTER_SECONDS = 1;

export type ArtifactReadVariant = 'thumbnail' | 'full';

export interface ArtifactReadAdmission {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimitAdmission {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

interface ArtifactReadActive {
  thumbnail: number;
  full: number;
}

/** Bound repeated ingress attempts without retaining request payloads. */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();

  public constructor(
    private readonly maximum: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  public consume(key: string): RateLimitAdmission {
    const now = this.now();
    const bucket = this.buckets.get(key);
    if (bucket === undefined || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (bucket.count >= this.maximum) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(bucket.resetAt, now),
      };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Bound authenticated inbound artifact reads by device/session and variant. */
export class ArtifactReadRateLimiter {
  private readonly countBuckets = new Map<string, RateBucket>();
  private readonly activeReads = new Map<string, ArtifactReadActive>();

  public constructor(private readonly now: () => number = Date.now) {}

  public tryAcquire(
    deviceId: string,
    sessionId: string,
    variant: ArtifactReadVariant,
  ): ArtifactReadAdmission {
    const now = this.now();
    const key = `${deviceId}\u0000${sessionId}\u0000${variant}`;
    const existing = this.countBuckets.get(key);
    const bucket =
      existing === undefined || existing.resetAt <= now
        ? { count: 0, resetAt: now + ARTIFACT_READ_WINDOW_MS }
        : existing;
    const maximum =
      variant === 'thumbnail' ? ARTIFACT_THUMBNAIL_READ_LIMIT : ARTIFACT_FULL_READ_LIMIT;
    if (bucket.count >= maximum) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(bucket.resetAt, now),
      };
    }

    const active = this.activeReads.get(key) ?? { thumbnail: 0, full: 0 };
    const concurrencyLimit =
      variant === 'thumbnail'
        ? ARTIFACT_THUMBNAIL_CONCURRENCY_LIMIT
        : ARTIFACT_FULL_CONCURRENCY_LIMIT;
    if (active[variant] >= concurrencyLimit) {
      return {
        allowed: false,
        retryAfterSeconds: ARTIFACT_READ_CONCURRENCY_RETRY_AFTER_SECONDS,
      };
    }

    this.countBuckets.set(key, { count: bucket.count + 1, resetAt: bucket.resetAt });
    this.activeReads.set(key, { ...active, [variant]: active[variant] + 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  public release(deviceId: string, sessionId: string, variant: ArtifactReadVariant): void {
    const key = `${deviceId}\u0000${sessionId}\u0000${variant}`;
    const active = this.activeReads.get(key);
    if (active === undefined) return;
    const nextCount = Math.max(0, active[variant] - 1);
    const next = { ...active, [variant]: nextCount };
    if (next.thumbnail === 0 && next.full === 0) {
      this.activeReads.delete(key);
      return;
    }
    this.activeReads.set(key, next);
  }
}

/** Atomically bound attachment count and source-byte admission per device. */
export class AttachmentRateLimiter {
  private readonly countBuckets = new Map<string, RateBucket>();
  private readonly byteBuckets = new Map<string, ByteBucket>();

  public constructor(
    private readonly maximumCount: number,
    private readonly countWindowMs: number,
    private readonly maximumBytes: number,
    private readonly byteWindowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  public consume(deviceId: string, count: number, bytes: number): boolean {
    if (
      !Number.isSafeInteger(count) ||
      count <= 0 ||
      !Number.isSafeInteger(bytes) ||
      bytes <= 0 ||
      count > this.maximumCount ||
      bytes > this.maximumBytes
    ) {
      return false;
    }
    const now = this.now();
    const countBucket = this.countBuckets.get(deviceId);
    const currentCount =
      countBucket === undefined || countBucket.resetAt <= now ? 0 : countBucket.count;
    const byteBucket = this.byteBuckets.get(deviceId);
    const currentBytes =
      byteBucket === undefined || byteBucket.resetAt <= now ? 0 : byteBucket.bytes;
    if (currentCount + count > this.maximumCount || currentBytes + bytes > this.maximumBytes) {
      return false;
    }
    this.countBuckets.set(deviceId, {
      count: currentCount + count,
      resetAt:
        countBucket === undefined || countBucket.resetAt <= now
          ? now + this.countWindowMs
          : countBucket.resetAt,
    });
    this.byteBuckets.set(deviceId, {
      bytes: currentBytes + bytes,
      resetAt:
        byteBucket === undefined || byteBucket.resetAt <= now
          ? now + this.byteWindowMs
          : byteBucket.resetAt,
    });
    return true;
  }
}

function retryAfterSeconds(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil(Math.max(0, resetAt - now) / 1_000));
}
