import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_RUNTIME_STATE, runtimeReducer, type RuntimeUiState } from '../src/shared/state/runtime.js';
import PlanModeButton from '../src/pages/chat/chrome/plan-mode-button.svelte';

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: null,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const MODELS: RuntimeModelCatalogDto = {
  sessionId: 'session_local',
  catalogRevision: 7,
  runtimeRevision: 4,
  currentModel: null,
  streaming: false,
  canSetModelWhileStreaming: false,
  models: [],
};

function readyRuntime(): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, {
    type: 'hydrated',
    state: HOST_STATE,
    models: MODELS,
  });
}

function renderMenu() {
  let lastOpenFlag = false;
  const view = render(PlanModeButton, {
    props: {
      runtime: readyRuntime(),
      connection: 'live',
      isOpen: false,
      onOpenChange: vi.fn((open: boolean) => {
        lastOpenFlag = open;
      }),
      onSelectPlan: vi.fn(),
      onSelectBuild: vi.fn(),
      buttonRef: null,
    },
  });

  return {
    async openMenu(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: /Agent mode: Build/ }));
      await view.rerender({ isOpen: lastOpenFlag });
      return screen.findByRole('menu', { name: /Agent mode/ });
    },
  };
}

afterEach(() => {
  cleanup();
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

describe('shared menu accessibility parity', () => {
  it('keeps focus contained and the menu open for forward and reverse Tab', async () => {
    const user = userEvent.setup({ delay: null });
    const menu = await renderMenu().openMenu(user);
    const row = within(menu)
      .getAllByRole('menuitem')
      .find((candidate) => candidate.getAttribute('aria-disabled') !== 'true');

    expect(row).toBeDefined();
    if (row === undefined) throw new Error('Expected an enabled menu row');
    row.focus();
    expect(row).toHaveAttribute('role', 'menuitem');
    expect(document.activeElement).toBe(row);

    await user.keyboard('{Tab}');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('data-state', 'open');
    expect(within(menu).getAllByRole('menuitem', { hidden: true })).toHaveLength(2);
    expect(menu.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('data-state', 'open');
    expect(within(menu).getAllByRole('menuitem', { hidden: true })).toHaveLength(2);
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it('renders two untabbable Dismiss buttons that close the menu', async () => {
    const user = userEvent.setup();
    await renderMenu().openMenu(user);
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' });

    expect(dismissButtons).toHaveLength(2);
    for (const button of dismissButtons) {
      expect(button).toHaveAttribute('tabindex', '-1');
    }

    await user.click(dismissButtons[0]);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });
});
