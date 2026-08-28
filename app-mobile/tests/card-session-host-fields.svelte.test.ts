// ───────────────────────────────────────────────────────────────────
// MODULE: Session Card Host-Field Tests
// ───────────────────────────────────────────────────────────────────

// These tests exercise optional host fields through the rendered card. Missing
// fields stay inert, while each present field changes only its own surface.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CardSession, { nextMinuteBoundaryDelay } from '../src/pages/home/card-session.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = Date.parse('2026-08-17T12:00:17.000Z');
const UPDATED_AT = '2026-08-17T12:00:00.000Z';

function card(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id: 'session_optional_fields',
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 3,
    ...overrides,
  };
}

function withHost<T extends Record<string, unknown>>(
  session: SessionCardDto,
  fields: T,
): SessionCardDto & T {
  return Object.assign({}, session, fields);
}

function renderCard(session: SessionCardDto) {
  return render(CardSession, {
    sessionId: session.id,
    selectSession: () => session,
    source: 'relay',
    unread: false,
    launchingId: null,
    openDisabled: false,
    onOpen: () => undefined,
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('optional session card host fields', () => {
  it('keeps the cache chip and count segments absent without host fields, then renders a supplied cache expiry', async () => {
    const base = card();
    const view = renderCard(base);

    expect(document.querySelector('[data-cache-countdown="true"]')).toBeNull();
    expect(document.querySelector('[data-token-count="true"]')).toBeNull();
    expect(document.querySelector('[data-tool-call-count="true"]')).toBeNull();
    expect(document.querySelector('time')).not.toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    const enriched = withHost(base, {
      cacheExpiresAt: new Date(NOW + 5 * 60_000).toISOString(),
    });
    await view.rerender({
      sessionId: enriched.id,
      selectSession: () => enriched,
      source: 'relay',
      unread: false,
      launchingId: null,
      openDisabled: false,
      onOpen: () => undefined,
    });

    expect(screen.getByText('05:00')).toHaveAttribute('data-cache-countdown', 'true');
  });

  it('schedules cache expiry at the next minute boundary instead of refreshing every second', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const expiry = withHost(card(), {
      cacheExpiresAt: new Date(NOW + 5 * 60_000).toISOString(),
    });
    renderCard(expiry);

    expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === nextMinuteBoundaryDelay(NOW))).toBe(
      true,
    );
    expect(nextMinuteBoundaryDelay(NOW)).toBe(43_000);
    expect(screen.getByText('05:00')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(42_999);
    expect(screen.getByText('05:00')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1);
    expect(screen.getByText('04:17')).toBeInTheDocument();
  });

  it('renders a token count without requiring a tool-call count', () => {
    const session = withHost(card(), { tokenCount: 120 });
    renderCard(session);

    expect(screen.getByText('120 tokens')).toHaveAttribute('data-token-count', 'true');
    expect(document.querySelector('[data-tool-call-count="true"]')).toBeNull();
    expect(document.querySelector('time')).not.toBeNull();
  });

  it('renders a tool-call count without requiring a token count', () => {
    const session = withHost(card(), { toolCallCount: 4 });
    renderCard(session);

    expect(screen.getByText('4 tool calls')).toHaveAttribute('data-tool-call-count', 'true');
    expect(document.querySelector('[data-token-count="true"]')).toBeNull();
    expect(document.querySelector('time')).not.toBeNull();
  });
});
