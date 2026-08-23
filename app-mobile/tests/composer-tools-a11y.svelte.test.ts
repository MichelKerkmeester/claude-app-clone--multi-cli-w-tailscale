import type { RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HostCommandCatalogState, SelectedCommandBinding } from '../src/shared/commands/commands.js';
import ComposerTools from '../src/pages/chat/chrome/composer-tools.svelte';
import {
  INITIAL_RUNTIME_STATE,
  type RuntimeControls,
  type RuntimeUiState,
} from '../src/shared/state/runtime.js';

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

function makeCatalog(): HostCommandCatalogState {
  return {
    status: 'loading',
    snapshot: null,
    commands: [],
    refresh: vi.fn().mockResolvedValue(undefined),
  };
}

function renderTools() {
  render(ComposerTools, {
    props: {
      runtimeControls: makeControls(),
      catalog: makeCatalog(),
      onInsert: vi.fn<(name: string, binding: SelectedCommandBinding) => void>(),
      onOpenChange: vi.fn(),
      mediaAvailable: false,
      onFilesSelected: vi.fn(),
      shiftTabEnabled: false,
      onShiftTabPreferenceChange: vi.fn(),
    },
  });
}

async function openTools() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
  const dialog = screen.getByRole('dialog', { name: 'Session tools' });
  return { dialog, user };
}

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

describe('ComposerTools accessibility parity', () => {
  it('strips aria-haspopup from the tools trigger', () => {
    renderTools();

    expect(screen.getByRole('button', { name: 'Mode and commands' })).not.toHaveAttribute(
      'aria-haspopup',
    );
  });

  it('renders the Session tools dialog with dismiss buttons', async () => {
    renderTools();
    const { dialog, user } = await openTools();

    expect(dialog).toBeInTheDocument();
    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' });
    expect(dismissButtons).toHaveLength(2);
    for (const dismissButton of dismissButtons) {
      expect(dismissButton).toHaveAttribute('tabindex', '-1');
    }

    await user.click(dismissButtons[0]);
    expect(screen.queryByRole('dialog', { name: 'Session tools' })).not.toBeInTheDocument();
  });

  it('focuses the dialog container before tabbing into its controls', async () => {
    renderTools();
    const { dialog, user } = await openTools();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

    expect(dialog).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(within(dialog).getByRole('checkbox')).toHaveFocus();
  });
});
