// ───────────────────────────────────────────────────────────────────
// MODULE: Session Card Presentation Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CardSession from '../src/pages/home/card-session.svelte';
import { WORKING_STALE_MS, hueFromId } from '../src/shared/format/card-projection.js';
import { compactId } from '../src/shared/format/view-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T10:00:00.000Z';
const NOW = Date.parse(UPDATED_AT);

function card(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id: 'session_card_ui_001',
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 3,
    ...overrides,
  };
}

function withHost(base: SessionCardDto, extra: Record<string, unknown>): SessionCardDto {
  return Object.assign({}, base, extra);
}

function renderCard(
  session: SessionCardDto,
  extras: {
    onOpen?: ReturnType<typeof vi.fn>;
    unread?: boolean;
    seenAvailable?: boolean;
    selectLastSeen?: (id: string) => string | undefined;
  } = {},
) {
  const onOpen = extras.onOpen ?? vi.fn();
  render(CardSession, {
    props: {
      sessionId: session.id,
      selectSession: (id: string) => (id === session.id ? session : undefined),
      source: 'relay',
      unread: extras.unread ?? false,
      launchingId: null,
      openDisabled: false,
      onOpen,
      seenAvailable: extras.seenAvailable ?? true,
      selectLastSeen: extras.selectLastSeen ?? (() => undefined),
    },
  });
  return { onOpen, session };
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

describe('session card polish', () => {
  it('keeps the detail row always inline and never mounts accordion chrome', () => {
    renderCard(
      withHost(card({ status: 'running' }), {
        lastMessagePreview: 'Host preview line',
        activity: 'npm test',
      }),
    );
    expect(document.querySelector('[data-inline-detail="true"]')).not.toBeNull();
    expect(document.querySelector('[aria-expanded]')).toBeNull();
    expect(document.querySelector('details')).toBeNull();
    expect(screen.queryByRole('button', { name: /peek|expand/i })).not.toBeInTheDocument();
  });

  it('relabels blocks as messages and exposes a real datetime equal to updatedAt', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onOpen } = renderCard(card({ messageCount: 4 }));
    expect(screen.getByText('4 messages')).toBeInTheDocument();
    const time = document.querySelector('time');
    expect(time).not.toBeNull();
    expect(time?.getAttribute('datetime')).toBe(UPDATED_AT);
    await user.click(time as HTMLElement);
    expect(onOpen).not.toHaveBeenCalled();
    expect(time?.textContent).toBe(UPDATED_AT);
  });

  it('omits the resting-done glyph on a settled card', () => {
    renderCard(card({ status: 'idle' }));
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('dots a card whose updatedAt is newer than the persisted look', () => {
    renderCard(card({ updatedAt: '2026-08-17T10:05:00.000Z' }), {
      selectLastSeen: () => UPDATED_AT,
      seenAvailable: true,
    });
    const dot = document.querySelector('[data-seen-dot="true"]');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('aria-label', 'Changed since you looked');
  });

  it('shows no seen-dot when the store is unreadable', () => {
    renderCard(card({ updatedAt: '2026-08-17T10:05:00.000Z' }), {
      selectLastSeen: () => UPDATED_AT,
      seenAvailable: false,
    });
    expect(document.querySelector('[data-seen-dot="true"]')).toBeNull();
  });

  it('renders a deterministic hue mark that does not reprint the id', () => {
    const session = card({ id: 'session_hue_ui_001' });
    renderCard(session);
    const mark = document.querySelector('.session--hue');
    const button = document.querySelector('[data-session-id="session_hue_ui_001"]');
    expect(mark).not.toBeNull();
    expect(button).toHaveAttribute('data-hue', String(hueFromId(session.id)));
    expect(mark?.getAttribute('style') ?? '').not.toContain(session.id);
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });

  it('decays a silent running card to unknown without writing status', () => {
    const session = card({
      status: 'running',
      updatedAt: new Date(NOW - WORKING_STALE_MS).toISOString(),
    });
    renderCard(session);
    const button = document.querySelector(`[data-session-id="${session.id}"]`);
    expect(button).toHaveAttribute('data-stale', 'stale-unknown');
    expect(button).toHaveAttribute('data-host-status', 'running');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(session.status).toBe('running');
  });

  it('keeps live-state and read-state on separate channels and never badges running as unread', () => {
    renderCard(card({ status: 'running' }), { unread: true });
    const button = document.querySelector('[data-session-id="session_card_ui_001"]');
    expect(button).not.toHaveAttribute('data-unread');
    expect(document.querySelector('[data-live-badge="true"]')).not.toBeNull();
    expect(screen.getByText('Working')).toBeInTheDocument();
    expect(document.querySelector('[data-attention-badge]')).toBeNull();
  });

  it('opens on card tap and keeps compactId as the fallback title', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const session = card({ id: 'session_open_001' });
    const { onOpen } = renderCard(session);
    expect(screen.getByText(compactId(session.id))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /session_open_001/i }));
    expect(onOpen).toHaveBeenCalledWith(expect.any(MouseEvent), session.id);
  });
});

describe('optional host-field gate on the card', () => {
  it('keeps today\'s card when enrichment keys are absent', () => {
    renderCard(card({ status: 'running' }));
    expect(document.querySelector('[data-inline-detail="true"]')).toBeNull();
    expect(document.querySelector('[data-attention-badge]')).toBeNull();
    expect(document.querySelector('[data-context-percent]')).toBeNull();
    expect(screen.queryByText(/^You:/)).not.toBeInTheDocument();
    expect(screen.getByText(compactId('session_card_ui_001'))).toBeInTheDocument();
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('renders each present host field as inline enrichment', () => {
    renderCard(
      withHost(card({ status: 'idle', id: 'session_enriched_ui_001' }), {
        title: 'Named session',
        lastMessagePreview: 'Last line from the host',
        agent: 'Opus',
        contextPercent: 42,
        activity: 'npm test',
        tool: 'bash',
        prompt: 'Run the suite',
        model: 'opus-4',
        attention: 'waiting',
      }),
    );
    expect(screen.getByText('Named session')).toBeInTheDocument();
    expect(screen.queryByText(compactId('session_enriched_ui_001'))).not.toBeInTheDocument();
    expect(screen.getByText('Last line from the host')).toBeInTheDocument();
    expect(screen.getByText('Opus')).toBeInTheDocument();
    expect(screen.getByText('npm test (bash)')).toBeInTheDocument();
    expect(screen.getByText('You: Run the suite')).toBeInTheDocument();
    expect(screen.getByText('opus-4')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Context window' })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Waiting');
    expect(document.querySelector('[data-inline-detail="true"]')).not.toBeNull();
    expect(document.querySelector('[aria-expanded]')).toBeNull();
  });

  it('does not badge a running session as needs-you when attention is present', () => {
    renderCard(withHost(card({ status: 'running' }), { attention: 'waiting' }));
    expect(document.querySelector('[data-attention-badge]')).toBeNull();
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('renders nothing for contextPercent, activity, prompt, and model when those keys are absent', () => {
    renderCard(card({ status: 'running' }));
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByText(/npm test/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^You:/)).not.toBeInTheDocument();
    expect(screen.queryByText('opus-4')).not.toBeInTheDocument();
  });
});
