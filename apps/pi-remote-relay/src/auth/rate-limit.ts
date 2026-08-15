// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Fixed-Window Rate Limiter
// ───────────────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
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
