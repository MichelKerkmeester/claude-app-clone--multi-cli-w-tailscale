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

/** Bound repeated ingress attempts without retaining request payloads. */
export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();

  public constructor(
    private readonly maximum: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  public consume(key: string): boolean {
    const now = this.now();
    const bucket = this.buckets.get(key);
    if (bucket === undefined || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.maximum) return false;
    bucket.count += 1;
    return true;
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
