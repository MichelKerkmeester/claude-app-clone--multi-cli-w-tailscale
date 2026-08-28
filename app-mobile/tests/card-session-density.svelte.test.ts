// ───────────────────────────────────────────────────────────────────
// MODULE: CARD SESSION DENSITY
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import CardSession from '../src/pages/home/card-session.svelte';
import type {
  CardDensity,
  SignalKey,
  SignalVisibility,
} from '../src/shared/format/roster-view-preference.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function makeCard(overrides: Record<string, unknown> = {}): SessionCardDto {
  return {
    id: 'session-density',
    status: 'running',
    messageCount: 2,
    updatedAt: '2025-01-01T00:00:00.000Z',
    activity: 'Working',
    lastMessagePreview: 'Latest host message',
    previewMessages: ['First preview', 'Second preview'],
    prompt: 'Prompt text',
    agent: 'Agent name',
    model: 'Model name',
    contextPercent: 42,
    ...overrides,
  } as unknown as SessionCardDto;
}

function renderCard(
  card = makeCard(),
  options: {
    density?: CardDensity;
    signalVisibility?: SignalVisibility;
    onDensityChange?: (density: CardDensity) => void;
    onSignalToggle?: (signal: SignalKey) => void;
  } = {},
) {
  return render(CardSession, {
    sessionId: card.id,
    selectSession: () => card,
    source: 'relay',
    unread: false,
    launchingId: null,
    openDisabled: false,
    onOpen: () => undefined,
    density: options.density ?? 'detailed',
    signalVisibility: options.signalVisibility ?? {
      activity: true,
      preview: true,
      prompt: true,
      agent: true,
      context: true,
    },
    onDensityChange: options.onDensityChange ?? (() => undefined),
    onSignalToggle: options.onSignalToggle ?? (() => undefined),
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('card-session density and signal visibility', () => {
  it('renders every available signal in detailed density', () => {
    const { container } = renderCard();

    expect(container.querySelector('[data-inline-density="detailed"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="activity"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="preview"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="prompt"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="agent"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="context"]')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Detailed' })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders only compact-priority signals when the parent selects compact density', () => {
    const { container } = renderCard(makeCard(), { density: 'compact' });

    expect(container.querySelector('[data-inline-density="compact"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="activity"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="preview"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-signal="prompt"]')).toBeNull();
    expect(container.querySelector('[data-inline-signal="agent"]')).toBeNull();
    expect(container.querySelector('[data-inline-signal="context"]')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Compact' })).toHaveAttribute('aria-checked', 'true');
  });

  it('sends density changes to the parent without writing device storage', async () => {
    const onDensityChange = vi.fn();
    renderCard(makeCard(), { onDensityChange });

    await fireEvent.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(onDensityChange).toHaveBeenCalledWith('compact');
    expect(localStorage.getItem('pi-remote.card-density')).toBeNull();
  });

  it('sends signal visibility changes to the parent without writing device storage', async () => {
    const onSignalToggle = vi.fn();
    renderCard(makeCard(), { onSignalToggle });

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Preview' }));

    expect(onSignalToggle).toHaveBeenCalledWith('preview');
    expect(localStorage.getItem('pi-remote.card-signal-visibility')).toBeNull();
  });

  it('renders parent-owned compact density without changing host session data', () => {
    const card = makeCard();
    const { container } = renderCard(card, { density: 'compact' });

    expect(card.status).toBe('running');
    expect(container.querySelector('[data-host-status="running"]')).not.toBeNull();
    expect(container.querySelector('[data-inline-density="compact"]')).not.toBeNull();
  });
});
