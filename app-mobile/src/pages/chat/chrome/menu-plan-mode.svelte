<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ConfirmedMode } from '$shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface PlanModeMenuProps {
    readonly confirmedMode: ConfirmedMode;
    /** True when selection is unsafe even though the menu can open (executing). */
    readonly rowsDisabled: boolean;
    /** Visible reason shown when selection is disabled. */
    readonly rowsDisabledReason: string | null;
    /** Fired only on row activation; focus movement alone never fires it. */
    readonly onSelect: (target: 'build' | 'plan') => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // @ds state: build · plan rows — labels + descriptions are bounded local copy.
  const BUILD_DESCRIPTION = 'Pi may request write-capable tools; approvals still apply.';
  const PLAN_DESCRIPTION = 'Read-only exploration and planning.';
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { focusVisible, focused } from '$shared/primitives/a11y/interactions.js';
  import MenuContent from '$shared/primitives/menu/menu-content.svelte';
  import MenuItem from '$shared/primitives/menu/menu-item.svelte';

  import './menu-plan-mode.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { confirmedMode, rowsDisabled, rowsDisabledReason, onSelect }: PlanModeMenuProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let localMode = $state<ConfirmedMode>('unknown');

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Host-confirmed mode only; Bits MenuItem has no selection to bind, so a local
  // Copy is restored to the host value after every activation (non-optimistic).
  const hostMode = $derived(confirmedMode);

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    localMode = hostMode;
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onRowSelect(target: 'build' | 'plan'): void {
    // @ds guardrail: do-not-edit — A row activation here is the only request path, never a commit; read-only guards ignore disabled or already-confirmed input even if a stale event slips past the item's disabled state.
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
<!-- @ds guardrail: do-not-edit — React-aria Menu/MenuItem/Popover wiring (id, onAction, isDisabled, Text slots); rows are read-only, focus movement never mutates, and only an activated row reports a choice to the caller. Not designer-editable. -->
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

<!-- @ds surface: plan-mode-menu — the exact two-row Build / Plan picker. Decomposed into this co-located CSS file;
     plan-mode-popover / plan-mode-row are child primitives (MenuContent / MenuItem) so they move
     with this surface. Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
