import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeModelCatalogDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';
import { INITIAL_RUNTIME_STATE, runtimeReducer, type RuntimeUiState } from '../src/shared/state/runtime.js';
import type { HostCommandCatalogState, ScopedCommandSnapshot } from '../src/shared/commands/commands.js';
import CommandPalette from '../src/pages/chat/chrome/command-palette.svelte';
import PlanModeButton from '../src/pages/chat/chrome/button-plan-mode.svelte';
import SessionComposerHarness from './support/SessionComposerHarness.svelte';

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

const COMMANDS: readonly CommandDescriptorDto[] = [
  {
    name: 'plan',
    description: 'Toggle plan mode',
    source: 'extension',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
  },
  {
    name: 'model',
    description: 'Pick a model',
    source: 'prompt',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
  },
];

let backgroundProbe: HTMLButtonElement | null = null;

function readyWith(state: RuntimeStateDto): RuntimeUiState {
  return runtimeReducer(INITIAL_RUNTIME_STATE, { type: 'hydrated', state, models: MODELS });
}

function catalogState(commands: readonly CommandDescriptorDto[] = COMMANDS): HostCommandCatalogState {
  const snapshot: ScopedCommandSnapshot = {
    hostEpoch: 'epoch_web_001',
    sessionId: 'session_web_001',
    sessionRevision: 2,
    catalogRevision: 3,
    commands,
    fetchedAt: Date.now(),
  };
  return { status: 'ready', snapshot, commands, refresh: vi.fn() };
}

function renderMenu() {
  const onOpenChange = vi.fn();
  let lastOpenFlag = false;
  onOpenChange.mockImplementation((open: boolean) => {
    lastOpenFlag = open;
  });
  const baseProps = {
    runtime: readyWith(HOST_STATE),
    connection: 'live',
    isOpen: false,
    onOpenChange,
    onSelectPlan: vi.fn(),
    onSelectBuild: vi.fn(),
    buttonRef: null,
  };
  const view = render(PlanModeButton, { props: baseProps });
  return {
    async open(): Promise<void> {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Agent mode/ }));
      await view.rerender({ ...baseProps, isOpen: lastOpenFlag });
      await screen.findByRole('menu', { name: /Agent mode/ });
    },
    async close(): Promise<void> {
      await view.rerender({ ...baseProps, isOpen: lastOpenFlag });
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    },
  };
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
  backgroundProbe?.remove();
  backgroundProbe = null;
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

describe('overlay aria-hidden outside behavior', () => {
  it('hides the background accessibility tree while the menu is open and restores it on close', async () => {
    const bg = document.createElement('button');
    bg.type = 'button';
    bg.textContent = 'background-probe';
    document.body.append(bg);
    backgroundProbe = bg;
    expect(screen.getByRole('button', { name: 'background-probe' })).toBeInTheDocument();

    const user = userEvent.setup();
    const menu = renderMenu();
    await menu.open();
    expect(screen.queryByRole('button', { name: 'background-probe' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await menu.close();
    expect(await screen.findByRole('button', { name: 'background-probe' })).toBeInTheDocument();
  });

  it('hides the background accessibility tree while the tools popover is open and restores it on close', async () => {
    const bg = document.createElement('button');
    bg.type = 'button';
    bg.textContent = 'background-probe';
    document.body.append(bg);
    backgroundProbe = bg;
    expect(screen.getByRole('button', { name: 'background-probe' })).toBeInTheDocument();

    const user = userEvent.setup();
    render(SessionComposerHarness, {
      props: {
        catalog: catalogState(),
        sendPrompt: vi.fn(),
        sendSlashDraft: vi.fn(),
        onInsertCommand: vi.fn(),
        status: 'idle',
        canSubmit: true,
        binding: null,
        slashSubmitting: false,
        runtimeAuthority: true,
        runtimeRunning: false,
        initialPrompt: '',
        mediaCapability: null,
        modelCanViewPhotos: true,
        localFiles: undefined,
      },
    });
    await user.click(screen.getByRole('button', { name: 'Mode and commands' }));
    await screen.findByRole('dialog', { name: 'Session tools' });
    expect(screen.queryByRole('button', { name: 'background-probe' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    const popover = document.querySelector<HTMLElement>('[data-popover-content]');
    if (popover !== null) fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Session tools' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole('button', { name: 'background-probe' })).toBeInTheDocument();
  });

  it('hides the background accessibility tree while the command palette is open and restores it on close', async () => {
    const bg = document.createElement('button');
    bg.type = 'button';
    bg.textContent = 'background-probe';
    document.body.append(bg);
    backgroundProbe = bg;
    expect(screen.getByRole('button', { name: 'background-probe' })).toBeInTheDocument();

    const user = userEvent.setup();
    render(CommandPalette, { props: { catalog: catalogState(), onInsert: vi.fn() } });
    await user.click(screen.getByRole('combobox'));
    await tick();
    await screen.findByRole('listbox');
    expect(screen.queryByRole('button', { name: 'background-probe' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'background-probe' })).toBeInTheDocument();
  });
});
