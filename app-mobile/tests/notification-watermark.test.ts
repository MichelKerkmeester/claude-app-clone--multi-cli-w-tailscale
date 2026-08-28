// ───────────────────────────────────────────────────────────────────
// MODULE: Notification Catch-up Watermark Tests
// ───────────────────────────────────────────────────────────────────

// These fixtures stand in for the future event stream and catch-up RPC. They
// prove the client advances only from complete, same-epoch contiguous data.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  createNotificationWatermarkStore,
  reconcileNotificationCatchUp,
  type NotificationCatchUp,
  type NotificationWatermark,
  type NotificationWatermarkStorage,
} from '../src/shared/state/notification-watermark.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function watermark(overrides: Partial<NotificationWatermark> = {}): NotificationWatermark {
  return { seq: 10, epoch: 'epoch-a', ...overrides };
}

function catchUp(overrides: Partial<NotificationCatchUp> = {}): NotificationCatchUp {
  return {
    epoch: 'epoch-a',
    events: [
      { seq: 11, epoch: 'epoch-a' },
      { seq: 12, epoch: 'epoch-a' },
    ],
    complete: true,
    ...overrides,
  };
}

function writerFor(writes: NotificationWatermark[]) {
  return {
    write(next: NotificationWatermark): boolean {
      writes.push(next);
      return true;
    },
  };
}

function memoryStorage(): NotificationWatermarkStorage & { writes: string[] } {
  let value: string | null = null;
  const writes: string[] = [];
  return {
    writes,
    getItem: () => value,
    setItem: (_key, next) => {
      writes.push(next);
      value = next;
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('notification catch-up watermark', () => {
  it('advances a complete contiguous catch-up and writes one next watermark', () => {
    const writes: NotificationWatermark[] = [];

    const result = reconcileNotificationCatchUp(watermark(), catchUp(), writerFor(writes));

    expect(result).toEqual({ status: 'advanced', watermark: { seq: 12, epoch: 'epoch-a' } });
    expect(writes).toEqual([{ seq: 12, epoch: 'epoch-a' }]);
  });

  it('quarantines a lower sequence from a new epoch instead of skipping the gap', () => {
    const writes: NotificationWatermark[] = [];
    const result = reconcileNotificationCatchUp(
      watermark({ seq: 40, epoch: 'old-epoch' }),
      catchUp({
        epoch: 'new-epoch',
        events: [{ seq: 1, epoch: 'new-epoch' }],
      }),
      writerFor(writes),
    );

    expect(result).toEqual({
      status: 'quarantined',
      watermark: { seq: 40, epoch: 'old-epoch' },
      reason: 'epoch-mismatch',
    });
    expect(writes).toEqual([]);
  });

  it('quarantines a partial catch-up without advancing the watermark', () => {
    const writes: NotificationWatermark[] = [];
    const result = reconcileNotificationCatchUp(
      watermark(),
      catchUp({ complete: false, events: [{ seq: 11, epoch: 'epoch-a' }] }),
      writerFor(writes),
    );

    expect(result).toEqual({
      status: 'quarantined',
      watermark: { seq: 10, epoch: 'epoch-a' },
      reason: 'incomplete',
    });
    expect(writes).toEqual([]);
  });

  it('quarantines a sequence gap even when the response claims completion', () => {
    const writes: NotificationWatermark[] = [];
    const result = reconcileNotificationCatchUp(
      watermark(),
      catchUp({ events: [{ seq: 12, epoch: 'epoch-a' }] }),
      writerFor(writes),
    );

    expect(result).toEqual({
      status: 'quarantined',
      watermark: { seq: 10, epoch: 'epoch-a' },
      reason: 'sequence-gap',
    });
    expect(writes).toEqual([]);
  });

  it('writes seq and epoch as one readable storage value, never as a torn pair', () => {
    const storage = memoryStorage();
    const store = createNotificationWatermarkStore(storage);

    expect(store.write({ seq: 24, epoch: 'epoch-b' })).toBe(true);
    expect(storage.writes).toHaveLength(1);
    expect(storage.writes[0]).toBe('{"seq":24,"epoch":"epoch-b"}');
    expect(store.read()).toEqual({ seq: 24, epoch: 'epoch-b' });
  });

  it('produces no advancement when the catch-up capability is absent', () => {
    const writes: NotificationWatermark[] = [];

    const result = reconcileNotificationCatchUp(watermark(), undefined, writerFor(writes));

    expect(result).toEqual({
      status: 'quarantined',
      watermark: { seq: 10, epoch: 'epoch-a' },
      reason: 'missing-catch-up',
    });
    expect(writes).toEqual([]);
  });
});
