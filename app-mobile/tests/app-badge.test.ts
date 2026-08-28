// ───────────────────────────────────────────────────────────────────
// MODULE: PWA App Badge Tests
// ───────────────────────────────────────────────────────────────────

// Badge operations are optional browser capabilities. These tests prove that
// supported calls receive the intended value, unsupported calls stay silent,
// and platform rejections never escape the adapter.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { updateAppBadge } from '../src/shared/state/app-badge.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

type BadgeMethod = (...args: unknown[]) => Promise<void>;

const originalSetAppBadge = Object.getOwnPropertyDescriptor(navigator, 'setAppBadge');
const originalClearAppBadge = Object.getOwnPropertyDescriptor(navigator, 'clearAppBadge');

function installBadgeMethods(
  setAppBadge: BadgeMethod | undefined,
  clearAppBadge: BadgeMethod | undefined,
): void {
  Object.defineProperty(navigator, 'setAppBadge', {
    configurable: true,
    value: setAppBadge,
  });
  Object.defineProperty(navigator, 'clearAppBadge', {
    configurable: true,
    value: clearAppBadge,
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  if (originalSetAppBadge === undefined) delete (navigator as { setAppBadge?: unknown }).setAppBadge;
  else Object.defineProperty(navigator, 'setAppBadge', originalSetAppBadge);
  if (originalClearAppBadge === undefined) {
    delete (navigator as { clearAppBadge?: unknown }).clearAppBadge;
  } else Object.defineProperty(navigator, 'clearAppBadge', originalClearAppBadge);
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('PWA app badge adapter', () => {
  it('sets the badge to a positive attention count', () => {
    const setAppBadge = vi.fn(async () => undefined);
    const clearAppBadge = vi.fn(async () => undefined);
    installBadgeMethods(setAppBadge, clearAppBadge);

    expect(() => updateAppBadge(3)).not.toThrow();
    expect(setAppBadge).toHaveBeenCalledWith(3);
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it('clears the badge when the attention count reaches zero', () => {
    const setAppBadge = vi.fn(async () => undefined);
    const clearAppBadge = vi.fn(async () => undefined);
    installBadgeMethods(setAppBadge, clearAppBadge);

    updateAppBadge(0);

    expect(clearAppBadge).toHaveBeenCalledOnce();
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it('does not throw or call anything when the Badging API is unavailable', () => {
    const clearAppBadge = vi.fn(async () => undefined);
    installBadgeMethods(undefined, clearAppBadge);

    expect(() => updateAppBadge(4)).not.toThrow();
    expect(clearAppBadge).not.toHaveBeenCalled();
  });

  it('swallows rejected badge operations', async () => {
    const setAppBadge = vi.fn(async () => {
      throw new Error('platform rejected badge');
    });
    const clearAppBadge = vi.fn(async () => {
      throw new Error('platform rejected clear');
    });
    installBadgeMethods(setAppBadge, clearAppBadge);

    expect(() => updateAppBadge(2)).not.toThrow();
    expect(() => updateAppBadge(0)).not.toThrow();
    await flushPromises();

    expect(setAppBadge).toHaveBeenCalledWith(2);
    expect(clearAppBadge).toHaveBeenCalledOnce();
  });

  it('does not call the browser with negative or non-finite counts', () => {
    const setAppBadge = vi.fn(async () => undefined);
    const clearAppBadge = vi.fn(async () => undefined);
    installBadgeMethods(setAppBadge, clearAppBadge);

    updateAppBadge(-1);
    updateAppBadge(Number.NaN);
    updateAppBadge(Number.POSITIVE_INFINITY);

    expect(setAppBadge).not.toHaveBeenCalled();
    expect(clearAppBadge).not.toHaveBeenCalled();
  });
});

describe('PWA app badge shell wiring', () => {
  // Both call sites live in the root layout, which brings up sockets, pollers and
  // navigation and is mounted by no suite here. These checks therefore prove the
  // wiring is PRESENT, not that it runs: deleting either call site fails them, but
  // one left in place and made unreachable would still pass. What the wiring feeds
  // — the count and the adapter — is covered behaviourally above. Matching is kept
  // whitespace-tolerant so reformatting the layout cannot fail them spuriously.
  const layoutSource = readFileSync('app-mobile/src/routes/+layout.svelte', 'utf8');

  it('computes the badge from the roster and the device-local unread set', () => {
    expect(layoutSource).toMatch(/countAttentionSessions\(\s*items\s*,\s*readUnreadIds\(\)\s*\)/u);
    expect(layoutSource).toMatch(/updateAppBadge\(\s*count\s*\)/u);
  });

  it('syncs the badge on roster replacement and on the existing visibility handler', () => {
    expect(layoutSource).toMatch(/app\.sessions\.items;\s*syncAppBadge\(\s*items\s*\);/u);
    expect(layoutSource).toMatch(/visibilityState === 'visible'\)\s*syncAppBadge\(\s*\);/u);
    expect(layoutSource).toMatch(/addEventListener\(\s*'visibilitychange',\s*onVisibility\s*\)/u);
  });
});
