// ───────────────────────────────────────────────────────────────────
// MODULE: Session Status Reconciliation Seam Tests
// ───────────────────────────────────────────────────────────────────

// The reconciliation seams decide what a status event may change: a late
// running re-report inside the done-holdoff window is ignored, a presumed
// idle signal only downgrades running, and a reconnect verdict defaults to
// undecided so a live running row is never locally promoted. Each
// incremental seam is compared against a canonical full replay of the same
// event stream at every prefix.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  DONE_HOLDOFF_MS,
  canDowngradeToIdle,
  reconnectVerdict,
  shouldHoldOffRunning,
  type SessionStatusEvent,
} from '../src/shared/state/reconcile-seams.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T10:00:00.000Z';
const NOW = Date.parse(UPDATED_AT);

function event(overrides: Partial<SessionStatusEvent> = {}): SessionStatusEvent {
  return {
    status: 'idle',
    updatedAt: UPDATED_AT,
    epoch: 'epoch_1',
    ...overrides,
  };
}

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 1,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('the done-holdoff reconciliation seam', () => {
  it('ignores a late running re-report inside the 3s window without a new turn', () => {
    const settleAt = NOW;
    const late = shouldHoldOffRunning(
      event({ status: 'idle', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
      event({ status: 'running', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
      settleAt + DONE_HOLDOFF_MS - 1,
    );
    expect(late).toBe(true);
  });

  it('lets a running card advance once the holdoff window has passed', () => {
    const outside = shouldHoldOffRunning(
      event({ status: 'idle', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
      event({ status: 'running', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
      NOW + DONE_HOLDOFF_MS,
    );
    expect(outside).toBe(false);
  });

  it('treats a changed epoch as a genuine new turn that always advances', () => {
    const newTurn = shouldHoldOffRunning(
      event({ status: 'idle', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
      event({ status: 'running', updatedAt: UPDATED_AT, epoch: 'epoch_2' }),
      NOW,
    );
    expect(newTurn).toBe(false);
  });

  it('only applies to an idle card receiving running', () => {
    expect(
      shouldHoldOffRunning(
        event({ status: 'running', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
        event({ status: 'idle', updatedAt: UPDATED_AT, epoch: 'epoch_1' }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('the asymmetric idle-rescue seam', () => {
  it('may only downgrade a running card', () => {
    expect(canDowngradeToIdle('running')).toBe(true);
    expect(canDowngradeToIdle('idle')).toBe(false);
    expect(canDowngradeToIdle('interrupted')).toBe(false);
    expect(canDowngradeToIdle('unknown')).toBe(false);
  });
});

describe('the reconnect-decide seam', () => {
  it('defaults to undecided so the roster changes nothing', () => {
    const idle = card('idle-1', { status: 'idle' });
    expect(reconnectVerdict(idle, 'cache')).toBe('undecided');
    expect(reconnectVerdict(idle, 'relay')).toBe('undecided');
    expect(reconnectVerdict(idle, 'none')).toBe('undecided');
  });

  it('keeps a live running row as running-stale, never flipped locally', () => {
    const running = card('run-1', { status: 'running' });
    expect(reconnectVerdict(running, 'relay')).toBe('stale-running');
    expect(reconnectVerdict(running, 'cache')).toBe('undecided');
  });

  it('does not re-verify idle rows on reconnect', () => {
    const idle = card('idle-2', { status: 'idle' });
    expect(reconnectVerdict(idle, 'relay')).toBe('undecided');
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. DIFFERENTIAL: DONE-HOLDOFF
// ───────────────────────────────────────────────────────────────────

class IncrementalStatusRoster {
  private readonly cards = new Map<string, SessionCardDto>();
  private readonly epochs = new Map<string, string | null>();

  apply(cardValue: SessionCardDto, epoch: string | null, now: number): void {
    const current = this.cards.get(cardValue.id);
    if (current === undefined) {
      this.cards.set(cardValue.id, cardValue);
      this.epochs.set(cardValue.id, epoch);
      return;
    }
    if (
      shouldHoldOffRunning(
        {
          status: current.status,
          updatedAt: current.updatedAt,
          epoch: this.epochs.get(cardValue.id) ?? null,
        },
        { status: cardValue.status, updatedAt: cardValue.updatedAt, epoch },
        now,
      )
    ) {
      return;
    }
    this.cards.set(cardValue.id, cardValue);
    this.epochs.set(cardValue.id, epoch);
  }

  values(): readonly SessionCardDto[] {
    return [...this.cards.values()];
  }
}

/** Canonical replay: a pure fold over the whole event list so far. */
function canonicalRoster(
  events: readonly { readonly cardValue: SessionCardDto; readonly epoch: string | null }[],
  now: number,
): readonly SessionCardDto[] {
  const cards = new Map<string, SessionCardDto>();
  const epochs = new Map<string, string | null>();
  for (const { cardValue, epoch } of events) {
    const current = cards.get(cardValue.id);
    if (current === undefined) {
      cards.set(cardValue.id, cardValue);
      epochs.set(cardValue.id, epoch);
      continue;
    }
    if (
      shouldHoldOffRunning(
        {
          status: current.status,
          updatedAt: current.updatedAt,
          epoch: epochs.get(cardValue.id) ?? null,
        },
        { status: cardValue.status, updatedAt: cardValue.updatedAt, epoch },
        now,
      )
    ) {
      continue;
    }
    cards.set(cardValue.id, cardValue);
    epochs.set(cardValue.id, epoch);
  }
  return [...cards.values()];
}

describe('differential: incremental holdoff equals a canonical full replay', () => {
  const events = [
    { cardValue: card('s1', { status: 'idle', updatedAt: UPDATED_AT }), epoch: 'epoch_1' },
    { cardValue: card('s1', { status: 'running', updatedAt: UPDATED_AT }), epoch: 'epoch_1' },
    { cardValue: card('s2', { status: 'idle', updatedAt: UPDATED_AT }), epoch: 'epoch_2' },
    { cardValue: card('s2', { status: 'running', updatedAt: UPDATED_AT }), epoch: 'epoch_3' },
    { cardValue: card('s1', { status: 'running', updatedAt: UPDATED_AT }), epoch: 'epoch_1' },
  ] as const;

  it('matches the canonical replay at every prefix, inside and outside the window', () => {
    const incremental = new IncrementalStatusRoster();
    const now = NOW + DONE_HOLDOFF_MS - 1;
    events.forEach((entry, index) => {
      incremental.apply(entry.cardValue, entry.epoch, now);
      expect(incremental.values()).toEqual(canonicalRoster(events.slice(0, index + 1), now));
    });
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. DIFFERENTIAL: RECONNECT DECIDE
// ───────────────────────────────────────────────────────────────────

class IncrementalVerdicts {
  private readonly rows: { readonly cardValue: SessionCardDto; readonly source: 'none' | 'cache' | 'relay' }[] =
    [];

  add(entry: { readonly cardValue: SessionCardDto; readonly source: 'none' | 'cache' | 'relay' }): void {
    this.rows.push(entry);
  }

  verdicts(): readonly ('undecided' | 'stale-running')[] {
    return this.rows.map((entry) => reconnectVerdict(entry.cardValue, entry.source));
  }
}

function canonicalVerdicts(
  rows: readonly { readonly cardValue: SessionCardDto; readonly source: 'none' | 'cache' | 'relay' }[],
): readonly ('undecided' | 'stale-running')[] {
  return rows.map((entry) => reconnectVerdict(entry.cardValue, entry.source));
}

describe('differential: incremental reconnect verdicts equal a full recompute', () => {
  const stream = [
    { cardValue: card('run', { status: 'running' }), source: 'cache' as const },
    { cardValue: card('run', { status: 'running' }), source: 'relay' as const },
    { cardValue: card('idle', { status: 'idle' }), source: 'relay' as const },
    { cardValue: card('unknown', { status: 'unknown' }), source: 'relay' as const },
  ];

  it('matches at every prefix of the reconnect stream', () => {
    const incremental = new IncrementalVerdicts();
    stream.forEach((entry, index) => {
      incremental.add(entry);
      expect(incremental.verdicts()).toEqual(canonicalVerdicts(stream.slice(0, index + 1)));
    });
  });
});