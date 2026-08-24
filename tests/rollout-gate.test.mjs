// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Rollout Evaluator Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { evaluateRollout } from '../release/rollout-gate.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('staged rollout gate', () => {
  it('reports a stage as not ready when any evidence item is absent', () => {
    const result = evaluateRollout(
      {
        schemaVersion: 1,
        stages: [
          {
            id: 'read-only',
            label: 'Read only',
            killSwitch: 'stop ingress',
            requires: ['machine:whole-gate', 'operator:device'],
          },
        ],
      },
      {
        'machine:whole-gate': { status: 'PASS' },
      },
    );

    expect(result.machineStatus).toBe('PASS');
    expect(result).not.toHaveProperty('status');
    expect(result.stages[0]).toMatchObject({ status: 'NOT-READY', available: false });
    expect(result.stages[0].evidence).toContainEqual({
      id: 'operator:device',
      status: 'UNRUN',
    });
  });
});
