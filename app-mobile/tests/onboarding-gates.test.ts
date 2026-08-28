// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Onboarding Gate Tests
// ───────────────────────────────────────────────────────────────────

// These tests exercise the pure gate transitions without involving the host,
// so a skipped screen cannot hide behind a transport guard.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearOnboardingDecisions,
  getNextOnboardingGate,
  isOnboardingGateSkipped,
  onboardingFlowIsComplete,
  persistOnboardingDecision,
  readOnboardingGateState,
  setOnboardingDecision,
  type OnboardingGate,
} from '../src/shared/state/onboarding-gates.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function gate(
  id: string,
  title: string,
  options = [{ value: 'continue', label: 'Continue' }],
): OnboardingGate {
  return { id, title, description: `${title} description`, options };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  clearOnboardingDecisions();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('device-local onboarding gates', () => {
  it('skips a gate whose decision is already made and advances to the next action', () => {
    const made = gate('made', 'Already selected');
    const next = gate('next', 'Still needs a choice');

    expect(isOnboardingGateSkipped({ ...made, decision: 'existing' }, {})).toBe(true);
    expect(getNextOnboardingGate([made, next], { made: 'existing' })).toEqual(next);
  });

  it('skips a no-op gate instead of returning a screen with no forward action', () => {
    const denied = { ...gate('denied', 'Notifications'), noOp: true };
    const next = gate('next', 'Pairing guidance');

    expect(isOnboardingGateSkipped(denied, {})).toBe(true);
    expect(getNextOnboardingGate([denied, next], {})).toEqual(next);
  });

  it('reaches terminal state from an empty or exhausted entry point', () => {
    const noOptions = gate('empty', 'Unavailable choice', []);
    const alreadyMade = gate('made', 'Existing choice');

    expect(getNextOnboardingGate([noOptions], {})).toBeNull();
    expect(onboardingFlowIsComplete([noOptions, alreadyMade], { made: 'existing' }, 'empty')).toBe(
      true,
    );
    expect(onboardingFlowIsComplete([], {}, 'missing-entry')).toBe(true);
  });

  it('persists only local decisions and reloads them for the next wizard instance', () => {
    const next = setOnboardingDecision({}, 'pairing-guidance', 'guided');

    expect(persistOnboardingDecision('pairing-guidance', next['pairing-guidance']!)).toBe(true);
    expect(readOnboardingGateState()).toEqual({
      available: true,
      decisions: { 'pairing-guidance': 'guided' },
    });
  });
});
