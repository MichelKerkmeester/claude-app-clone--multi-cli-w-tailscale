// ───────────────────────────────────────────────────────────────────
// MODULE: Recent Sessions Dock Tests
// ───────────────────────────────────────────────────────────────────

// The dock is rendered against a mocked app context with real local storage so
// navigation, host reconciliation and menu semantics reach the component.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CardSession from '../src/pages/home/card-session.svelte';
import DockRecentSessions from '../src/pages/chat/chrome/dock-recent-sessions.svelte';
import { readRecencyStack, writeRecencyStack } from '../src/shared/state/recency-stack.js';
import { writeUnreadIds } from '../src/shared/state/unread-overlay.js';

const harness = vi.hoisted(() => ({
  app: { sessions: { items: [] as SessionCardDto[] } },
  navigate: vi.fn(),
}));

vi.mock('../src/shared/state/app-state.svelte.js', () => ({
  getAppActions: () => ({ navigate: harness.navigate }),
  getAppState: () => harness.app,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function card(id: string, title: string, status: SessionCardDto['status'] = 'idle'): SessionCardDto {
  return {
    id,
    title,
    status,
    updatedAt: '2026-08-17T12:00:00.000Z',
    messageCount: 1,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  harness.app.sessions.items = [];
  harness.navigate.mockReset();
  window.localStorage.clear();
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('recent sessions dock navigation', () => {
  it('renders the local MRU order and navigates through the app action', async () => {
    harness.app.sessions.items = [
      card('current', 'Current'),
      card('newest', 'Newest'),
      card('older', 'Older'),
    ];
    writeRecencyStack(['newest', 'older']);

    render(DockRecentSessions, { props: { sessionId: 'current' } });

    const strip = screen.getByRole('group', { name: 'Visited sessions' });
    expect([...strip.querySelectorAll('.recent-sessions--label')].map((node) => node.textContent)).toEqual([
      'Newest',
      'Older',
    ]);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Newest, Settled' }));
    expect(harness.navigate).toHaveBeenCalledTimes(1);
    expect(harness.navigate).toHaveBeenCalledWith('newest');
  });

  it('uses the same unread badge for a done session on the home card and dock chip', () => {
    const session = card('done_unread', 'Done and unread');
    const doneUnread = { ...session, attention: 'done' as const };
    harness.app.sessions.items = [doneUnread];
    writeRecencyStack([doneUnread.id]);
    writeUnreadIds(new Set([doneUnread.id]));

    const home = render(CardSession, {
      props: {
        sessionId: doneUnread.id,
        selectSession: () => doneUnread,
        source: 'relay',
        unread: false,
        unreadIds: new Set([doneUnread.id]),
        launchingId: null,
        openDisabled: false,
        onOpen: vi.fn(),
      },
    });
    const dock = render(DockRecentSessions, { props: { sessionId: 'current' } });

    const homeBadge = home.container.querySelector('[data-attention-badge]');
    const dockBadge = dock.container.querySelector('[data-badge]');
    expect(homeBadge).not.toBeNull();
    expect(dockBadge).not.toBeNull();
    expect(homeBadge).toHaveTextContent('Unread');
    expect(dockBadge).toHaveTextContent('Unread');
    expect(homeBadge).toHaveAttribute('data-attention-badge', 'unread');
    expect(dockBadge).toHaveAttribute('data-badge', 'unread');
  });

  it('does not render a locally remembered session after the host drops it', () => {
    harness.app.sessions.items = [card('current', 'Current'), card('live', 'Still live')];
    writeRecencyStack(['dropped', 'live']);

    render(DockRecentSessions, { props: { sessionId: 'current' } });

    // Enumerate everything the strip rendered rather than probing for one absent
    // name. A dropped id carries no host title, so any name it could surface under
    // is unknowable here; asserting the exact remaining set is what catches a chip
    // that leaks through under whatever label it happens to take.
    const strip = screen.getByRole('group', { name: 'Visited sessions' });
    expect([...strip.querySelectorAll('.recent-sessions--label')].map((node) => node.textContent)).toEqual([
      'Still live',
    ]);
  });

  it('records the session being left at the front of local history', () => {
    harness.app.sessions.items = [card('current', 'Current')];
    writeRecencyStack([]);

    const view = render(DockRecentSessions, { props: { sessionId: 'current' } });
    view.unmount();

    expect(readRecencyStack()[0]).toBe('current');
  });

  it('shows edge fades only after measured overflow exists', async () => {
    harness.app.sessions.items = [card('one', 'One'), card('two', 'Two')];
    writeRecencyStack(['one', 'two']);

    render(DockRecentSessions, { props: { sessionId: 'one' } });
    const strip = screen.getByRole('group', { name: 'Visited sessions' });
    Object.defineProperties(strip, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 100 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.scroll(strip);
    expect(document.querySelectorAll('.recent-sessions--fade')).toHaveLength(0);

    Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 200 });
    fireEvent.scroll(strip);
    expect(document.querySelectorAll('.recent-sessions--fade')).toHaveLength(1);

    Object.defineProperty(strip, 'scrollLeft', { configurable: true, writable: true, value: 50 });
    fireEvent.scroll(strip);
    expect(document.querySelectorAll('.recent-sessions--fade')).toHaveLength(2);
    await Promise.resolve();
  });
});

describe('recent sessions dock removal guardrails', () => {
  it('marks remove-others disabled when the chip has no local peer to remove', async () => {
    harness.app.sessions.items = [card('only', 'Only')];
    writeRecencyStack(['only']);

    render(DockRecentSessions, { props: { sessionId: 'only' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'More actions for Only' }));

    const menu = await screen.findByRole('menu', { hidden: true });
    const removeOthers = within(menu)
      .getByText('Remove other sessions')
      .closest('[role="menuitem"]');
    expect(removeOthers).not.toBeNull();
    expect(removeOthers).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables remove-others when every local peer was dropped by the host', async () => {
    harness.app.sessions.items = [card('current', 'Current')];
    writeRecencyStack(['current', 'dropped-peer']);

    render(DockRecentSessions, { props: { sessionId: 'current' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'More actions for Current' }));

    const menu = await screen.findByRole('menu', { hidden: true });
    const removeOthers = within(menu)
      .getByText('Remove other sessions')
      .closest('[role="menuitem"]');
    expect(removeOthers).not.toBeNull();
    expect(removeOthers).toHaveAttribute('aria-disabled', 'true');
  });

  it('uses one confirmation funnel before removing a pinned chip', async () => {
    harness.app.sessions.items = [card('pinned', 'Pinned'), card('other', 'Other')];
    writeRecencyStack(['pinned', 'other']);
    window.localStorage.setItem('pi-remote.session-favorite', JSON.stringify(['pinned']));
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(DockRecentSessions, { props: { sessionId: 'other' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'More actions for Pinned' }));
    const menu = await screen.findByRole('menu', { hidden: true });
    await user.click(within(menu).getByText('Remove this session'));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(readRecencyStack()).toEqual(['pinned', 'other']);
  });
});
