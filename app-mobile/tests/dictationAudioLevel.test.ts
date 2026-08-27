// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Audio Level Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  rmsToBarHeight,
  DEFAULT_GAIN,
  IDLE_AMPLITUDE_THRESHOLD,
  IDLE_BAR_HEIGHT,
  POLL_INTERVAL_MS,
  POLL_FREQUENCY_HZ,
} from '../src/shared/chrome/dictation-audio-level.js';

// ───────────────────────────────────────────────────────────────────
// 1. CANONICAL DIFFERENTIAL TEST
// ───────────────────────────────────────────────────────────────────

describe('rmsToBarHeight', () => {
  // The canonical implementation reference.
  function canonicalRmsToBarHeight(rawAmplitude: number, gain = DEFAULT_GAIN): number {
    if (rawAmplitude <= 0) return IDLE_BAR_HEIGHT;
    if (rawAmplitude < IDLE_AMPLITUDE_THRESHOLD) return IDLE_BAR_HEIGHT;
    const scaled = Math.sqrt(rawAmplitude) * gain;
    return Math.min(1, Math.max(0, scaled));
  }

  it('matches the canonical implementation over a range of inputs', () => {
    const inputs = [
      0,
      0.001,
      0.005,
      IDLE_AMPLITUDE_THRESHOLD / 2,
      IDLE_AMPLITUDE_THRESHOLD,
      IDLE_AMPLITUDE_THRESHOLD * 1.5,
      0.05,
      0.1,
      0.25,
      0.5,
      0.75,
      1.0,
    ];
    for (const input of inputs) {
      expect(rmsToBarHeight(input)).toBeCloseTo(canonicalRmsToBarHeight(input), 10);
    }
  });

  it('returns the idle bar height for zero or negative amplitude', () => {
    expect(rmsToBarHeight(0)).toBe(IDLE_BAR_HEIGHT);
    expect(rmsToBarHeight(-1)).toBe(IDLE_BAR_HEIGHT);
    expect(rmsToBarHeight(-0.5)).toBe(IDLE_BAR_HEIGHT);
  });

  it('returns the idle bar height for sub-threshold amplitudes', () => {
    const subThreshold = IDLE_AMPLITUDE_THRESHOLD / 2;
    expect(rmsToBarHeight(subThreshold)).toBe(IDLE_BAR_HEIGHT);
  });

  it('applies sqrt perceptual curve and gain clamping', () => {
    // At 0.25, sqrt(0.25) = 0.5, * 1.8 = 0.9
    expect(rmsToBarHeight(0.25)).toBeCloseTo(0.9, 5);
    // At 1.0, sqrt(1.0) = 1.0, * 1.8 = 1.8 → clamped to 1.0
    expect(rmsToBarHeight(1.0)).toBe(1.0);
  });

  it('accepts a custom gain multiplier', () => {
    // At 0.25, sqrt(0.25) = 0.5, * 1.0 = 0.5
    expect(rmsToBarHeight(0.25, 1.0)).toBeCloseTo(0.5, 5);
    // At 0.25, sqrt(0.25) = 0.5, * 3.0 = 1.5 → clamped to 1.0
    expect(rmsToBarHeight(0.25, 3.0)).toBe(1.0);
  });

  it('never returns a value below 0 or above 1', () => {
    for (let i = 0; i < 100; i++) {
      const input = Math.random();
      const result = rmsToBarHeight(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });
});

describe('poll constants', () => {
  it('POLL_FREQUENCY_HZ is 20', () => {
    expect(POLL_FREQUENCY_HZ).toBe(20);
  });

  it('POLL_INTERVAL_MS is derived from frequency', () => {
    expect(POLL_INTERVAL_MS).toBe(50);
  });

  it('IDLE_AMPLITUDE_THRESHOLD is small', () => {
    expect(IDLE_AMPLITUDE_THRESHOLD).toBeLessThan(0.02);
  });

  it('IDLE_BAR_HEIGHT is non-zero and small', () => {
    expect(IDLE_BAR_HEIGHT).toBeGreaterThan(0);
    expect(IDLE_BAR_HEIGHT).toBeLessThan(0.1);
  });
});