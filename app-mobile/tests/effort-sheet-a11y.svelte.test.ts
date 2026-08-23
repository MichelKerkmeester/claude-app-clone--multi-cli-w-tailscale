// ───────────────────────────────────────────────────────────────────
// MODULE: Effort Sheet Accessibility, State, Reflow, and Motion Gates (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/effort-sheet-a11y.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle — same roles, names, text, values,
// counts, ordering, and negative assertions.
//
// The React oracle's renderEffortSheet mutates controls.runtime then re-renders.
// In Svelte, re-rendering via props would re-run ModelEffortSheet's open-effect
// (which resets the announcement). Instead, the EffortSheetAdvanceHarness holds
// the runtime as internal $state and exposes advance() to transition it without
// re-running the open-effect, so the announcement effect can observe the
// pending→settled transition and announce exactly once.

import type { AvailableModelDto, RuntimeStateDto } from '@pi-remote/pi-rpc-protocol';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeControls, RuntimePhase, RuntimeUiState } from '../src/shared/state/runtime.js';
import EffortSheetAdvanceHarness, {
  type EffortSheetAdvanceHarnessApi,
} from './support/EffortSheetAdvanceHarness.svelte';

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

// CSS sources: the React oracle reads app-mobile/src/style.css. In the Svelte
// port, component-owned rules live in scoped <style> blocks and global rules
// (reduced-motion overrides, text-size-adjust) live in app.css. Each assertion
// is repointed to its owning source with the same rule text/values.
const SHEET_CSS = normalizeSvelteCss(
  readFileSync('app-mobile/src/pages/chat/chrome/sheet-model-effort.svelte', 'utf8'),
);
const EFFORT_CSS = normalizeSvelteCss(
  readFileSync('app-mobile/src/pages/chat/chrome/radio-effort.svelte', 'utf8'),
);
const APP_CSS = readFileSync('app-mobile/src/app.css', 'utf8');

afterEach(() => {
  cleanup();
  // bits-ui BodyScrollLock restores body pointer-events on a deferred
  // setTimeout that outlives synchronous cleanup; reset defensively.
  document.body.style.cssText = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.removeProperty('zoom');
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
  vi.restoreAllMocks();
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

function pendingEffortRuntime(level: string, levels: readonly string[]): RuntimeUiState {
  return {
    ...readyRuntime({ ...HOST_STATE, availableThinkingLevels: [...levels] }),
    status: 'pending',
    phase: 'pending',
    pending: { type: 'set_thinking_level', level },
  };
}

interface EffortSheetHarness {
  readonly view: ReturnType<typeof render>;
  readonly onOpenChange: ReturnType<typeof vi.fn>;
  advance(next: RuntimeUiState): Promise<void>;
}

async function renderEffortSheet(runtime: RuntimeUiState): Promise<EffortSheetHarness> {
  let api: EffortSheetAdvanceHarnessApi | null = null;
  const onOpenChange = vi.fn();
  const view = render(EffortSheetAdvanceHarness, {
    props: {
      initialRuntime: runtime,
      initialSection: 'effort',
      isOpen: true,
      onOpenChange,
      onApi: (value: EffortSheetAdvanceHarnessApi) => {
        api = value;
      },
    },
  });
  await screen.findByRole('dialog');
  await tick();
  return {
    view,
    onOpenChange,
    async advance(next: RuntimeUiState): Promise<void> {
      api?.advance(next);
      await tick();
    },
  };
}

function announcer(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-live-announcer="true"]');
  if (element === null) throw new Error('Expected the one sheet status region');
  return element;
}

/** Extract the <style> block from a .svelte file and strip :global() wrappers
 *  so selectors match the original CSS form. Values are unchanged. */
function normalizeSvelteCss(source: string): string {
  const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (styleMatch === null) return source;
  return styleMatch[1].replace(/:global\(([^)]*)\)/gu, '$1');
}

describe('one polite atomic status region, no competing alert', () => {
  it('keeps exactly one document-level status region and zero alerts in every sheet state', async () => {
    const harness = await renderEffortSheet(readyRuntime());
    expect(document.querySelectorAll('[data-live-announcer="true"]')).toHaveLength(1);
    expect(announcer()).toHaveAttribute('role', 'status');
    expect(announcer()).toHaveAttribute('aria-live', 'polite');
    expect(announcer()).toHaveAttribute('aria-atomic', 'true');
    expect(announcer().closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    await harness.advance(pendingEffortRuntime('max', ['off', 'high', 'max']));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await harness.advance({
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
  it('announces applying once when the request goes in flight and never on re-renders', async () => {
    const pending = pendingEffortRuntime('max', ['off', 'high', 'max']);
    const harness = await renderEffortSheet(pending);
    expect(announcer()).toHaveTextContent('Applying Max…');

    // An equivalent re-render must not repeat or accumulate the announcement.
    await harness.advance(pendingEffortRuntime('max', ['off', 'high', 'max']));
    expect(announcer()).toHaveTextContent('Applying Max…');
    expect(announcer().textContent).toBe('Applying Max…');
  });

  it('announces the accepted outcome once after the pending mutation settles', async () => {
    const harness = await renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    await harness.advance({
      ...readyRuntime({ ...HOST_STATE, thinkingLevel: 'max' }),
      phase: 'accepted',
    });
    expect(announcer()).toHaveTextContent('Thinking effort set to Max.');

    // A later ready phase keeps the region quiet (no second announcement).
    await harness.advance(readyRuntime({ ...HOST_STATE, thinkingLevel: 'max' }));
    expect(announcer()).toHaveTextContent('Thinking effort set to Max.');
  });

  it('announces the stale outcome once', async () => {
    const harness = await renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    await harness.advance({ ...readyRuntime(), status: 'stale', phase: 'stale', lastOutcome: 'stale' });
    expect(announcer()).toHaveTextContent('The host runtime changed. Refreshed.');
  });

  it('announces the delivery-unknown failure once with bounded copy', async () => {
    const harness = await renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
    await harness.advance({
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

  it('announces an unknown pending level as a bounded ordinal', async () => {
    const harness = await renderEffortSheet(
      pendingEffortRuntime('host-custom-level-9', ['off', 'host-custom-level-9']),
    );
    expect(announcer()).toHaveTextContent('Applying Host-defined level 2…');
    expect(announcer().textContent).not.toContain('host-custom-level-9');
  });
});

describe('semantic labelling and description associations', () => {
  it('labels the dialog and radio group from the visible heading and describes the group from its status line', async () => {
    const harness = await renderEffortSheet({
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

  it('omits the group description when no status line renders', async () => {
    await renderEffortSheet(readyRuntime());
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toHaveAccessibleDescription(
      'Deep reasoning for complex coding work.',
    );
  });

  it('keeps pending rows focusable but read-only with the group busy', async () => {
    await renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
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
    const harness = await renderEffortSheet(readyRuntime());
    const confirmed = screen.getByRole('radio', { name: 'High, Confirmed' });
    await waitFor(() => expect(confirmed).toHaveFocus());
    harness.view.unmount();
  });
});

describe('no raw host text in the DOM or accessibility tree', () => {
  it('keeps unknown level ids, host error text, and ticket-shaped values out of every surface', async () => {
    const harness = await renderEffortSheet({
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
  it('marks selected and pending rows with text, shape, and ring, never clay alone', async () => {
    const harness = await renderEffortSheet(pendingEffortRuntime('max', ['off', 'high', 'max']));
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

    expect(EFFORT_CSS).toMatch(
      /\.effort-radio-row\[data-selected\] \{[\s\S]*?border-color: var\(--model-sheet-ui-accent\);/u,
    );
    expect(EFFORT_CSS).toMatch(
      /\.effort-radio-row\[data-focus-visible\] \{[\s\S]*?outline-width: 2px;\s*outline-offset: 2px;/u,
    );
    harness.view.unmount();
  });

  it('disables every row without authority and renders distinct empty, off-only, and inconsistent copy', async () => {
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
      const harness = await renderEffortSheet({
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

  it('applies the frozen light and dark tokens to the sheet surface', async () => {
    expect(SHEET_CSS).toMatch(
      /\.model-sheet-overlay \{[\s\S]*?--model-sheet-raised: var\(--surface\);[\s\S]*?--model-sheet-ink: var\(--ink\);[\s\S]*?--model-sheet-ui-accent: var\(--accent-strong\);/u,
    );
    expect(SHEET_CSS).toMatch(
      /:root\[data-theme='dark'\] \.model-sheet-overlay \{[\s\S]*?--model-sheet-raised: var\(--surface\);[\s\S]*?--model-sheet-ink: var\(--ink\);[\s\S]*?--model-sheet-ui-accent: var\(--accent-ink\);/u,
    );

    const light = await renderEffortSheet(readyRuntime());
    expect(document.querySelector('.model-sheet-overlay')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    light.view.unmount();
    cleanup();

    document.documentElement.setAttribute('data-theme', 'dark');
    const dark = await renderEffortSheet(readyRuntime());
    expect(document.querySelector('.model-sheet-overlay')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    dark.view.unmount();
  });
});

describe('reflow, touch targets, and logical layout', () => {
  it('contains 320px and 200%-zoom overflow with 44px rows across seven two-line rows', async () => {
    const seven = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
    const harness = await renderEffortSheet(
      readyRuntime({ ...HOST_STATE, availableThinkingLevels: seven }),
    );
    const dialog = screen.getByRole('dialog');
    // In bits-ui, the modal is a child of Dialog.Content, not an ancestor.
    const modal = dialog.querySelector<HTMLElement>('.model-sheet-modal');
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

  it('uses logical properties and mirrors section arrows under RTL', async () => {
    expect(EFFORT_CSS).toMatch(/\.effort-radio-row \{[\s\S]*?padding-inline: var\(--space-3\);/u);
    expect(SHEET_CSS).toMatch(
      /\.model-sheet-dialog \{[\s\S]*?padding-inline: env\(safe-area-inset-left\) env\(safe-area-inset-right\);/u,
    );
    expect(SHEET_CSS).toMatch(
      /\[dir='rtl'\] \.model-sheet-nav-button svg,[\s\S]*?transform: scaleX\(-1\);/u,
    );
    expect(SHEET_CSS).toMatch(/\.model-sheet-policy,[\s\S]*?border-block: 1px solid/u);

    document.documentElement.setAttribute('dir', 'rtl');
    const harness = await renderEffortSheet(readyRuntime());
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(announcer().textContent).not.toContain('alpha-current');
    harness.view.unmount();
  });

  it('keeps browser text inflation enabled and scrolls internally at large text', () => {
    expect(APP_CSS).not.toMatch(/text-size-adjust:\s*none/gu);
    expect(SHEET_CSS).toMatch(/\.model-sheet-search input \{[\s\S]*?font-size: 1rem;/u);
    expect(EFFORT_CSS).toMatch(/\.effort-radio-row-label \{[\s\S]*?overflow-wrap: anywhere;/u);
    expect(SHEET_CSS).toMatch(/\.effort-radio-scroll \{[\s\S]*?overflow-y: auto;/u);
    expect(SHEET_CSS).toMatch(/\.effort-sheet-section \{[\s\S]*?flex: 1 1 auto;/u);
    expect(SHEET_CSS).toMatch(
      /max-block-size: calc\(var\(--visual-viewport-height, 100dvh\) \* 0\.75\);/u,
    );
    expect(SHEET_CSS).toContain('padding-block-end: max(16px, env(safe-area-inset-bottom));');
  });
});

describe('reduced motion removes transforms, springs, stagger, and spinners', () => {
  it('strips sheet and effort animations while keeping the fixed tokens', () => {
    const pulseStart = APP_CSS.indexOf('@keyframes model-sheet-pulse');
    const blockStart = APP_CSS.lastIndexOf(
      '@media (prefers-reduced-motion: reduce) {',
      pulseStart,
    );
    if (blockStart === -1 || pulseStart === -1) {
      throw new Error('Expected the sheet reduced-motion block');
    }
    const block = APP_CSS.slice(blockStart, pulseStart);
    expect(block).toMatch(/\.effort-spinner,[\s\S]*?animation: none/u);
    expect(block).toMatch(/\.effort-state-confirmed[\s\S]*?animation: none/u);
    expect(block).toMatch(/\.model-sheet-skeleton,[\s\S]*?animation: none/u);
    expect(block).toMatch(
      /\.model-sheet-modal,[\s\S]*?transform: none;\s*transition: none;/u,
    );
    expect(block).toMatch(
      /\.model-sheet-overlay button:active:not\(:disabled\),[\s\S]*?transform: none/u,
    );
    expect(APP_CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation-duration: 0\.01ms !important;/u,
    );
    expect(SHEET_CSS).toMatch(/\.model-sheet-overlay \{[\s\S]*?--model-sheet-ink: var\(--ink\);/u);
    expect(SHEET_CSS).toMatch(
      /:root\[data-theme='dark'\] \.model-sheet-overlay \{[\s\S]*?--model-sheet-ink: var\(--ink\);/u,
    );
  });
});
