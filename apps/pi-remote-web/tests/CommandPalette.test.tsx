// ───────────────────────────────────────────────────────────────────
// MODULE: Command Palette Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import {
  type HostCommandCatalogState,
  type ScopedCommandSnapshot,
} from '../src/commands.js';
import { CommandPalette } from '../src/CommandPalette.js';

afterEach(cleanup);

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

function optionNames(): readonly (string | null)[] {
  return screen
    .getAllByRole('option')
    .map((option) => option.querySelector('.command-name')?.textContent ?? null);
}

describe('CommandPalette', () => {
  it('inserts the selected command with a scoped binding and never submits', async () => {
    const onInsert = vi.fn();
    render(<CommandPalette catalog={catalogState(COMMANDS)} onInsert={onInsert} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.click(screen.getByRole('option', { name: /plan/ }));

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
    render(<CommandPalette catalog={catalogState(commands)} onInsert={onInsert} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.type(screen.getByRole('combobox'), 'plan');

    expect(optionNames()).toEqual(['/plan', '/plan-mode']);
  });

  it('never autocorrects a typo: an unmatched query shows the empty state', async () => {
    render(<CommandPalette catalog={catalogState(COMMANDS)} onInsert={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.type(screen.getByRole('combobox'), 'plna');

    expect(screen.getByText('No commands')).toBeInTheDocument();
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByText(/^\//)).not.toBeInTheDocument();
  });

  it('keeps the host order with an empty query', async () => {
    render(<CommandPalette catalog={catalogState(COMMANDS)} onInsert={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));

    expect(optionNames()).toEqual(['/plan', '/model']);
  });

  it('never inserts a disabled row', async () => {
    const onInsert = vi.fn();
    const commands: readonly CommandDescriptorDto[] = [
      { ...COMMANDS[0]!, enabled: false, disabledReason: 'Unavailable: demo' },
      COMMANDS[1]!,
    ];
    render(<CommandPalette catalog={catalogState(commands)} onInsert={onInsert} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.click(screen.getByRole('option', { name: /plan/ }));

    expect(onInsert).not.toHaveBeenCalled();
  });

  it('disables the input when authority is unavailable', () => {
    render(<CommandPalette catalog={catalogState(COMMANDS)} onInsert={vi.fn()} isDisabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('rows are text-only with no nested interactive descendants', async () => {
    render(<CommandPalette catalog={catalogState(COMMANDS)} onInsert={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    for (const option of screen.getAllByRole('option')) {
      expect(option.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
      expect(option.querySelector('.command-name')?.textContent).toMatch(/^\/[a-z]+$/u);
    }
  });

  it('selecting a row is a local insertion request: no catalog reads and no transport', async () => {
    const catalog = catalogState(COMMANDS);
    const onInsert = vi.fn();
    render(<CommandPalette catalog={catalog} onInsert={onInsert} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.click(screen.getByRole('option', { name: /plan/ }));
    expect(catalog.refresh).not.toHaveBeenCalled();
    expect(onInsert).toHaveBeenCalledTimes(1);
  });
});
