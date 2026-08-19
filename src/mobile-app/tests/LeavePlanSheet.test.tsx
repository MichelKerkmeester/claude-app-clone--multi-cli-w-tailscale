import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LeavePlanSheet } from '../src/LeavePlanSheet.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderSheet(overrides: Partial<React.ComponentProps<typeof LeavePlanSheet>> = {}) {
  const onOpenChange = vi.fn();
  const onSwitchToBuild = vi.fn();
  const onLeaveWithoutRunning = vi.fn();
  render(
    <LeavePlanSheet
      isOpen
      onOpenChange={onOpenChange}
      onSwitchToBuild={onSwitchToBuild}
      onLeaveWithoutRunning={onLeaveWithoutRunning}
      triggerRef={{ current: null }}
      {...overrides}
    />,
  );
  return { onOpenChange, onSwitchToBuild, onLeaveWithoutRunning };
}

describe('LeavePlanSheet', () => {
  it('keeps the existing authority-expanding copy for a normal mode exit', () => {
    renderSheet();
    expect(screen.getByRole('heading', { name: 'Leave plan mode?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay in plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Build' })).toBeInTheDocument();
  });

  it('uses Leave without running for a retained plan-ready artifact', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet({ variant: 'plan-ready' });
    await user.click(screen.getByRole('button', { name: 'Leave without running' }));
    expect(callbacks.onLeaveWithoutRunning).toHaveBeenCalledOnce();
    expect(callbacks.onSwitchToBuild).not.toHaveBeenCalled();
  });

  it('dismissal and Stay leave host mode untouched', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet();
    await user.click(screen.getByRole('button', { name: 'Stay in plan' }));
    expect(callbacks.onOpenChange).toHaveBeenCalledWith(false);
    expect(callbacks.onSwitchToBuild).not.toHaveBeenCalled();
    await waitFor(() => expect(callbacks.onLeaveWithoutRunning).not.toHaveBeenCalled());
  });
});
