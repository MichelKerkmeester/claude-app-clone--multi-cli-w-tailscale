// ───────────────────────────────────────────────────────────────────
// MODULE: Connection Diagnostics Log Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendConnectionEvent,
  clearConnectionLog,
  CONNECTION_LOG_LIMIT,
  copyConnectionDiagnostics,
  getConnectionDiagnostics,
  readConnectionLog,
  type ConnectionLogEventInput,
} from '../src/shared/transport/connection-log.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  clearConnectionLog();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('connection diagnostics log', () => {
  it('keeps the newest events when the bounded ceiling is exceeded', () => {
    for (let index = 0; index < CONNECTION_LOG_LIMIT + 2; index += 1) {
      appendConnectionEvent({
        at: new Date(2026, 0, 1, 0, 0, index).toISOString(),
        kind: 'diagnostic',
        status: 'succeeded',
        code: 'connectivity',
      });
    }

    const events = readConnectionLog();
    expect(events).toHaveLength(CONNECTION_LOG_LIMIT);
    expect(events[0]?.at).toBe(new Date(2026, 0, 1, 0, 0, 2).toISOString());
    expect(events.at(-1)?.at).toBe(
      new Date(2026, 0, 1, 0, 0, CONNECTION_LOG_LIMIT + 1).toISOString(),
    );
  });

  it('reloads from device storage without losing the bounded events', async () => {
    appendConnectionEvent({
      at: '2026-01-01T00:00:00.000Z',
      kind: 'connection',
      status: 'failed',
      code: 'offline',
    });

    vi.resetModules();
    const reloaded = await import('../src/shared/transport/connection-log.js');

    expect(reloaded.readConnectionLog()).toEqual([
      {
        at: '2026-01-01T00:00:00.000Z',
        kind: 'connection',
        status: 'failed',
        code: 'offline',
      },
    ]);
  });

  it('copies a structured allowlisted blob without credential fields', async () => {
    const event = {
      at: '2026-01-01T00:00:00.000Z',
      kind: 'diagnostic',
      status: 'succeeded',
      code: 'connectivity',
      token: 'token_secret',
      pairingCode: 'pairing_secret',
      authorization: 'Bearer secret',
      headers: { authorization: 'Bearer secret' },
    } as unknown as ConnectionLogEventInput;
    appendConnectionEvent(event);

    const blobBeforeCopy = getConnectionDiagnostics();
    const parsed = JSON.parse(blobBeforeCopy) as {
      readonly schemaVersion: number;
      readonly capturedAt: string;
      readonly events: readonly Record<string, unknown>[];
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.capturedAt).toEqual(expect.any(String));
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]).toEqual({
      at: '2026-01-01T00:00:00.000Z',
      kind: 'diagnostic',
      status: 'succeeded',
      code: 'connectivity',
    });

    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    await expect(copyConnectionDiagnostics(writeText)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledOnce();
    const copiedBlob = String(writeText.mock.calls[0]?.[0]);
    const copied = JSON.parse(copiedBlob) as {
      readonly schemaVersion: number;
      readonly events: readonly Record<string, unknown>[];
    };
    expect(copied.schemaVersion).toBe(1);
    expect(copied.events).toEqual(parsed.events);
    expect(copiedBlob).not.toMatch(/token|pairing|authorization|headers|secret/iu);
  });
});
