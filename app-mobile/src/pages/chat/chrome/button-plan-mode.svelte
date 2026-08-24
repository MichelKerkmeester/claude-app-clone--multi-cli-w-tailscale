<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RuntimeUiState } from '$shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface PlanModeButtonProps {
    readonly runtime: RuntimeUiState;
    readonly connection: string;
    /** Controlled menu open state so the keyboard path can open the menu. */
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** Plan row activated from Build: an immediate, host-confirmed request. */
    readonly onSelectPlan: () => void;
    /** Build row activated from Plan: the leave confirmation, never a direct mutation. */
    readonly onSelectBuild: () => void;
    /** The button element, so the leave sheet can restore focus to it. */
    buttonRef?: HTMLButtonElement | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { modeAuthority } from '$shared/state/runtime.js';
  import { planModePresentation } from './plan-mode-presentation.js';
  import { focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';
  import Menu from '$shared/primitives/menu/menu.svelte';
  import MenuTrigger from '$shared/primitives/menu/menu-trigger.svelte';
  import PlanModeMenu from './menu-plan-mode.svelte';

  import './button-plan-mode.css';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    runtime,
    connection,
    isOpen,
    onOpenChange,
    onSelectPlan,
    onSelectBuild,
    buttonRef = $bindable(null),
  }: PlanModeButtonProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let menuOpen = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const presentation = $derived(planModePresentation(runtime, connection));
  const authority = $derived(modeAuthority(runtime));

  // Host-confirmed open only; Bits Menu writes the next open flag, so a local
  // Copy is restored to the host value after every change (non-optimistic).
  const hostOpen = $derived(isOpen);

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    menuOpen = hostOpen;
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onMenuOpenChange(next: boolean): void {
    onOpenChange(next);
    menuOpen = hostOpen;
  }

  function onMenuSelect(target: 'build' | 'plan'): void {
  // @ds guardrail: do-not-edit — onSelect routes only an activated row: Plan is an immediate request, Build opens the leave confirmation rather than mutating.
    if (target === 'plan') onSelectPlan();
    else onSelectBuild();
  }

  function attachTrigger(node: Element): () => void {
    const el = node as HTMLButtonElement;
    buttonRef = el;
    // The ARIA keyboard-shortcuts hint is attached on the host button so it
    // Survives re-renders (react-aria filtered the attribute out of its prop list).
    el.setAttribute('aria-keyshortcuts', 'Shift+Tab Meta+Shift+M');
    const hoverAction = hover(el);
    const pressAction = press(el);
    const focusVisibleAction = focusVisible(el);
    return () => {
      if (buttonRef === el) buttonRef = null;
      hoverAction?.destroy?.();
      pressAction?.destroy?.();
      focusVisibleAction?.destroy?.();
    };
  }
</script>

<!-- @ds surface: plan-mode-button — persistent host-confirmed mode control + menu trigger. -->
<!-- @ds guardrail: do-not-edit — The aria-keyshortcuts effect and MenuTrigger/Button React-aria wiring (isDisabled, aria-label, onOpenChange, ref) are not designer-editable. -->
<!-- @ds state: host presentation kind — the is-${kind} class drives the css seam. -->
<!-- @ds guardrail: do-not-edit — MenuTrigger/Button React-aria wiring; opening the menu moves focus only and never reports a mode. -->
<Menu bind:open={menuOpen} onOpenChange={onMenuOpenChange}>
  <MenuTrigger
    class={`plan-mode-button is-${presentation.kind}`}
    type="button"
    aria-label={presentation.accessibleName}
    aria-keyshortcuts="Shift+Tab Meta+Shift+M"
    disabled={presentation.disabled}
    {@attach attachTrigger}
  >
    <!-- @ds slot: glyph — presentation glyph per kind. -->
    {#if presentation.kind === 'plan'}
      {@render lockGlyph()}
    {:else if presentation.kind === 'executing'}
      {@render playGlyph()}
    {:else if presentation.kind === 'checking'}
      {@render pendingGlyph()}
    {:else if presentation.kind === 'build'}
      {@render boltGlyph()}
    {:else}
      {@render warningGlyph()}
    {/if}
    <!-- @ds slot: label — bounded visible label. -->
    <span class="plan-mode-label">{presentation.label}</span>
  </MenuTrigger>
  <!-- @ds guardrail: do-not-edit — onSelect routes only an activated row: Plan is an immediate request, Build opens the leave confirmation rather than mutating. -->
  <PlanModeMenu
    confirmedMode={authority.confirmedMode}
    rowsDisabled={presentation.rowsDisabledReason !== null}
    rowsDisabledReason={presentation.rowsDisabledReason}
    onSelect={onMenuSelect}
  />
</Menu>

<!-- @ds slot: glyph — per-kind presentation glyph; strokes inherit currentColor. -->
{#snippet boltGlyph()}
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <path
      d="M13 3L5 13.5h5L9 21l8-10.5h-5L13 3z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}
{#snippet lockGlyph()}
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <rect
      x="5"
      y="10.5"
      width="14"
      height="9.5"
      rx="2.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    />
    <path
      d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{/snippet}
{#snippet playGlyph()}
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" />
  </svg>
{/snippet}
{#snippet pendingGlyph()}
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2" opacity="0.35" />
    <path
      d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
{/snippet}
{#snippet warningGlyph()}
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
    <path
      d="M12 4L21 20H3L12 4z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path d="M12 10v4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
  </svg>
{/snippet}

<!-- @ds surface: plan-mode-button — persistent host-confirmed mode control + menu trigger. Decomposed into this co-located CSS file;
     plan-mode-button / plan-mode-label are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
