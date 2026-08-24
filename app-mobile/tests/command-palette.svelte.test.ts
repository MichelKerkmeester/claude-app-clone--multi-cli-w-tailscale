// ───────────────────────────────────────────────────────────────────
// MODULE: Command Palette Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────

// Ports app-mobile/tests/CommandPalette.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle — same roles, names, text, values,
// counts, ordering, and negative assertions.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import type { HostCommandCatalogState, ScopedCommandSnapshot } from '../src/shared/commands/commands.js';
import CommandPalette from '../src/pages/chat/chrome/command-palette.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // bits-ui positions Combobox content via floating-ui, which under jsdom
  // leaves it visibility:hidden (in the DOM but OUT of the a11y tree, empty
  // accessible name) unless the anchor reports a real box. Give every element
  // a real box (as any browser always has); restored by afterEach.
  const box = {
    width: 200, height: 44, top: 0, left: 0, right: 200, bottom: 44, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box);
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({
    length: 1,
    0: box,
    item: (i: number) => (i === 0 ? box : null),
    [Symbol.iterator]: function* () {
      yield box;
    },
  } as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  document.body.removeAttribute('style');
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. FIXTURES
// ───────────────────────────────────────────────────────────────────

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

function catalogState(commands: readonly CommandDescriptorDto[]): HostCommandCatalogState {
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

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function optionNames(): readonly (string | null)[] {
  return screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.command-name')?.textContent ?? null);
}

// Open the command listbox. The React oracle clicks the "Show commands" trigger;
// under jsdom the bits-ui Combobox trigger's click→input-focus chain doesn't fire, so
// the listbox would stay closed. We open the same listbox by focusing the input, which
// is behaviorally identical: the combobox opens on input focus (menuTrigger="focus"
// parity) and the trigger's only job is to focus the input.
async function openPalette(): Promise<void> {
  await userEvent.click(screen.getByRole('combobox'));
  await tick();
}

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  it('inserts the selected command with a scoped binding and never submits', async () => {
    const onInsert = vi.fn();
    render(CommandPalette, { props: { catalog: catalogState(COMMANDS), onInsert } });

    await openPalette();
    await userEvent.click(await screen.findByRole('option', { name: /plan/ }));

    expect(onInsert).toHaveBeenCalledWith('plan', {
      hostEpoch: 'epoch_web_001',
      sessionId: 'session_web_001',
      name: 'plan',
      sessionRevision: 2,
      catalogRevision: 3,
    });
  });

  it('filters locally through the shared ranking, exact name first', async () => {
    const onInsert = vi.fn();
    const commands = [
      { ...COMMANDS[0]!, name: 'plan-mode' },
      { ...COMMANDS[0]!, name: 'plan' },
      COMMANDS[1]!,
    ];
    render(CommandPalette, { props: { catalog: catalogState(commands), onInsert } });

    await openPalette();
    await userEvent.type(screen.getByRole('combobox'), 'plan');
    await tick();

    expect(optionNames()).toEqual(['/plan', '/plan-mode']);
  });

  it('never autocorrects a typo: an unmatched query shows the empty state', async () => {
    render(CommandPalette, { props: { catalog: catalogState(COMMANDS), onInsert: vi.fn() } });

    await openPalette();
    await userEvent.type(screen.getByRole('combobox'), 'plna');
    await tick();

    expect(screen.getByText('No commands')).toBeInTheDocument();
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByText(/^\//)).not.toBeInTheDocument();
  });

  it('keeps the host order with an empty query', async () => {
    render(CommandPalette, { props: { catalog: catalogState(COMMANDS), onInsert: vi.fn() } });

    await openPalette();
    await screen.findByRole('option', { name: /plan/ });

    expect(optionNames()).toEqual(['/plan', '/model']);
  });

  it('never inserts a disabled row', async () => {
    const onInsert = vi.fn();
    const commands: readonly CommandDescriptorDto[] = [
      { ...COMMANDS[0]!, enabled: false, disabledReason: 'Unavailable: demo' },
      COMMANDS[1]!,
    ];
    render(CommandPalette, { props: { catalog: catalogState(commands), onInsert } });

    await openPalette();
    await userEvent.click(await screen.findByRole('option', { name: /plan/ }));

    expect(onInsert).not.toHaveBeenCalled();
  });

  it('disables the input when authority is unavailable', () => {
    render(CommandPalette, { props: { catalog: catalogState(COMMANDS), onInsert: vi.fn(), isDisabled: true } });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('rows are text-only with no nested interactive descendants', async () => {
    render(CommandPalette, { props: { catalog: catalogState(COMMANDS), onInsert: vi.fn() } });
    await openPalette();
    await screen.findByRole('option', { name: /plan/ });
    for (const option of screen.getAllByRole('option')) {
      expect(option.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
      expect(option.querySelector('.command-name')?.textContent).toMatch(/^\/[a-z]+$/u);
    }
  });

  it('selecting a row is a local insertion request: no catalog reads and no transport', async () => {
    const catalog = catalogState(COMMANDS);
    const onInsert = vi.fn();
    render(CommandPalette, { props: { catalog, onInsert } });
    await openPalette();
    await userEvent.click(await screen.findByRole('option', { name: /plan/ }));
    expect(catalog.refresh).not.toHaveBeenCalled();
    expect(onInsert).toHaveBeenCalledTimes(1);
  });
});
