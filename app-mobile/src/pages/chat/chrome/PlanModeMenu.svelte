<script module lang="ts">
  import type { ConfirmedMode } from '../../../shared/data/runtime.js';

  export interface PlanModeMenuProps {
    readonly confirmedMode: ConfirmedMode;
    /** True when selection is unsafe even though the menu can open (executing). */
    readonly rowsDisabled: boolean;
    /** Visible reason shown when selection is disabled. */
    readonly rowsDisabledReason: string | null;
    /** Fired only on row activation; focus movement alone never fires it. */
    readonly onSelect: (target: 'build' | 'plan') => void;
  }

  // @ds state: build · plan rows — labels + descriptions are bounded local copy.
  const BUILD_DESCRIPTION = 'Pi may request write-capable tools; approvals still apply.';
  const PLAN_DESCRIPTION = 'Read-only exploration and planning.';
</script>

<script lang="ts">
  import { focusVisible, focused } from '../../../shared/primitives/interactions.js';
  import MenuContent from '../../../shared/primitives/MenuContent.svelte';
  import MenuItem from '../../../shared/primitives/MenuItem.svelte';

  let { confirmedMode, rowsDisabled, rowsDisabledReason, onSelect }: PlanModeMenuProps = $props();

  // Host-confirmed mode only; Bits MenuItem has no selection to bind, so a local
  // copy is restored to the host value after every activation (non-optimistic).
  const hostMode = $derived(confirmedMode);
  let localMode = $state<ConfirmedMode>('unknown');

  $effect(() => {
    localMode = hostMode;
  });

  function onRowSelect(target: 'build' | 'plan'): void {
    // @ds guardrail: do-not-edit — a row activation here is the only request path,
    // never a commit; the read-only guard keeps a stale event from firing.
    // Read-only event guards: disabled or already-confirmed input is ignored even
    // if a stale event slips past the item's own disabled state.
    if (!rowsDisabled && localMode !== target) onSelect(target);
    localMode = hostMode;
  }

  function attachRowInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    return () => {
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
    };
  }
</script>

<!-- @ds surface: plan-mode-menu — the exact two-row Build / Plan picker. -->
<!-- @ds guardrail: do-not-edit — react-aria Menu/MenuItem/Popover wiring (id, onAction,
     isDisabled, Text slots); rows are read-only, focus movement never mutates, and only an
     activated row reports a choice to the caller. Not designer-editable. -->
<!-- @ds slot: popover — floating placement chrome. -->
<MenuContent class="plan-mode-popover" aria-label="Agent mode">
    <div class="plan-mode-menu">
      <!-- @ds state: row build — immediately requestable when safe. -->
      <MenuItem
        id="build"
        class="plan-mode-row"
        textValue="Build"
        disabled={rowsDisabled || localMode === 'build'}
        onSelect={() => onRowSelect('build')}
        {@attach attachRowInteractions}
      >
        <span class="react-aria-Text" {...{ slot: 'label' }}>Build</span>
        <span class="react-aria-Text" {...{ slot: 'description' }}>{BUILD_DESCRIPTION}</span>
        {#if localMode === 'build'}
          <!-- @ds slot: check-glyph — the ✓ on the confirmed row; strokes inherit currentColor. -->
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </MenuItem>
      <!-- @ds state: row plan — read-only target; only activation reports. -->
      <MenuItem
        id="plan"
        class="plan-mode-row"
        textValue="Plan"
        disabled={rowsDisabled || localMode === 'plan'}
        onSelect={() => onRowSelect('plan')}
        {@attach attachRowInteractions}
      >
        <span class="react-aria-Text" {...{ slot: 'label' }}>Plan</span>
        <span class="react-aria-Text" {...{ slot: 'description' }}>{PLAN_DESCRIPTION}</span>
        {#if localMode === 'plan'}
          <!-- @ds slot: check-glyph — the ✓ on the confirmed row; strokes inherit currentColor. -->
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
      </MenuItem>
    </div>
    {#if rowsDisabled && rowsDisabledReason !== null}
      <!-- @ds slot: note — bounded reason when a row cannot be chosen. -->
      <p class="plan-mode-menu-note">{rowsDisabledReason}</p>
    {/if}
</MenuContent>

<!-- @ds surface: plan-mode-menu — the exact two-row Build / Plan picker. Decomposed from style.css;
     plan-mode-popover / plan-mode-row are child primitives (MenuContent / MenuItem) so they move
     with this surface. Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* The two-row mode menu: focus movement only, activation alone reports. */
  /* @ds surface: plan-mode-menu — the exact two-row Build / Plan picker. */
  /* @ds slot: popover — floating placement chrome + raised elevation. */
  /* @ds surface: overlay — plan-mode-popover is an INSTANCE of the shared overlay
     primitive (a raised panel over its anchored trigger). Physical unification
     of the per-surface overlay chrome is a documented follow-up. */
  :global(.plan-mode-popover) {
    min-inline-size: min(88vw, 18rem);
    padding: var(--space-1);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
    outline: none;
  }

  /* @ds slot: menu — list column for the two rows. */
  .plan-mode-menu {
    display: grid;
    gap: 2px;
    padding: 0;
    outline: none;
  }

  /* @ds slot: row — a Build or Plan choice; selection gating is authority-driven. */
  :global(.plan-mode-row) {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0 var(--space-3);
    min-block-size: 44px;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font-size: 0.9rem;
    font-weight: 620;
    text-align: start;
    cursor: pointer;
  }

  /* @ds state: row · focused — move-only, never a selection. */
  :global(.plan-mode-row[data-focused]) {
    background: var(--surface-muted);
    outline: none;
  }

  /* @ds state: row · focus-visible */
  :global(.plan-mode-row[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: -2px;
  }

  /* @ds state: row · disabled — selection unsafe (executing) or already current. */
  :global(.plan-mode-row[data-disabled]) {
    cursor: default;
    opacity: 0.55;
  }

  /* @ds slot: row-description — bounded local copy under the row label. */
  :global(.plan-mode-row .react-aria-Text[slot='description']) {
    grid-column: 1;
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 400;
    line-height: 1.35;
  }

  /* @ds state: row · selected — the ✓ on the confirmed mode's row. */
  :global(.plan-mode-row > svg) {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
    color: var(--accent-ink);
  }

  /* @ds slot: note — bounded reason when a row cannot be chosen. */
  .plan-mode-menu-note {
    margin: var(--space-2) var(--space-3) var(--space-1);
    color: var(--ink-muted);
    font-size: 0.78rem;
    line-height: 1.35;
  }
  /* @ds end surface: plan-mode-menu */
</style>
