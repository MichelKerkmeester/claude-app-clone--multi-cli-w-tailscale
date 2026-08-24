// ───────────────────────────────────────────────────────────────────
// MODULE: MODEL SEARCH VIRTUAL FOCUS TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type {
  AvailableModelDto,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeControls, RuntimeUiState } from '../src/shared/state/runtime.js';
import ModelEffortSheet, { SEARCH_THRESHOLD } from '../src/pages/chat/chrome/sheet-model-effort.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const CURRENT: AvailableModelDto = {
  provider: 'alpha',
  id: 'alpha-current',
  label: 'Alpha Current',
  reasoning: true,
};

const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: CURRENT,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function models(count: number): readonly AvailableModelDto[] {
  return [
    CURRENT,
    ...Array.from({ length: Math.max(0, count - 1) }, (_, index) => ({
      provider: `provider-${index + 1}`,
      id: `model-${index + 1}`,
      label: `Model ${index + 1}`,
    })),
  ];
}

function readyRuntime(catalog: readonly AvailableModelDto[]): RuntimeUiState {
  return {
    status: 'ready',
    phase: 'ready-adjustable',
    state: HOST_STATE,
    models: catalog,
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function runtimeControls(runtime: RuntimeUiState): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('model search virtual focus', () => {
  it('keeps DOM focus on the search input while arrows move aria-activedescendant', async () => {
    const user = userEvent.setup();
    const catalog = models(SEARCH_THRESHOLD);
    render(ModelEffortSheet, {
      props: {
        isOpen: true,
        onOpenChange: vi.fn(),
        initialSection: 'model',
        runtimeControls: runtimeControls(readyRuntime(catalog)),
        triggerRef: null,
      },
    });

    const searchInput = await screen.findByRole('textbox', { name: 'Search models' });
    const listbox = screen.getByRole('listbox', { name: 'Available models' });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await user.click(searchInput);

    const enabledRows = screen
      .getAllByRole('option')
      .filter((row) => !row.hasAttribute('aria-disabled'));
    expect(enabledRows.length).toBeGreaterThanOrEqual(2);
    const firstId = enabledRows[0]?.getAttribute('id');
    const secondId = enabledRows[1]?.getAttribute('id');
    if (firstId === null || secondId === null) throw new Error('Expected stable option ids');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(firstId);
    });
    expect(searchInput).toHaveAttribute('aria-controls', listbox.id);
    expect(document.getElementById(firstId)).toHaveAttribute('role', 'option');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(secondId);
    });

    await user.keyboard('{Enter}');
    await waitFor(() => expect(enabledRows[1]).toHaveAttribute('aria-selected', 'true'));
    expect(document.activeElement).toBe(searchInput);
  });

  it('omits aria-expanded and focuses the first available match while typing', async () => {
    const user = userEvent.setup();
    const catalog = models(SEARCH_THRESHOLD);
    render(ModelEffortSheet, {
      props: {
        isOpen: true,
        onOpenChange: vi.fn(),
        initialSection: 'model',
        runtimeControls: runtimeControls(readyRuntime(catalog)),
        triggerRef: null,
      },
    });

    const searchInput = await screen.findByRole('textbox', { name: 'Search models' });
    expect(searchInput).not.toHaveAttribute('aria-expanded');

    searchInput.focus();
    await user.type(searchInput, 'a');

    await waitFor(() => {
      const firstAvailableOption = screen
        .getAllByRole('option')
        .find((row) => !row.hasAttribute('aria-disabled'));
      if (firstAvailableOption === undefined) throw new Error('Expected an available option');
      const firstId = firstAvailableOption.getAttribute('id');
      if (firstId === null) throw new Error('Expected a stable option id');
      expect(document.activeElement).toBe(searchInput);
      expect(searchInput.getAttribute('aria-activedescendant')).toBe(firstId);
    });
  });
});
