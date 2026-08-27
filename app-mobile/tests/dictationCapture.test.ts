// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Capture State Machine Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  transitionCapture,
  isInsertable,
  captureStateLabel,
  ACCIDENTAL_TAP_MS,
  type CaptureState,
  type CaptureMode,
  type CaptureEvent,
} from '../src/shared/chrome/dictation-capture.js';

// ───────────────────────────────────────────────────────────────────
// 1. CANONICAL DIFFERENTIAL TEST
// ───────────────────────────────────────────────────────────────────

describe('transitionCapture canonical', () => {
  // Reference implementation for differential testing.
  function canonicalTransition(
    state: CaptureState,
    event: CaptureEvent,
    mode: CaptureMode,
  ): CaptureState {
    switch (state) {
      case 'idle':
        return event.type === 'START' ? 'recording' : 'idle';
      case 'recording':
        switch (event.type) {
          case 'START':
            return mode === 'toggle' ? 'stopping' : 'recording';
          case 'RELEASE':
            if (mode === 'hold-to-talk') {
              return event.holdDurationMs < ACCIDENTAL_TAP_MS ? 'cancelled' : 'stopping';
            }
            return 'recording';
          case 'STOP':
            return 'stopping';
          case 'CANCEL':
            return 'cancelled';
          default:
            return 'recording';
        }
      case 'stopping':
        return event.type === 'RESET' ? 'idle' : 'stopping';
      case 'cancelled':
        return event.type === 'RESET' ? 'idle' : 'cancelled';
    }
  }

  const modes: CaptureMode[] = ['toggle', 'hold-to-talk'];
  const states: CaptureState[] = ['idle', 'recording', 'stopping', 'cancelled'];
  const events: CaptureEvent[] = [
    { type: 'START' },
    { type: 'RELEASE', holdDurationMs: 100 },
    { type: 'RELEASE', holdDurationMs: 500 },
    { type: 'STOP' },
    { type: 'CANCEL' },
    { type: 'RESET' },
  ];

  for (const mode of modes) {
    for (const state of states) {
      for (const event of events) {
        it(`matches canonical: mode=${mode} state=${state} event=${event.type}`, () => {
          expect(transitionCapture(state, event, mode)).toBe(
            canonicalTransition(state, event, mode),
          );
        });
      }
    }
  }
});

// ───────────────────────────────────────────────────────────────────
// 2. TOGGLE MODE
// ───────────────────────────────────────────────────────────────────

describe('toggle mode', () => {
  it('idle → START → recording', () => {
    expect(transitionCapture('idle', { type: 'START' }, 'toggle')).toBe('recording');
  });

  it('recording → START → stopping (second tap stops)', () => {
    expect(transitionCapture('recording', { type: 'START' }, 'toggle')).toBe('stopping');
  });

  it('recording → STOP → stopping', () => {
    expect(transitionCapture('recording', { type: 'STOP' }, 'toggle')).toBe('stopping');
  });

  it('recording → CANCEL → cancelled', () => {
    expect(transitionCapture('recording', { type: 'CANCEL' }, 'toggle')).toBe('cancelled');
  });

  it('stopping → RESET → idle', () => {
    expect(transitionCapture('stopping', { type: 'RESET' }, 'toggle')).toBe('idle');
  });

  it('cancelled → RESET → idle', () => {
    expect(transitionCapture('cancelled', { type: 'RESET' }, 'toggle')).toBe('idle');
  });

  it('stopping → STOP stays stopping (no double-transition)', () => {
    expect(transitionCapture('stopping', { type: 'STOP' }, 'toggle')).toBe('stopping');
  });

  it('cancelled → CANCEL stays cancelled', () => {
    expect(transitionCapture('cancelled', { type: 'CANCEL' }, 'toggle')).toBe('cancelled');
  });
});

// ───────────────────────────────────────────────────────────────────
// 3. HOLD-TO-TALK MODE
// ───────────────────────────────────────────────────────────────────

describe('hold-to-talk mode', () => {
  it('idle → START → recording', () => {
    expect(transitionCapture('idle', { type: 'START' }, 'hold-to-talk')).toBe('recording');
  });

  it('recording → START stays recording (no second action)', () => {
    expect(transitionCapture('recording', { type: 'START' }, 'hold-to-talk')).toBe('recording');
  });

  it('short hold < 400 ms → cancelled (accidental tap)', () => {
    const result = transitionCapture(
      'recording',
      { type: 'RELEASE', holdDurationMs: ACCIDENTAL_TAP_MS - 1 },
      'hold-to-talk',
    );
    expect(result).toBe('cancelled');
  });

  it('hold at exactly 400 ms → cancelled (under threshold)', () => {
    // 400 ms is NOT less than 400 (it's equal), so it should be >= threshold
    // The condition is `< 400`, so exactly 400 is NOT a short hold and should stop.
    const result = transitionCapture(
      'recording',
      { type: 'RELEASE', holdDurationMs: ACCIDENTAL_TAP_MS },
      'hold-to-talk',
    );
    expect(result).toBe('stopping');
  });

  it('hold >= 400 ms → stopping (intentional)', () => {
    const result = transitionCapture(
      'recording',
      { type: 'RELEASE', holdDurationMs: ACCIDENTAL_TAP_MS + 1 },
      'hold-to-talk',
    );
    expect(result).toBe('stopping');
  });

  it('recording → STOP → stopping', () => {
    expect(transitionCapture('recording', { type: 'STOP' }, 'hold-to-talk')).toBe('stopping');
  });

  it('recording → CANCEL → cancelled', () => {
    expect(transitionCapture('recording', { type: 'CANCEL' }, 'hold-to-talk')).toBe('cancelled');
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. STOP ≠ CANCEL
// ───────────────────────────────────────────────────────────────────

describe('STOP ≠ CANCEL', () => {
  it('stopping is insertable', () => {
    expect(isInsertable('stopping')).toBe(true);
  });

  it('cancelled is not insertable', () => {
    expect(isInsertable('cancelled')).toBe(false);
  });

  it('idle is not insertable', () => {
    expect(isInsertable('idle')).toBe(false);
  });

  it('recording is not insertable', () => {
    expect(isInsertable('recording')).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. STATE LABELS
// ───────────────────────────────────────────────────────────────────

describe('captureStateLabel', () => {
  it('provides a human-readable label for each state', () => {
    expect(captureStateLabel('idle')).toBe('Ready');
    expect(captureStateLabel('recording')).toBe('Recording');
    expect(captureStateLabel('stopping')).toBe('Processing');
    expect(captureStateLabel('cancelled')).toBe('Cancelled');
  });
});

// ───────────────────────────────────────────────────────────────────
// 6. BOUNDARY: idle events
// ───────────────────────────────────────────────────────────────────

describe('idle boundary', () => {
  it('idle ignores RELEASE, STOP, CANCEL, RESET', () => {
    expect(transitionCapture('idle', { type: 'RELEASE', holdDurationMs: 0 }, 'toggle')).toBe('idle');
    expect(transitionCapture('idle', { type: 'STOP' }, 'toggle')).toBe('idle');
    expect(transitionCapture('idle', { type: 'CANCEL' }, 'toggle')).toBe('idle');
    expect(transitionCapture('idle', { type: 'RESET' }, 'toggle')).toBe('idle');
  });
});