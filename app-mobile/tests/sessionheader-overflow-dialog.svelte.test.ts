// ───────────────────────────────────────────────────────────────────
// MODULE: Session Header Overflow Dialog Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SessionHeader, {
  type ThemePreference,
} from '../src/pages/chat/chrome/session-header.svelte';
import { INITIAL_RUNTIME_STATE, type RuntimeControls, type RuntimeUiState } from '../src/shared/state/runtime.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

function readyRuntime(): RuntimeUiState {
  return {
    ...INITIAL_RUNTIME_STATE,
    status: 'ready',
    phase: 'ready-adjustable',
    state: HOST_STATE,
    models: [HOST_STATE.model as NonNullable<RuntimeStateDto['model']>],
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function makeControls(): RuntimeControls {
  return {
    runtime: readyRuntime(),
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function renderHeader({
  theme = 'system',
  onInbox = vi.fn(),
  onReview = vi.fn(),
  onThemeChange = vi.fn(),
}: {
  readonly theme?: ThemePreference;
  readonly onInbox?: ReturnType<typeof vi.fn>;
  readonly onReview?: ReturnType<typeof vi.fn>;
  readonly onThemeChange?: ReturnType<typeof vi.fn>;
} = {}) {
  render(SessionHeader, {
    props: {
      onBack: vi.fn(),
      onInbox,
      onReview,
      theme,
      onThemeChange,
      runtimeControls: makeControls(),
      sheetOpen: false,
      onOpenModelSheet: vi.fn(),
      modelTriggerRef: null,
    },
  });

  return { onInbox, onReview, onThemeChange };
}

async function openOverflow() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'More: navigation and theme' }));
  const dialog = screen.getByRole('dialog', { name: 'Navigation and theme' });
  return { dialog, user };
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  const box = {
    width: 200,
    height: 44,
    top: 0,
    left: 0,
    right: 200,
    bottom: 44,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box);
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({
    length: 1,
    0: box,
    item: (index: number) => (index === 0 ? box : null),
    [Symbol.iterator]: function* () {
      yield box;
    },
  } as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SessionHeader overflow dialog', () => {
  it('renders navigation and theme with dialog and toggle-button semantics', async () => {
    renderHeader();
    expect(
      screen.getByRole('button', { name: 'More: navigation and theme' }),
    ).not.toHaveAttribute('aria-haspopup');
    const { dialog, user } = await openOverflow();

    expect(dialog).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    expect(within(dialog).getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(within(dialog).queryAllByRole('menuitem')).toHaveLength(0);

    const themeGroup = within(dialog).getByRole('group', { name: 'Color theme' });
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(within(themeGroup).queryAllByRole('radio')).toHaveLength(0);

    expect(within(themeGroup).getByRole('button', { name: 'Use system theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(themeGroup).getByRole('button', { name: 'Use light theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(themeGroup).getByRole('button', { name: 'Use dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(within(themeGroup).getByRole('button', { name: 'Use dark theme' }));
  });

  it('focuses the dialog container on open before tabbing into navigation', async () => {
    renderHeader();
    const { dialog, user } = await openOverflow();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    expect(dialog).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(within(dialog).getByRole('button', { name: 'Inbox' })).toHaveFocus();
  });

  it('provides two dismiss buttons that close the dialog', async () => {
    renderHeader();
    const { user } = await openOverflow();
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' });

    expect(dismissButtons).toHaveLength(2);
    for (const dismissButton of dismissButtons) {
      expect(dismissButton).toHaveAttribute('tabindex', '-1');
    }

    await user.click(dismissButtons[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('routes Inbox and Review through ordinary buttons and reports theme changes', async () => {
    const onInbox = vi.fn();
    const onReview = vi.fn();
    const onThemeChange = vi.fn();
    renderHeader({ onInbox, onReview, onThemeChange });
    const { dialog, user } = await openOverflow();

    await user.click(within(dialog).getByRole('button', { name: 'Inbox' }));
    await user.click(within(dialog).getByRole('button', { name: 'Review' }));
    await user.click(within(dialog).getByRole('button', { name: 'Use dark theme' }));

    expect(onInbox).toHaveBeenCalledOnce();
    expect(onReview).toHaveBeenCalledOnce();
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('keeps Tab focus moving from navigation into the theme buttons', async () => {
    renderHeader();
    const { dialog, user } = await openOverflow();
    // Let bits-ui's open focus scope and floating placement settle before native Tab.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const inbox = within(dialog).getByRole('button', { name: 'Inbox' });
    const review = within(dialog).getByRole('button', { name: 'Review' });
    const themeButtons = [
      within(dialog).getByRole('button', { name: 'Use system theme' }),
      within(dialog).getByRole('button', { name: 'Use light theme' }),
      within(dialog).getByRole('button', { name: 'Use dark theme' }),
    ];

    inbox.focus();
    expect(inbox).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(review).toHaveFocus();
    await user.keyboard('{Tab}');

    expect(dialog).toContainElement(document.activeElement);
    expect(themeButtons).toContain(document.activeElement);
  });
});
