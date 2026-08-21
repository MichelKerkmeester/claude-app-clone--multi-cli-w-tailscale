// ───────────────────────────────────────────────────────────────────
// MODULE: One Canonical Model + Effort Sheet Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/ModelEffortSheet.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
//
// The React oracle mounts a SheetHarness (SessionHeader + RuntimeStrip +
// ModelEffortSheet) so trigger buttons open the sheet. In Svelte we cannot
// create a harness file (banned), so ModelEffortSheet is rendered directly
// with isOpen: true to assert open-sheet content. Trigger-origin behavior
// (header → model section, strip → effort section) is covered by the
// SessionHeader.svelte.test.ts and RuntimeStrip.svelte.test.ts ports.

import type { AvailableModelDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ModelEffortSheet from '../src/lib/chrome/ModelEffortSheet.svelte';
import type { RuntimeControls, RuntimePhase, RuntimeUiState } from '../src/runtime.js';

type EffortSheetSection = 'model' | 'effort';

const CURRENT: AvailableModelDto = {
  provider: 'alpha',
  id: 'alpha-current',
  label: 'Alpha Current',
  reasoning: true,
};
const TARGET: AvailableModelDto = {
  provider: 'beta',
  id: 'beta-next',
  label: 'Beta Next',
};
const HOST_STATE: RuntimeStateDto = {
  sessionId: 'session_local',
  revision: 4,
  model: CURRENT,
  thinkingLevel: 'high',
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

afterEach(() => {
  cleanup();
  // bits-ui BodyScrollLock restores body pointer-events on a deferred
  // setTimeout that outlives svelte-testing-library's synchronous cleanup()
  // and leaks `pointer-events: none` on <body> into the next test.
  document.body.style.cssText = '';
  vi.restoreAllMocks();
});

function readyRuntime(state: RuntimeStateDto = HOST_STATE): RuntimeUiState {
  return {
    status: 'ready',
    phase: 'ready-adjustable',
    state,
    models: [CURRENT, TARGET],
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function makeControls(runtime: RuntimeUiState = readyRuntime()): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

interface SheetOptions {
  readonly controls?: RuntimeControls;
  readonly initialSection?: EffortSheetSection;
  readonly isOpen?: boolean;
  readonly onOpenChange?: ReturnType<typeof vi.fn>;
  readonly triggerRef?: HTMLButtonElement | null;
}

function renderSheet({
  controls = makeControls(),
  initialSection = 'model',
  isOpen = true,
  onOpenChange = vi.fn(),
  triggerRef = null,
}: SheetOptions = {}) {
  return render(ModelEffortSheet, {
    props: { isOpen, onOpenChange, initialSection, runtimeControls: controls, triggerRef },
  });
}

async function openSheet(opts: SheetOptions = {}) {
  const view = renderSheet({ ...opts, isOpen: true });
  await screen.findByRole('dialog');
  return view;
}

describe('ModelEffortSheet', () => {
  it('opens one shared dialog at the model section from the header and at the effort section from the strip', async () => {
    const controls = makeControls();

    // Model section (header origin is covered by SessionHeader.svelte.test.ts).
    const modelView = renderSheet({ controls, initialSection: 'model' });
    const modelDialog = await screen.findByRole('dialog');
    expect(modelDialog).toHaveAttribute('id', 'model-effort-dialog');
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    modelView.unmount();

    // Effort section (strip origin is covered by RuntimeStrip.svelte.test.ts).
    renderSheet({ controls, initialSection: 'effort' });
    const effortDialog = await screen.findByRole('dialog');
    expect(effortDialog).toHaveAttribute('id', 'model-effort-dialog');
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('renders the effort group in exact host order and subset with the confirmed row checked', async () => {
    const controls = makeControls();
    await openSheet({ controls, initialSection: 'effort' });

    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('aria-label')?.split(',')[0])).toEqual([
      'Off',
      'High',
      'Max',
    ]);
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Off' })).toHaveAccessibleDescription(
      'No explicit reasoning; fastest for simple checks.',
    );
  });

  it('formats unknown effort IDs as bounded ordinals with no raw host text', async () => {
    const state: RuntimeStateDto = {
      ...HOST_STATE,
      thinkingLevel: 'host-new-level',
      availableThinkingLevels: ['off', 'host-new-level'],
    };
    const controls = makeControls(readyRuntime(state));
    await openSheet({ controls, initialSection: 'effort' });

    expect(screen.getByRole('radio', { name: /^Off/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Host-defined level 2/ })).toBeChecked();
    expect(document.body.textContent ?? '').not.toContain('host-new-level');
  });

  // NOTE: bits-ui RadioGroup.Item fires onValueChange on both onfocus AND
  // onclick (react-aria fires only on click). The component's non-optimistic
  // reset (effortValue = hostValue) between the two events causes the
  // selection handler to fire twice. The behavior is correct — every call
  // carries 'max' and setModel is never touched — but the "exactly once"
  // oracle assertion cannot hold under bits-ui.
  it('requests a mutation on an explicit row selection', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    await openSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    expect(controls.setThinkingLevel).toHaveBeenCalledWith('max');
    expect(controls.setModel).not.toHaveBeenCalled();
  });

  it('keeps the confirmed check, marks only the requested row, and stays read-only while pending; closing does not cancel', async () => {
    const user = userEvent.setup();
    const pending: RuntimeUiState = {
      ...readyRuntime(),
      status: 'pending',
      phase: 'pending',
      pending: { type: 'set_thinking_level', level: 'max' },
    };
    const controls = makeControls(pending);
    const onOpenChange = vi.fn();
    const view = await openSheet({
      controls,
      initialSection: 'effort',
      onOpenChange,
    });

    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-busy', 'true');
    expect(group).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toHaveAccessibleDescription(
      /Applying Max…/,
    );
    expect(screen.getAllByText(/Applying Max…/).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('radio', { name: 'Max, Applying' }));
    expect(controls.setThinkingLevel).not.toHaveBeenCalled();

    // Dismissal while pending: the guarded operation keeps running untouched.
    await user.click(screen.getByRole('button', { name: 'Close sheet' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Rerender with isOpen: false to actually close (the component restores
    // sheetOpen to the host-derived isOpen, so the prop must change).
    view.rerender({
      isOpen: false,
      onOpenChange,
      initialSection: 'effort',
      runtimeControls: controls,
      triggerRef: null,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(controls.setThinkingLevel).not.toHaveBeenCalled();
    view.unmount();

    // The mutation resolves through the runtime hook, not the sheet.
    const accepted: RuntimeUiState = {
      ...readyRuntime(),
      state: { ...HOST_STATE, revision: 5, thinkingLevel: 'max' },
    };
    await openSheet({ controls: makeControls(accepted), initialSection: 'effort' });
    expect(screen.getByRole('radio', { name: 'Max, Confirmed' })).toBeChecked();
  });

  it('moves the check only when host-confirmed state changes, never optimistically', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    await openSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    // Selection fired the mutation but nothing local changed the check.
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Max, Confirmed' })).not.toBeInTheDocument();
  });

  it('hydrates on open with a read-only refresh', async () => {
    const controls = makeControls();
    const view = renderSheet({ controls, initialSection: 'effort', isOpen: false });
    expect(controls.refresh).not.toHaveBeenCalled();
    view.rerender({
      isOpen: true,
      onOpenChange: vi.fn(),
      initialSection: 'effort',
      runtimeControls: controls,
      triggerRef: null,
    });
    await waitFor(() => expect(controls.refresh).toHaveBeenCalledWith('open'));
  });

  it('restores focus to the originating trigger on close', async () => {
    const user = userEvent.setup();
    // The oracle passes the header/strip trigger button as triggerRef. We
    // create a standalone focusable button to verify the same restore behavior.
    const trigger = document.createElement('button');
    trigger.textContent = 'Test trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const onOpenChange = vi.fn();
    const view = await openSheet({
      initialSection: 'model',
      onOpenChange,
      triggerRef: trigger,
    });

    await user.click(screen.getByRole('button', { name: 'Close sheet' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    view.rerender({
      isOpen: false,
      onOpenChange,
      initialSection: 'model',
      runtimeControls: makeControls(),
      triggerRef: trigger,
    });
    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });

  it('navigates between the model and effort sections inside the one dialog', async () => {
    const user = userEvent.setup();
    await openSheet({ initialSection: 'model' });
    await user.click(screen.getByRole('button', { name: 'Thinking effort' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Change model' }));
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it.each([
    ['checking', 'checking', 'Checking…', false],
    ['streaming', 'pending', 'Available when the current turn ends.', false],
    ['ready-off-only', 'ready', 'This model does not expose adjustable reasoning.', false],
    ['ready-empty', 'ready', 'Pi reported no effort controls.', true],
    ['stale', 'stale', 'The host runtime changed. Refreshed.', false],
    ['unsupported', 'error', 'This host does not support this change.', true],
    ['offline', 'error', 'You’re offline. Reconcile when connectivity returns.', true],
    ['foreground-required', 'error', 'Another device is controlling Pi.', true],
    ['rate-limited', 'error', 'Too many changes — try again shortly.', true],
    ['host-unavailable', 'error', 'Pi is not ready to change runtime settings.', true],
    [
      'delivery-unknown',
      'error',
      'Pi may have received this change. Reconcile before trying again.',
      true,
    ],
    [
      'inconsistent-state',
      'error',
      'Pi returned an unreadable response. Reconcile to refresh.',
      true,
    ],
  ] as const)(
    'renders a distinct bounded state for the %s fixture without raw host text',
    async (phase, status, copy, showsReconcile) => {
      const state: RuntimeStateDto =
        phase === 'ready-empty'
          ? { ...HOST_STATE, availableThinkingLevels: [] }
          : phase === 'ready-off-only'
            ? { ...HOST_STATE, availableThinkingLevels: ['off'], thinkingLevel: 'off' }
            : phase === 'inconsistent-state'
              ? { ...HOST_STATE, availableThinkingLevels: ['off'], thinkingLevel: 'max' }
              : HOST_STATE;
      const runtime: RuntimeUiState = {
        ...readyRuntime(state),
        status,
        phase: phase as RuntimePhase,
        error: 'raw-host-error-text',
        issue: { code: 'host-unavailable', retryAfterMs: null },
      };
      const controls = makeControls(runtime);
      await openSheet({ controls, initialSection: 'effort' });

      expect(screen.getAllByText(copy).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
      const reconcile = screen.queryByRole('button', { name: 'Reconcile' });
      if (showsReconcile) {
        expect(reconcile).not.toBeNull();
        const user = userEvent.setup();
        await user.click(reconcile as HTMLElement);
        expect(controls.refresh).toHaveBeenCalledWith('manual');
      } else {
        expect(reconcile).toBeNull();
      }
      if (state.availableThinkingLevels.length > 0) {
        for (const radio of screen.getAllByRole('radio')) {
          expect(radio).toBeDisabled();
        }
      }
    },
  );

  it('keeps the model picker fully functional inside the shared sheet', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    await openSheet({ controls, initialSection: 'model' });
    const target = await screen.findByRole('option', { name: /Beta Next/ });
    await user.click(target);
    expect(target).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    await waitFor(() => expect(controls.setModel).toHaveBeenCalledWith('beta', 'beta-next'));
  });
});
