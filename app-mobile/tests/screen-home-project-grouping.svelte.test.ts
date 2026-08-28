// ───────────────────────────────────────────────────────────────────
// MODULE: Home Project Grouping Tests
// ───────────────────────────────────────────────────────────────────

// Project grouping is enabled only by host-published labels. The tests also
// exercise the existing filter rule against the real disclosure elements.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Home from '../src/pages/home/screen-home.svelte';
import type { SessionListState } from '../src/shared/state/state.js';

const attention = vi.hoisted(() => ({
  fetchAttention: vi.fn(),
  fetchPushConfig: vi.fn(),
  openAttentionHint: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  updatePushPreferences: vi.fn(),
  setPushForeground: vi.fn(),
}));

vi.mock('../src/shared/format/attention.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/format/attention.js')>()),
  ...attention,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T12:00:00.000Z';

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

function roster(items: readonly SessionCardDto[]): SessionListState {
  return {
    items,
    phase: 'ready',
    source: 'relay',
    updatedAt: UPDATED_AT,
    error: null,
  };
}

function homeProps(items: readonly SessionCardDto[]) {
  return {
    sessions: roster(items),
    connection: 'live' as const,
    cache: null,
    device: { deviceId: 'device_project_grouping', hostFingerprint: 'host_project_grouping' },
    onSelect: vi.fn(),
    onRevoke: vi.fn(),
    onLogout: vi.fn(),
  };
}

function projectSection(label: string): HTMLDetailsElement {
  const node = document.querySelector(`[data-project-section="${label}"]`);
  if (!(node instanceof HTMLDetailsElement)) throw new Error(`Missing project section ${label}`);
  return node;
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
  attention.fetchPushConfig.mockResolvedValue({
    supported: false,
    vapidPublicKey: null,
    preferences: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('home project grouping', () => {
  it('keeps an unlabeled roster ungrouped and switches to host-labeled groups on prop update', async () => {
    const initial = [card('unlabeled-session')];
    const view = render(Home, { props: homeProps(initial) });

    expect(document.querySelector('[data-project-section]')).toBeNull();
    expect(document.querySelector('[data-session-id="unlabeled-session"]')).not.toBeNull();

    const labeled = [
      withHost(card('project-alpha-running', { status: 'running' }), { projectLabel: 'Alpha' }),
      withHost(card('project-beta-idle'), { projectLabel: 'Beta' }),
    ];
    await view.rerender({ ...homeProps(labeled) });

    expect(projectSection('Alpha')).toBeInTheDocument();
    expect(projectSection('Beta')).toBeInTheDocument();
  });

  it('forms project groups and expands only the group containing the active session', () => {
    const labeled = [
      withHost(card('project-alpha-running', { status: 'running' }), { projectLabel: 'Alpha' }),
      withHost(card('project-beta-idle'), { projectLabel: 'Beta' }),
      withHost(card('project-alpha-idle'), { projectLabel: 'Alpha' }),
    ];
    render(Home, { props: homeProps(labeled) });

    const alpha = projectSection('Alpha');
    const beta = projectSection('Beta');
    expect(alpha.open).toBe(true);
    expect(alpha).toHaveAttribute('data-project-active', 'true');
    expect(beta.open).toBe(false);
    expect(beta).toHaveAttribute('data-project-active', 'false');
    expect(alpha.querySelectorAll('[data-session-id]')).toHaveLength(2);
    expect(beta.querySelectorAll('[data-session-id]')).toHaveLength(1);
  });

  it('force-expands a collapsed project group when a query matches a card inside it', async () => {
    const user = userEvent.setup();
    const labeled = [
      withHost(card('project-alpha-running', { status: 'running' }), { projectLabel: 'Alpha' }),
      withHost(card('project-beta-target'), { projectLabel: 'Beta' }),
    ];
    render(Home, { props: homeProps(labeled) });

    const beta = projectSection('Beta');
    expect(beta.open).toBe(false);

    const search = screen.getByRole('searchbox', { name: 'Search session ids on this device' });
    await user.type(search, 'project-beta-target');

    expect(beta.open).toBe(true);
    expect(beta).toHaveAttribute('data-project-active', 'false');
    expect(document.querySelector('[data-session-id="project-beta-target"]')).not.toBeNull();
  });
});
