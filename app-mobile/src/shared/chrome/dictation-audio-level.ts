// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Audio Level Scaler
// ───────────────────────────────────────────────────────────────────
// Maps raw RMS amplitude from an AnalyserNode to a 0–1 equalizer-bar
// height. The curve applies sqrt (perceptual loudness), a linear gain
// multiplier, and an idle floor so silent input resolves to a minimal
// non-zero bar (never dead-empty while the engine is live).

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Default gain multiplier applied to the sqrt-scaled amplitude. */
export const DEFAULT_GAIN = 1.8;

/** Floor below which the equalizer bar snaps to the idle value. */
export const IDLE_AMPLITUDE_THRESHOLD = 0.012;

/**
 * The idle bar height (0–1) when the RMS amplitude is below threshold.
 * A small non-zero value keeps the bar visible while the engine is idle.
 */
export const IDLE_BAR_HEIGHT = 0.04;

/** The target poll interval in Hz (~20 Hz = 50 ms). */
export const POLL_FREQUENCY_HZ = 20;

/** The target poll interval in milliseconds. */
export const POLL_INTERVAL_MS = 1000 / POLL_FREQUENCY_HZ;

// ───────────────────────────────────────────────────────────────────
// 2. SCALER
// ───────────────────────────────────────────────────────────────────

/**
 * Convert a raw RMS amplitude (0–1 from AnalyserNode) to a 0–1
 * equalizer-bar height.
 *
 * The curve:
 *   1. sqrt for perceptual loudness (linear feels too quiet).
 *   2. Multiply by gain, clamp to [0, 1].
 *   3. Apply idle floor: if the raw amplitude is below the threshold,
 *      return the idle bar height instead of the computed value.
 */
export function rmsToBarHeight(
  rawAmplitude: number,
  gain: number = DEFAULT_GAIN,
): number {
  if (rawAmplitude <= 0) return IDLE_BAR_HEIGHT;
  if (rawAmplitude < IDLE_AMPLITUDE_THRESHOLD) return IDLE_BAR_HEIGHT;
  const scaled = Math.sqrt(rawAmplitude) * gain;
  return Math.min(1, Math.max(0, scaled));
}