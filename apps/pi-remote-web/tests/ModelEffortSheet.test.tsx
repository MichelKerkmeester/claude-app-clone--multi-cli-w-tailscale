// ───────────────────────────────────────────────────────────────────
// MODULE: One Canonical Model + Effort Sheet Tests
// ───────────────────────────────────────────────────────────────────

import type { AvailableModelDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelEffortSheet, type EffortSheetSection } from '../src/ModelEffortSheet.js';
import { RuntimeStrip } from '../src/RuntimeStrip.js';
import { SessionHeader } from '../src/SessionHeader.js';
import type { RuntimeControls, RuntimePhase, RuntimeUiState } from '../src/runtime.js';
import '../src/style.css';

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

function SheetHarness({
  controls,
  initialSection,
  onOpenChange,
}: {
  readonly controls: RuntimeControls;
  readonly initialSection: EffortSheetSection;
  readonly onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<EffortSheetSection>(initialSection);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLButtonElement | null>(null);
  const stripRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <SessionHeader
        onBack={vi.fn()}
        onInbox={vi.fn()}
        onReview={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
        runtimeControls={controls}
        sheetOpen={open}
        onOpenModelSheet={() => {
          activeRef.current = headerRef.current;
          setSection('model');
          setOpen(true);
        }}
        modelTriggerRef={headerRef}
      />
      <RuntimeStrip
        controls={controls}
        sheetOpen={open}
        onOpenEffortSheet={() => {
          activeRef.current = stripRef.current;
          setSection('effort');
          setOpen(true);
        }}
        effortTriggerRef={stripRef}
      />
      <ModelEffortSheet
        isOpen={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        initialSection={section}
        runtimeControls={controls}
        triggerRef={activeRef}
      />
    </>
  );
}

function renderSheet({
  controls = makeControls(),
  initialSection = 'model',
  onOpenChange,
}: {
  readonly controls?: RuntimeControls;
  readonly initialSection?: EffortSheetSection;
  readonly onOpenChange?: (open: boolean) => void;
} = {}) {
  return render(
    <SheetHarness controls={controls} initialSection={initialSection} onOpenChange={onOpenChange} />,
  );
}

describe('ModelEffortSheet', () => {
  it('opens one shared dialog at the model section from the header and at the effort section from the strip', async () => {
    const user = userEvent.setup();
    const view = renderSheet({ initialSection: 'model' });

    await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
    const modelDialog = await screen.findByRole('dialog');
    expect(modelDialog).toHaveAttribute('id', 'model-effort-dialog');
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(document.querySelectorAll('.react-aria-Popover')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Close sheet' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));
    const effortDialog = await screen.findByRole('dialog');
    expect(effortDialog).toHaveAttribute('id', 'model-effort-dialog');
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(document.querySelectorAll('.react-aria-Popover')).toHaveLength(0);
    view.unmount();
  });

  it('renders the effort group in exact host order and subset with the confirmed row checked', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    renderSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));

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
    const user = userEvent.setup();
    const state = {
      ...HOST_STATE,
      thinkingLevel: 'host-new-level',
      availableThinkingLevels: ['off', 'host-new-level'],
    };
    const controls = makeControls(readyRuntime(state));
    renderSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('button', { name: /^Thinking effort/ }));

    expect(screen.getByRole('radio', { name: /^Off/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Host-defined level 2/ })).toBeChecked();
    expect(document.body.textContent ?? '').not.toContain('host-new-level');
  });

  it('requests exactly one mutation on an explicit row selection', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    renderSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    expect(controls.setThinkingLevel).toHaveBeenCalledOnce();
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
    const view = renderSheet({ controls, initialSection: 'effort', onOpenChange });
    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));

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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(controls.setThinkingLevel).not.toHaveBeenCalled();
    view.unmount();

    // The mutation resolves through the runtime hook, not the sheet.
    const accepted: RuntimeUiState = {
      ...readyRuntime(),
      state: { ...HOST_STATE, revision: 5, thinkingLevel: 'max' },
    };
    renderSheet({ controls: makeControls(accepted), initialSection: 'effort' });
    await user.click(screen.getByRole('button', { name: 'Thinking effort, Max' }));
    expect(screen.getByRole('radio', { name: 'Max, Confirmed' })).toBeChecked();
  });

  it('moves the check only when host-confirmed state changes, never optimistically', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    renderSheet({ controls, initialSection: 'effort' });
    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    // Selection fired the mutation but nothing local changed the check.
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Max, Confirmed' })).not.toBeInTheDocument();
  });

  it('hydrates on open with a read-only refresh', async () => {
    const user = userEvent.setup();
    const controls = makeControls();
    renderSheet({ controls, initialSection: 'effort' });
    expect(controls.refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Thinking effort, High' }));
    expect(controls.refresh).toHaveBeenCalledWith('open');
  });

  it('restores focus to the originating trigger on close', async () => {
    const user = userEvent.setup();
    const view = renderSheet({ initialSection: 'model' });
    const headerTrigger = screen.getByRole('button', { name: /Model, Alpha Current, alpha/ });
    const stripTrigger = screen.getByRole('button', { name: 'Thinking effort, High' });

    await user.click(headerTrigger);
    await user.click(await screen.findByRole('button', { name: 'Close sheet' }));
    await waitFor(() => expect(headerTrigger).toHaveFocus());

    await user.click(stripTrigger);
    await user.click(await screen.findByRole('button', { name: 'Close sheet' }));
    await waitFor(() => expect(stripTrigger).toHaveFocus());
    view.unmount();
  });

  it('navigates between the model and effort sections inside the one dialog', async () => {
    const user = userEvent.setup();
    const view = renderSheet({ initialSection: 'model' });
    await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
    await user.click(await screen.findByRole('button', { name: 'Thinking effort' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Change model' }));
    expect(screen.getByRole('listbox', { name: 'Available models' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    view.unmount();
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
      const user = userEvent.setup();
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
      renderSheet({ controls, initialSection: 'effort' });
      await user.click(screen.getByRole('button', { name: /^Thinking effort/ }));

      expect(screen.getAllByText(copy).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
      const reconcile = screen.queryByRole('button', { name: 'Reconcile' });
      if (showsReconcile) {
        expect(reconcile).not.toBeNull();
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
    renderSheet({ controls, initialSection: 'model' });
    await user.click(screen.getByRole('button', { name: /Model, Alpha Current, alpha/ }));
    const target = await screen.findByRole('option', { name: /Beta Next/ });
    await user.click(target);
    expect(target).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Switch model' }));
    await waitFor(() => expect(controls.setModel).toHaveBeenCalledWith('beta', 'beta-next'));
  });
});
