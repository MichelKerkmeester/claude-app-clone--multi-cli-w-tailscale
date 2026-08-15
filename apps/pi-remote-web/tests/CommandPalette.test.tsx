// ───────────────────────────────────────────────────────────────────
// MODULE: Command Palette Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

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

describe('CommandPalette', () => {
  it('inserts the selected command into the draft and never submits', async () => {
    const onInsert = vi.fn();
    render(<CommandPalette commands={COMMANDS} onInsert={onInsert} />);

    await userEvent.click(screen.getByRole('button', { name: 'Show commands' }));
    await userEvent.click(screen.getByRole('option', { name: /plan/ }));

    expect(onInsert).toHaveBeenCalledWith('/plan ');
  });

  it('disables the input when authority is unavailable', () => {
    render(<CommandPalette commands={COMMANDS} onInsert={vi.fn()} isDisabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
