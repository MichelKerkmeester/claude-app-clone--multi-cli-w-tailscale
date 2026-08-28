// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Recency Stack Tests
// ───────────────────────────────────────────────────────────────────

// The tests drive the pure stack transitions and the host reconciliation seam
// directly so a missing local-history feature cannot make a test pass trivially.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import {
  normalizeRecencyStack,
  readRecencyStack,
  removeFromRecencyStack,
  removeOtherRecencyStack,
  visitRecencyStack,
  writeRecencyStack,
} from '../src/shared/state/recency-stack.js';
import { reconcileRecencyStack } from '../src/shared/state/reconcile-seams.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function card(id: string): Pick<SessionCardDto, 'id'> {
  return { id };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.localStorage.clear();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('recency stack transitions', () => {
  it('puts the session just left first and keeps the MRU order stable', () => {
    const afterFirstLeave = visitRecencyStack(['older', 'middle'], 'newest');
    const afterReturning = visitRecencyStack(afterFirstLeave, 'middle');

    expect(afterFirstLeave).toEqual(['newest', 'older', 'middle']);
    expect(afterReturning).toEqual(['middle', 'newest', 'older']);
  });

  it('deduplicates malformed local history before transitions', () => {
    expect(normalizeRecencyStack(['a', 'a', '', 4, 'b'])).toEqual(['a', 'b']);
    expect(removeFromRecencyStack(['a', 'b', 'a'], 'a')).toEqual(['b']);
    expect(removeOtherRecencyStack(['new', 'old'], 'new')).toEqual(['new']);
  });

  it('round-trips the client-only history through local storage', () => {
    writeRecencyStack(['newest', 'older']);

    expect(readRecencyStack()).toEqual(['newest', 'older']);
  });

  it('fails closed when persisted history is not a string list', () => {
    window.localStorage.setItem('pi-remote.session-recency', '{"ids":["old"]}');

    expect(readRecencyStack()).toEqual([]);
  });
});

describe('recency host reconciliation', () => {
  it('drops a locally remembered id that the current host roster no longer lists', () => {
    const localHistory = ['dropped-by-host', 'still-live'];
    const currentHostRoster = [card('still-live'), card('currently-open')];

    expect(reconcileRecencyStack(localHistory, currentHostRoster)).toEqual(['still-live']);
  });

  it('preserves newest-first order and removes duplicate host-listed ids', () => {
    expect(
      reconcileRecencyStack(
        ['newest', 'older', 'newest'],
        [card('older'), card('newest')],
      ),
    ).toEqual(['newest', 'older']);
  });
});
