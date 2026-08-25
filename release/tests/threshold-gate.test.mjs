// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Threshold Evaluator Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { evaluateThresholds, REQUIRED_METRICS } from '../threshold-gate.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function config(overrides = {}) {
  return {
    schemaVersion: 1,
    metrics: Object.fromEntries(
      REQUIRED_METRICS.map((metric) => [
        metric,
        {
          comparison: 'max',
          threshold: 10,
          unit: 'test',
          source: 'operator',
          ...overrides[metric],
        },
      ]),
    ),
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('release threshold gate', () => {
  it('fails when a measured metric has no declared threshold', () => {
    const missing = config();
    delete missing.metrics.foregroundP95LatencyMs;
    const result = evaluateThresholds(missing, {
      foregroundP95LatencyMs: { value: 1 },
    });

    expect(result.machineStatus).toBe('FAIL');
    expect(result.failures).toContain("Missing required threshold 'foregroundP95LatencyMs'.");
    expect(result.failures).toContain(
      "Measured metric 'foregroundP95LatencyMs' has no declared threshold.",
    );
  });

  it('fails when a measurement violates its numeric threshold', () => {
    const result = evaluateThresholds(config(), {
      foregroundP95LatencyMs: { value: 11 },
    });

    expect(result.machineStatus).toBe('FAIL');
    expect(result.results.foregroundP95LatencyMs.status).toBe('FAIL');
  });

  it('keeps an unmeasured operator metric pending rather than inventing a value', () => {
    const result = evaluateThresholds(config(), {});

    expect(result.machineStatus).toBe('PASS');
    expect(result).not.toHaveProperty('status');
    expect(result.results.wcagConformanceLevel).toEqual({
      status: 'PENDING',
      reason: 'operator-measurement-missing',
    });
  });
});
