// ───────────────────────────────────────────────────────────────────
// MODULE: Leave Plan Sheet Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/LeavePlanSheet.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
//
// The Svelte LeavePlanSheet is a bits-ui Dialog (Sheet/SheetContent) controlled
// by isOpen + onOpenChange, non-optimistic: sheetOpen is reset to the host
// isOpen after every onSheetOpenChange. onSwitchToBuild is the only host
// mutation path; Stay and every dismissal leave the confirmed Plan state
// untouched. The variant ('mode' | 'plan-ready') switches the destructive
// action copy between 'Switch to Build' and 'Leave without running'.
//
// NOTE: bits-ui Dialog.Content emits BOTH aria-label (our "Leave plan mode")
// and aria-labelledby (the Dialog.Title "Leave plan mode?"). Per the ARIA
// accessible-name algorithm aria-labelledby wins, so the dialog's computed
// name is "Leave plan mode?". The React oracle never queries the dialog by
// name (it queries the heading and buttons directly), so the port waits on
// the heading — which both confirms the dialog opened and matches the
// oracle's first assertion.

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LeavePlanSheet from '../src/pages/chat/chrome/leave-plan-sheet.svelte';

afterEach(() => {
  cleanup();
  // bits-ui BodyScrollLock restores body pointer-events on a deferred
  // setTimeout that outlives svelte-testing-library's synchronous cleanup()
  // and leaks `pointer-events: none` on <body> into the next test (breaks
  // later click tests). Clear it explicitly.
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

interface SheetOverrides {
  readonly variant?: 'mode' | 'plan-ready';
}

function renderSheet(overrides: SheetOverrides = {}) {
  const onOpenChange = vi.fn();
  const onSwitchToBuild = vi.fn();
  const onLeaveWithoutRunning = vi.fn();
  render(LeavePlanSheet, {
    props: {
      isOpen: true,
      onOpenChange,
      onSwitchToBuild,
      onLeaveWithoutRunning,
      // The Svelte component takes the element directly (not a ref object).
      triggerRef: null,
      ...overrides,
    },
  });
  return { onOpenChange, onSwitchToBuild, onLeaveWithoutRunning };
}

describe('LeavePlanSheet', () => {
  it('keeps the existing authority-expanding copy for a normal mode exit', async () => {
    renderSheet();
    const heading = await screen.findByRole('heading', { name: 'Leave plan mode?' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay in plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Build' })).toBeInTheDocument();
  });

  it('uses Leave without running for a retained plan-ready artifact', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet({ variant: 'plan-ready' });
    await screen.findByRole('heading', { name: 'Leave plan mode?' });
    await user.click(screen.getByRole('button', { name: 'Leave without running' }));
    expect(callbacks.onLeaveWithoutRunning).toHaveBeenCalledOnce();
    expect(callbacks.onSwitchToBuild).not.toHaveBeenCalled();
  });

  it('dismissal and Stay leave host mode untouched', async () => {
    const user = userEvent.setup();
    const callbacks = renderSheet();
    await screen.findByRole('heading', { name: 'Leave plan mode?' });
    await user.click(screen.getByRole('button', { name: 'Stay in plan' }));
    expect(callbacks.onOpenChange).toHaveBeenCalledWith(false);
    expect(callbacks.onSwitchToBuild).not.toHaveBeenCalled();
    await waitFor(() => expect(callbacks.onLeaveWithoutRunning).not.toHaveBeenCalled());
  });
});
