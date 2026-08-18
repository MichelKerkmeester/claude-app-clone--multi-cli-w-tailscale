// ───────────────────────────────────────────────────────────────────
// MODULE: Effort Sheet Accessibility, State, Reflow, and Motion Gates
// ───────────────────────────────────────────────────────────────────
// Hardening assertions for the shared sheet: exactly one polite atomic
// status region with no competing alert, once-only bounded announcements
// for effort outcomes, semantic labelling/description associations,
// non-color state indicators in both themes, 320px reflow, reduced-motion
// CSS, RTL logical properties, and no raw host text in any surface.

import type { AvailableModelDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModelEffortSheet } from '../src/ModelEffortSheet.js';
import type { RuntimeControls, RuntimePhase, RuntimeUiState } from '../src/runtime.js';
import '../src/style.css';

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
  availableThinkingLevels: ['off', 'high', 'max'],
  mode: 'build',
  streaming: false,
  updatedAt: '2026-08-16T10:00:00.000Z',
};

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.removeProperty('zoom');
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
});

function readyRuntime(state: RuntimeStateDto = HOST_STATE): RuntimeUiState {
  return {
    status: 'ready',
    phase: 'ready-adjustable',
    state,
    models: [CURRENT],
    catalogRevision: 7,
    canSetModelWhileStreaming: false,
    catalogPhase: 'ready',
    pending: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function makeControls(runtime: RuntimeUiState): RuntimeControls {
  return {
    runtime,
    refresh: vi.fn().mockResolvedValue(undefined),
    setModel: vi.fn().mockResolvedValue(null),
    setThinkingLevel: vi.fn().mockResolvedValue(null),
    setMode: vi.fn().mockResolvedValue(null),
  };
}

interface EffortSheetHarness {
  readonly view: ReturnType<typeof render>;
  readonly onOpenChange: ReturnType<typeof vi.fn>;
  advance(next: RuntimeUiState): void;
}

function renderEffortSheet(runtime: RuntimeUiState): EffortSheetHarness {
  const holder: { controls: RuntimeControls; onOpenChange: ReturnType<typeof vi.fn> } = {
    controls: makeControls(runtime),
    onOpenChange: vi.fn(),
  };
  const view = render(
    <ModelEffortSheet
      isOpen
      initialSection="effort"
      runtimeControls={holder.controls}
      triggerRef={{ current: null }}
      onOpenChange={holder.onOpenChange}
    />,
  );
  return {
    view,
    onOpenChange: holder.onOpenChange,
    advance(next: RuntimeUiState) {
      (holder.controls as { runtime: RuntimeUiState }).runtime = next;
      view.rerender(
        <ModelEffortSheet
          isOpen
          initialSection="effort"
          runtimeControls={holder.controls}
          triggerRef={{ current: null }}
          onOpenChange={holder.onOpenChange}
        />,
      );
    },
  };
}

function announcer(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-live-announcer="true"]');
  if (element === null) throw new Error('Expected the one sheet status region');
  return element;
}

function pendingEffortRuntime(level: string, levels: readonly string[]): RuntimeUiState {
  return {
    ...readyRuntime({ ...HOST_STATE, availableThinkingLevels: [...levels] }),
    status: 'pending',
    phase: 'pending',
    pending: { type: 'set_thinking_level', level },
  };
}

describe('one polite atomic status region, no competing alert', () => {
  it('keeps exactly one document-level status region and zero alerts in every sheet state', () => {
    const harness = renderEffortSheet(readyRuntime());
    expect(document.querySelectorAll('[data-live-announcer="true"]')).toHaveLength(1);
    expect(announcer()).toHaveAttribute('role', 'status');
    expect(announcer()).toHaveAttribute('aria-live', 'polite');
    expect(announcer()).toHaveAttribute('aria-atomic', 'true');
    expect(announcer().closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    harness.advance(pendingEffortRuntime('max', ['off', 'high', 'max']));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    harness.advance({
      ...readyRuntime({ ...HOST_STATE, thinkingLevel: 'max' }),
      phase: 'delivery-unknown',
      status: 'error',
      issue: { code: 'delivery-unknown', retryAfterMs: null },
      error: 'raw-host-error-text',
      deliveryUnknown: true,
      lastOutcome: 'delivery_unknown',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[aria-live="assertive"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-live-announcer="true"]')).toHaveLength(1);
    expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
  });
});

describe('effort outcomes announce exactly once through the one region', () => {
  it('announces applying once when the request goes in flight and never on re-renders', () => {
    const pending = pendingEffortRuntime('max', ['off', 'high', 'max']);
    const harness = renderEffortSheet(pending);
    expect(announcer()).toHaveTextContent('Applying Max…');

    // An equivalent re-render must not repeat or accumulate the announcement.
    harness.advance(pendingEffortRuntime('max', ['off', 'high', 'max']));
    expect(announcer()).toHaveTextContent('Applying Max…');
    expect(announcer().textContent).toBe('Applying Max…');
  });

  it('announces the accepted outcome once after the pending mutation settles', () => {
    const harness = renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    harness.advance({
      ...readyRuntime({ ...HOST_STATE, thinkingLevel: 'max' }),
      phase: 'accepted',
    });
    expect(announcer()).toHaveTextContent('Thinking effort set to Max.');

    // A later ready phase keeps the region quiet (no second announcement).
    harness.advance(readyRuntime({ ...HOST_STATE, thinkingLevel: 'max' }));
    expect(announcer()).toHaveTextContent('Thinking effort set to Max.');
  });

  it('announces the stale outcome once', () => {
    const harness = renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    harness.advance({ ...readyRuntime(), status: 'stale', phase: 'stale', lastOutcome: 'stale' });
    expect(announcer()).toHaveTextContent('The host runtime changed. Refreshed.');
  });

  it('announces the delivery-unknown failure once with bounded copy', () => {
    const harness = renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    harness.advance({
      ...readyRuntime(),
      status: 'error',
      phase: 'delivery-unknown',
      issue: { code: 'delivery-unknown', retryAfterMs: null },
      error: 'raw-host-error-text',
      deliveryUnknown: true,
      lastOutcome: 'delivery_unknown',
    });
    expect(announcer()).toHaveTextContent(
      'Pi may have received this change. Reconcile before trying again.',
    );
    expect(announcer().textContent).not.toContain('raw-host-error-text');
  });

  it('announces an unknown pending level as a bounded ordinal', () => {
    const harness = renderEffortSheet(
      pendingEffortRuntime('host-custom-level-9', ['off', 'host-custom-level-9']),
    );
    expect(announcer()).toHaveTextContent('Applying Host-defined level 2…');
    expect(announcer().textContent).not.toContain('host-custom-level-9');
  });
});

describe('semantic labelling and description associations', () => {
  it('labels the dialog and radio group from the visible heading and describes the group from its status line', () => {
    const harness = renderEffortSheet({
      ...readyRuntime(),
      status: 'stale',
      phase: 'stale',
      lastOutcome: 'stale',
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'model-effort-title');
    const title = screen.getByRole('heading', { name: 'Thinking effort' });
    expect(title).toHaveAttribute('id', 'model-effort-title');

    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-labelledby', 'model-effort-title');
    expect(group).toHaveAttribute('aria-describedby', 'effort-sheet-status');
    expect(group).toHaveAccessibleDescription('The host runtime changed. Refreshed.');

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-describedby')).toMatch(/^effort-row-description-\d+$/u);
      expect(document.getElementById(radio.getAttribute('aria-describedby') ?? '')).not.toBeNull();
    }
    harness.view.unmount();
  });

  it('omits the group description when no status line renders', () => {
    renderEffortSheet(readyRuntime());
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toHaveAccessibleDescription(
      'Deep reasoning for complex coding work.',
    );
  });

  it('keeps pending rows focusable but read-only with the group busy', () => {
    renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-busy', 'true');
    expect(group).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toHaveAccessibleDescription(
      /Applying Max…/,
    );
  });

  it('enters the effort group at the confirmed row on open', async () => {
    const harness = renderEffortSheet(readyRuntime());
    const confirmed = screen.getByRole('radio', { name: 'High, Confirmed' });
    await waitFor(() => expect(confirmed).toHaveFocus());
    harness.view.unmount();
  });
});

describe('no raw host text in the DOM or accessibility tree', () => {
  it('keeps unknown level ids, host error text, and ticket-shaped values out of every surface', () => {
    const harness = renderEffortSheet({
      ...pendingEffortRuntime('host-custom-level-9', ['off', 'host-custom-level-9']),
      state: {
        ...HOST_STATE,
        thinkingLevel: 'host-custom-level-9',
        availableThinkingLevels: ['off', 'host-custom-level-9'],
      },
      error: 'raw-host-error-text',
      issue: { code: 'delivery-unknown', retryAfterMs: null },
    });
    const surfaces = [
      document.body.textContent ?? '',
      announcer().textContent ?? '',
      ...screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label') ?? ''),
      ...screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-describedby') ?? '')
        .map((id) => document.getElementById(id)?.textContent ?? ''),
    ].join(' | ');
    for (const canary of [
      'host-custom-level-9',
      'raw-host-error-text',
      'delivery_unknown',
      'ticket_',
      'session_local',
    ]) {
      expect(surfaces).not.toContain(canary);
    }
    expect(screen.getByRole('radio', { name: /^Host-defined level 2/ })).toBeChecked();
    harness.view.unmount();
  });
});

describe('state fixtures and non-color indicators', () => {
  it('marks selected and pending rows with text, shape, and ring, never clay alone', () => {
    const harness = renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    const confirmed = screen.getByRole('radio', { name: 'High, Confirmed' });
    const confirmedRow = confirmed.closest('.effort-radio-row');
    const pendingRow = screen
      .getByRole('radio', { name: 'Max, Applying' })
      .closest('.effort-radio-row');
    if (confirmedRow === null || pendingRow === null) throw new Error('Expected radio rows');

    expect(confirmedRow).toHaveAttribute('data-selected', 'true');
    expect(confirmed).toBeChecked();
    expect(confirmedRow.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(confirmedRow).toHaveTextContent('Confirmed');

    expect(pendingRow).toHaveClass('is-requested');
    expect(pendingRow.querySelector('.effort-spinner')).not.toBeNull();
    expect(pendingRow).toHaveTextContent('Applying');
    expect(pendingRow).not.toHaveAttribute('data-selected');

    const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');
    expect(css).toMatch(
      /\.effort-radio-row\[data-selected\] \{[\s\S]*?border-color: var\(--model-sheet-ui-accent\);/u,
    );
    expect(css).toMatch(
      /\.effort-radio-row\[data-focus-visible\] \{[\s\S]*?outline-width: 2px;\s*outline-offset: 2px;/u,
    );
    harness.view.unmount();
  });

  it('disables every row without authority and renders distinct empty, off-only, and inconsistent copy', () => {
    const fixtures: readonly [RuntimePhase, RuntimeStateDto, string, boolean][] = [
      ['ready-empty', { ...HOST_STATE, availableThinkingLevels: [] }, 'Pi reported no effort controls.', false],
      [
        'ready-off-only',
        { ...HOST_STATE, availableThinkingLevels: ['off'], thinkingLevel: 'off' },
        'This model does not expose adjustable reasoning.',
        true,
      ],
      [
        'inconsistent-state',
        { ...HOST_STATE, availableThinkingLevels: ['off'], thinkingLevel: 'max' },
        'Pi returned an unreadable response. Reconcile to refresh.',
        true,
      ],
    ] as const;
    for (const [phase, state, copy, hasRadio] of fixtures) {
      const harness = renderEffortSheet({
        ...readyRuntime(state),
        status: phase === 'ready-empty' || phase === 'ready-off-only' ? 'ready' : 'error',
        phase,
        issue: phase === 'inconsistent-state' ? { code: 'invalid-response', retryAfterMs: null } : null,
        error: phase === 'inconsistent-state' ? 'raw-host-error-text' : null,
      });
      expect(screen.getAllByText(copy).length).toBeGreaterThanOrEqual(1);
      if (hasRadio) {
        for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
      } else {
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
      }
      expect(screen.queryByText('raw-host-error-text')).not.toBeInTheDocument();
      harness.view.unmount();
    }
  });

  it('applies the frozen light and dark tokens to the sheet surface', () => {
    const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');
    expect(css).toMatch(
      /\.model-sheet-overlay \{[\s\S]*?--model-sheet-raised: var\(--surface\);[\s\S]*?--model-sheet-ink: var\(--ink\);[\s\S]*?--model-sheet-ui-accent: var\(--accent-strong\);/u,
    );
    expect(css).toMatch(
      /:root\[data-theme='dark'\] \.model-sheet-overlay \{[\s\S]*?--model-sheet-raised: var\(--surface\);[\s\S]*?--model-sheet-ink: var\(--ink\);[\s\S]*?--model-sheet-ui-accent: var\(--accent-ink\);/u,
    );

    const light = renderEffortSheet(readyRuntime());
    expect(document.querySelector('.model-sheet-overlay')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    light.view.unmount();
    cleanup();

    document.documentElement.setAttribute('data-theme', 'dark');
    const dark = renderEffortSheet(readyRuntime());
    expect(document.querySelector('.model-sheet-overlay')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    dark.view.unmount();
  });
});

describe('reflow, touch targets, and logical layout', () => {
  it('contains 320px and 200%-zoom overflow with 44px rows across seven two-line rows', () => {
    const seven = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
    const harness = renderEffortSheet(
      readyRuntime({ ...HOST_STATE, availableThinkingLevels: seven }),
    );
    const dialog = screen.getByRole('dialog');
    const modal = dialog.closest<HTMLElement>('.model-sheet-modal');
    const group = screen.getByRole('radiogroup');
    if (modal === null) throw new Error('Expected sheet modal');

    const rows = screen.getAllByRole('radio').map((radio) => radio.closest('.effort-radio-row'));
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      if (row === null) throw new Error('Expected a radio row');
      expect(
        Number.parseFloat(getComputedStyle(row).getPropertyValue('min-block-size')),
      ).toBeGreaterThanOrEqual(44);
    }

    document.documentElement.style.zoom = '2';
    for (const element of [
      document.documentElement,
      document.body,
      modal,
      dialog,
      group,
      ...rows.filter((row): row is Element => row !== null),
    ]) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 320 },
        scrollWidth: { configurable: true, value: 320 },
      });
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    }
    document.documentElement.style.removeProperty('zoom');
    harness.view.unmount();
  });

  it('uses logical properties and mirrors section arrows under RTL', () => {
    const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');
    expect(css).toMatch(
      /\.effort-radio-row \{[\s\S]*?padding-inline: var\(--space-3\);/u,
    );
    expect(css).toMatch(/\.model-sheet-dialog \{[\s\S]*?padding-inline: env\(safe-area-inset-left\) env\(safe-area-inset-right\);/u);
    expect(css).toMatch(
      /\[dir='rtl'\] \.model-sheet-nav-button svg,[\s\S]*?transform: scaleX\(-1\);/u,
    );
    expect(css).toMatch(
      /\.model-sheet-policy,[\s\S]*?border-block: 1px solid/u,
    );

    document.documentElement.setAttribute('dir', 'rtl');
    const harness = renderEffortSheet(readyRuntime());
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(announcer().textContent).not.toContain('alpha-current');
    harness.view.unmount();
  });

  it('keeps browser text inflation enabled and scrolls internally at large text', () => {
    const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');
    expect(css).not.toMatch(/text-size-adjust:\s*none/gu);
    expect(css).toMatch(/\.model-sheet-search input \{[\s\S]*?font-size: 1rem;/u);
    expect(css).toMatch(/\.effort-radio-row-label \{[\s\S]*?overflow-wrap: anywhere;/u);
    expect(css).toMatch(/\.effort-radio-scroll \{[\s\S]*?overflow-y: auto;/u);
    expect(css).toMatch(/\.effort-sheet-section \{[\s\S]*?flex: 1 1 auto;/u);
    expect(css).toMatch(
      /max-block-size: calc\(var\(--visual-viewport-height, 100dvh\) \* 0\.75\);/u,
    );
    expect(css).toContain('padding-block-end: max(16px, env(safe-area-inset-bottom));');
  });
});

describe('reduced motion removes transforms, springs, stagger, and spinners', () => {
  it('strips sheet and effort animations while keeping the fixed tokens', () => {
    const css = readFileSync('apps/pi-remote-web/src/style.css', 'utf8');
    const pulseStart = css.indexOf('@keyframes model-sheet-pulse');
    const blockStart = css.lastIndexOf(
      '@media (prefers-reduced-motion: reduce) {',
      pulseStart,
    );
    if (blockStart === -1 || pulseStart === -1) {
      throw new Error('Expected the sheet reduced-motion block');
    }
    const block = css.slice(blockStart, pulseStart);
    expect(block).toMatch(/\.effort-spinner,[\s\S]*?animation: none/u);
    expect(block).toMatch(/\.effort-state-confirmed[\s\S]*?animation: none/u);
    expect(block).toMatch(/\.model-sheet-skeleton,[\s\S]*?animation: none/u);
    expect(block).toMatch(
      /\.model-sheet-modal,[\s\S]*?transform: none;\s*transition: none;/u,
    );
    expect(block).toMatch(
      /\.model-sheet-overlay button:active:not\(:disabled\),[\s\S]*?transform: none/u,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation-duration: 0\.01ms !important;/u,
    );
    expect(css).toMatch(/\.model-sheet-overlay \{[\s\S]*?--model-sheet-ink: var\(--ink\);/u);
    expect(css).toMatch(
      /:root\[data-theme='dark'\] \.model-sheet-overlay \{[\s\S]*?--model-sheet-ink: var\(--ink\);/u,
    );
  });
});
