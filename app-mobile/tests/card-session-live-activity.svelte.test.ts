// ───────────────────────────────────────────────────────────────────
// MODULE: CARD SESSION LIVE ACTIVITY TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CardSession, {
  type LiveActivityCardInput,
} from '../src/pages/home/card-session.svelte';
import type {
  LiveActivityCandidate,
  LiveActivityEvent,
} from '../src/shared/format/live-activity-arbitration.js';
import * as liveActivityContent from '../src/shared/format/live-activity-content.js';
import { LIVE_ACTIVITY_STALE_MS } from '../src/shared/state/live-activity-staleness.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = Date.parse('2026-08-17T10:00:00.000Z');
const UPDATED_AT = new Date(NOW).toISOString();

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 2,
    ...overrides,
  };
}

function withHost<T extends Record<string, unknown>>(
  session: SessionCardDto,
  fields: T,
): SessionCardDto & T {
  return Object.assign({}, session, fields);
}

function candidate(session: SessionCardDto, firstSeenAt: number): LiveActivityCandidate {
  return { session, firstSeenAt };
}

function activityInput(
  candidates: readonly LiveActivityCandidate[],
  event?: LiveActivityEvent,
): LiveActivityCardInput {
  return { candidates, event };
}

function props(session: SessionCardDto, liveActivity?: LiveActivityCardInput) {
  return {
    sessionId: session.id,
    selectSession: () => session,
    source: 'relay' as const,
    unread: false,
    launchingId: null,
    openDisabled: false,
    onOpen: vi.fn(),
    liveActivity,
  };
}

function renderCard(session: SessionCardDto, liveActivity?: LiveActivityCardInput) {
  return render(CardSession, { props: props(session, liveActivity) });
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

describe('card-session live activity arbitration', () => {
  it('renders the arbitrated winner only and uses the shared content fallback for its line', () => {
    const longActivity = 'x'.repeat(120);
    const winner = withHost(card('winner', { status: 'running' }), { activity: longActivity });
    const loser = card('loser', { status: 'idle' });
    const candidates = [candidate(winner, 10), candidate(loser, 20)];
    const input = {
      activity: longActivity,
      state: 'Working',
    } satisfies liveActivityContent.LiveActivityContentInput;
    const expectedLine = liveActivityContent.resolveLiveActivityContent(input);
    const resolveContent = vi.spyOn(liveActivityContent, 'resolveLiveActivityContent');

    const winnerView = renderCard(
      winner,
      activityInput(candidates, { type: 'edge', sessionId: winner.id }),
    );
    const loserView = renderCard(
      loser,
      activityInput(candidates, { type: 'edge', sessionId: loser.id }),
    );

    expect(expectedLine).toBe(`${'x'.repeat(79)}…`);
    expect(resolveContent).toHaveBeenCalledWith(input);
    expect(winnerView.container.querySelector('[data-live-activity="true"]')).not.toBeNull();
    expect(winnerView.container.querySelector('[data-live-activity-content="true"]')).toHaveTextContent(
      expectedLine ?? '',
    );
    expect(loserView.container.querySelector('[data-live-activity="true"]')).toBeNull();
  });

  it('keeps a current winner in place when another session ticks, then re-elects on an edge', async () => {
    const winner = card('winner', { status: 'running' });
    const runner = card('runner', { status: 'running' });
    const initialCandidates = [candidate(winner, 10), candidate(runner, 20)];
    const view = renderCard(
      winner,
      activityInput(initialCandidates, { type: 'edge', sessionId: winner.id }),
    );

    const promotedRunner = withHost(runner, { status: 'idle' as const, attention: 'waiting' });
    await view.rerender({
      ...props(
        winner,
        activityInput(
          [candidate(winner, 10), candidate(promotedRunner, 20)],
          { type: 'tick', sessionId: promotedRunner.id },
        ),
      ),
    });

    expect(view.container.querySelector('[data-live-activity="true"]')).not.toBeNull();
    expect(view.container.querySelector('[data-live-activity-session-id="winner"]')).not.toBeNull();
    expect(view.container.querySelector('[data-live-activity-session-id="runner"]')).toBeNull();

    await view.rerender({
      ...props(
        promotedRunner,
        activityInput(
          [candidate(winner, 10), candidate(promotedRunner, 20)],
          { type: 'edge', sessionId: promotedRunner.id },
        ),
      ),
    });

    expect(view.container.querySelector('[data-live-activity-session-id="runner"]')).not.toBeNull();
  });
});

describe('card-session live activity staleness', () => {
  it('keeps an in-window session clear and grays one past the shared staleness boundary', () => {
    const inside = card('inside', {
      status: 'running',
      updatedAt: new Date(NOW - LIVE_ACTIVITY_STALE_MS + 1).toISOString(),
    });
    const insideView = renderCard(
      inside,
      activityInput([candidate(inside, 10)], { type: 'edge', sessionId: inside.id }),
    );

    expect(insideView.container.querySelector('[data-live-stale="true"]')).toBeNull();

    cleanup();
    const stale = card('stale', {
      status: 'running',
      updatedAt: new Date(NOW - LIVE_ACTIVITY_STALE_MS).toISOString(),
    });
    const staleView = renderCard(
      stale,
      activityInput([candidate(stale, 10)], { type: 'edge', sessionId: stale.id }),
    );

    expect(staleView.container.querySelector('[data-live-stale="true"]')).not.toBeNull();
  });
});

describe('card-session live activity dismissal', () => {
  it('latches dismissal for the same state and releases after the state changes', async () => {
    const session = card('dismissible', { status: 'running' });
    const liveActivity = activityInput(
      [candidate(session, 10)],
      { type: 'edge', sessionId: session.id },
    );
    const view = renderCard(session, liveActivity);
    const dismiss = screen.getByRole('button', { name: 'Dismiss live activity' });

    await fireEvent.click(dismiss);
    expect(view.container.querySelector('[data-live-activity-content="true"]')).toBeNull();

    await view.rerender({ ...props(session, liveActivity) });
    expect(view.container.querySelector('[data-live-activity-content="true"]')).toBeNull();

    const moved = withHost(session, {
      status: 'idle' as const,
      updatedAt: new Date(NOW + 1_000).toISOString(),
    });
    await view.rerender({
      ...props(
        moved,
        activityInput([candidate(moved, 10)], { type: 'edge', sessionId: moved.id }),
      ),
    });

    expect(view.container.querySelector('[data-live-activity-content="true"]')).toHaveTextContent(
      'Settled',
    );
  });
});

// The capability input is optional because the current relay does not publish
// the roster metadata required to arbitrate a single live-activity slot.
describe('card-session live activity capability gate', () => {
  it('renders no live-activity surface when arbitration input is absent', () => {
    const session = card('ungated', { status: 'running' });
    const view = renderCard(session);

    expect(view.container.querySelector('[data-live-activity="true"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dismiss live activity' })).toBeNull();
  });
});
