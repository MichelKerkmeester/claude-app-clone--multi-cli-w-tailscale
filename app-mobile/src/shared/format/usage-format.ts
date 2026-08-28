// ───────────────────────────────────────────────────────────────────
// MODULE: Usage and Quota Formatting
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS AND TYPES
// ───────────────────────────────────────────────────────────────────

export type UsageDisplayMode = 'used' | 'remaining';
export const DEFAULT_USAGE_DISPLAY_MODE: UsageDisplayMode = 'used';

const USAGE_DISPLAY_MODE_KEY = 'pi-remote.usage-display-mode';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface ResetCountdownSchedulerOptions {
  readonly now?: () => number;
  readonly setTimeout?: (handler: () => void, delay: number) => unknown;
  readonly clearTimeout?: (handle: unknown) => void;
}

// ───────────────────────────────────────────────────────────────────
// 2. RESET COUNTDOWN
// ───────────────────────────────────────────────────────────────────

/** Format an accepted remaining interval using only units that have value. */
export function formatResetDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 'now';

  const totalMinutes = Math.floor(milliseconds / MINUTE_MS);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Prefix a duration for an account reset while keeping an absent reset inert. */
export function formatResetCountdown(milliseconds: number | null): string {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return '';
  const duration = formatResetDuration(milliseconds);
  return duration === 'now' ? 'Resets now' : `Resets in ${duration}`;
}

/** Format a host-supplied reset timestamp using an injected clock. */
export function formatUsageResetCountdown(resetsAt: number | null, now: number): string {
  if (resetsAt === null || !Number.isFinite(resetsAt) || !Number.isFinite(now)) return '';
  return formatResetCountdown(resetsAt - now);
}

/**
 * Find the next point where a reset label changes. Short windows use minute
 * labels; long windows use hour labels, so neither needs a per-second timer.
 */
export function getResetCountdownNextTickDelay(
  now: number,
  resetTimes: readonly number[],
): number | null {
  if (!Number.isFinite(now)) return null;

  let nextDelay: number | null = null;
  for (const resetAt of resetTimes) {
    if (!Number.isFinite(resetAt) || resetAt <= now) continue;

    const remainingMs = resetAt - now;
    const tickUnitMs = remainingMs >= DAY_MS ? HOUR_MS : MINUTE_MS;
    const delayMs = (remainingMs % tickUnitMs) + 1;
    nextDelay = nextDelay === null ? delayMs : Math.min(nextDelay, delayMs);
  }
  return nextDelay;
}

/** Schedule one boundary wakeup and reschedule after each delivered tick. */
export function scheduleResetCountdownTick(
  resetTimes: readonly number[],
  onTick: () => void,
  options: ResetCountdownSchedulerOptions = {},
): () => void {
  const now = options.now ?? Date.now;
  const setTimer = options.setTimeout ?? ((handler, delay) => setTimeout(handler, delay));
  const clearTimer = options.clearTimeout ?? ((handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  });
  let stopped = false;
  let timerHandle: unknown;

  const schedule = (): void => {
    if (stopped) return;
    const delay = getResetCountdownNextTickDelay(now(), resetTimes);
    if (delay === null) return;
    timerHandle = setTimer(() => {
      if (stopped) return;
      onTick();
      schedule();
    }, delay);
  };

  schedule();
  return () => {
    stopped = true;
    if (timerHandle !== undefined) clearTimer(timerHandle);
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. DISPLAY PREFERENCE AND QUANTITY LABELS
// ───────────────────────────────────────────────────────────────────

/** Accept only display modes that describe the same host-supplied quantity. */
export function parseUsageDisplayMode(value: unknown): UsageDisplayMode {
  return value === 'used' || value === 'remaining' ? value : DEFAULT_USAGE_DISPLAY_MODE;
}

/** Read the display wording from device storage; storage failures use the default. */
export function readUsageDisplayMode(): UsageDisplayMode {
  if (typeof window === 'undefined') return DEFAULT_USAGE_DISPLAY_MODE;
  try {
    return parseUsageDisplayMode(window.localStorage.getItem(USAGE_DISPLAY_MODE_KEY));
  } catch {
    return DEFAULT_USAGE_DISPLAY_MODE;
  }
}

/** Persist wording on this device only; a storage failure does not affect the view. */
export function writeUsageDisplayMode(mode: UsageDisplayMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USAGE_DISPLAY_MODE_KEY, mode);
  } catch {
    // The in-memory choice still applies when persistent storage is unavailable.
  }
}

/** Toggle wording without changing the quota value or its severity color. */
export function toggleUsageDisplayMode(mode: UsageDisplayMode): UsageDisplayMode {
  return mode === 'used' ? 'remaining' : 'used';
}

/** Render the used or remaining portion of the same accepted percentage. */
export function percentText(usedPercent: number, mode: UsageDisplayMode): string {
  return mode === 'used'
    ? `${Math.round(usedPercent)}% used`
    : `${Math.round(100 - usedPercent)}% left`;
}

/** Return the bare number that corresponds to the selected wording. */
export function percentNumber(usedPercent: number, mode: UsageDisplayMode): number {
  return Math.round(mode === 'used' ? usedPercent : 100 - usedPercent);
}

/** Keep a bar's fill quantity aligned with the number beside it. */
export function barFillPercent(usedPercent: number, mode: UsageDisplayMode): number {
  return mode === 'used' ? usedPercent : 100 - usedPercent;
}

// ───────────────────────────────────────────────────────────────────
// 4. USAGE SEVERITY COLORS
// ───────────────────────────────────────────────────────────────────

/**
 * Quota colors use remaining percentage. The context-percent meter in
 * `card-projection.ts` uses used percentage and its own thresholds; the two
 * functions must stay separate because the same number has opposite meanings.
 */
export function barColor(leftPercent: number): string | null {
  if (!Number.isFinite(leftPercent) || leftPercent < 0 || leftPercent > 100) return null;
  if (leftPercent > 40) return '#30d158';
  if (leftPercent >= 20) return '#ffd60a';
  return '#ff453a';
}

/** Map a host-provided severity token; absent or unknown severity stays unresolved. */
export function severityColor(severity: string | null | undefined): string | null {
  switch (severity) {
    case 'normal':
      return '#30d158';
    case 'warning':
      return '#ffd60a';
    case 'critical':
    case 'exceeded':
      return '#ff453a';
    default:
      return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. HOST-GATED USAGE PROJECTION
// ───────────────────────────────────────────────────────────────────

export const USAGE_STALE_AFTER_MS = 30 * MINUTE_MS;
export const USAGE_RATE_LIMIT_GRACE_MS = DAY_MS;

export type UsagePollState = 'loading' | 'success' | 'failed' | 'rate-limited' | 'unavailable';

export interface UsageReading {
  readonly usedPercent: number;
  readonly resetsAt: number | null;
  readonly observedAt: number;
  readonly severity?: string | null;
}

export interface UsageWindow {
  readonly id: string;
  readonly label: string;
  readonly isActive?: boolean;
  readonly primary?: boolean;
  readonly poll: UsagePollState;
  readonly current: UsageReading | null;
  readonly lastGood: UsageReading | null;
  readonly rateLimitedAt: number | null;
}

export interface AccountUsagePayload {
  readonly windows: readonly UsageWindow[];
}

export type UsageReadingState = 'fresh' | 'stale' | 'unknown';
export type UsageWindowViewState = 'loading' | 'unavailable' | 'shown';
export type UsageUnavailableReason = 'no-data' | 'expired' | 'rate-limit-expired';

export interface UsageWindowProjection {
  readonly state: UsageWindowViewState;
  readonly reading: UsageReading | null;
  readonly stale: boolean;
  readonly unavailableReason: UsageUnavailableReason | null;
}

function validUsageReading(reading: UsageReading | null | undefined): reading is UsageReading {
  return (
    reading !== null &&
    reading !== undefined &&
    Number.isFinite(reading.usedPercent) &&
    reading.usedPercent >= 0 &&
    reading.usedPercent <= 100 &&
    Number.isFinite(reading.observedAt) &&
    (reading.resetsAt === null || Number.isFinite(reading.resetsAt))
  );
}

/** Decay an accepted reading without guessing what an absent host value means. */
export function getUsageReadingState(
  reading: UsageReading | null | undefined,
  now: number,
  rateLimitedAt: number | null = null,
): UsageReadingState {
  if (!validUsageReading(reading) || !Number.isFinite(now)) return 'unknown';

  if (rateLimitedAt !== null) {
    if (!Number.isFinite(rateLimitedAt) || now - rateLimitedAt > USAGE_RATE_LIMIT_GRACE_MS) {
      return 'unknown';
    }
    return 'stale';
  }

  return now - reading.observedAt > USAGE_STALE_AFTER_MS ? 'unknown' : 'fresh';
}

/** Keep the last good value visible after a failed or throttled poll, then fail closed. */
export function projectUsageWindow(window: UsageWindow, now: number): UsageWindowProjection {
  if (window.poll === 'loading') {
    return { state: 'loading', reading: null, stale: false, unavailableReason: null };
  }

  if (window.poll === 'unavailable') {
    return { state: 'unavailable', reading: null, stale: false, unavailableReason: 'no-data' };
  }

  if (window.poll === 'success') {
    const state = getUsageReadingState(window.current, now);
    if (state === 'unknown') {
      return { state: 'unavailable', reading: null, stale: false, unavailableReason: 'expired' };
    }
    return { state: 'shown', reading: window.current, stale: false, unavailableReason: null };
  }

  if (window.poll !== 'failed' && window.poll !== 'rate-limited') {
    return { state: 'unavailable', reading: null, stale: false, unavailableReason: 'no-data' };
  }

  const lastGoodState = getUsageReadingState(
    window.lastGood,
    now,
    window.poll === 'rate-limited' ? window.rateLimitedAt : null,
  );
  if (lastGoodState === 'unknown') {
    return {
      state: 'unavailable',
      reading: null,
      stale: false,
      unavailableReason: window.poll === 'rate-limited' ? 'rate-limit-expired' : 'expired',
    };
  }

  return { state: 'shown', reading: window.lastGood, stale: true, unavailableReason: null };
}

/** Return the one host-marked gating window; ambiguous or absent markers stay inert. */
export function selectGatingWindow(
  windows: readonly UsageWindow[],
): UsageWindow | null {
  const flagged = windows.filter((window) => window.isActive === true || window.primary === true);
  return flagged.length === 1 ? (flagged[0] ?? null) : null;
}

/** Gate the usage surface on a host-provided gating marker instead of a client-side guess. */
export function hasUsageCapability(
  payload: AccountUsagePayload | null | undefined,
): payload is AccountUsagePayload {
  return (
    payload !== null &&
    payload !== undefined &&
    Array.isArray(payload.windows) &&
    selectGatingWindow(payload.windows) !== null
  );
}
