<script module lang="ts">
  import type { RuntimeUiState } from '$shared/data/runtime.js';

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
  // ─── Imports ───────────────────────────────
  import { modeAuthority } from '$shared/data/runtime.js';
  import { planModePresentation } from './planModePresentation.js';
  import { focusVisible, hover, press } from '$shared/primitives/interactions.js';
  import Menu from '$shared/primitives/Menu.svelte';
  import MenuTrigger from '$shared/primitives/MenuTrigger.svelte';
  import PlanModeMenu from './PlanModeMenu.svelte';

  let {
    runtime,
    connection,
    isOpen,
    onOpenChange,
    onSelectPlan,
    onSelectBuild,
    buttonRef = $bindable(null),
  }: PlanModeButtonProps = $props();

  // ─── Derived state ───────────────────────────────
  const presentation = $derived(planModePresentation(runtime, connection));
  const authority = $derived(modeAuthority(runtime));

  // Host-confirmed open only; Bits Menu writes the next open flag, so a local
  // copy is restored to the host value after every change (non-optimistic).
  const hostOpen = $derived(isOpen);
  // ─── Local state ───────────────────────────────
  let menuOpen = $state(false);

  // ─── Effects ───────────────────────────────
  $effect(() => {
    menuOpen = hostOpen;
  });

  // ─── Handlers ───────────────────────────────
  function onMenuOpenChange(next: boolean): void {
    onOpenChange(next);
    menuOpen = hostOpen;
  }

  function onMenuSelect(target: 'build' | 'plan'): void {
    // @ds guardrail: do-not-edit — onSelect routes only an activated row: Plan is an
    // immediate request, Build opens the leave confirmation rather than mutating.
    if (target === 'plan') onSelectPlan();
    else onSelectBuild();
  }

  function attachTrigger(node: Element): () => void {
    const el = node as HTMLButtonElement;
    buttonRef = el;
    // The ARIA keyboard-shortcuts hint is attached on the host button so it
    // survives re-renders (react-aria filtered the attribute out of its prop list).
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
<!-- @ds guardrail: do-not-edit — the aria-keyshortcuts effect and the MenuTrigger/Button
     react-aria wiring (isDisabled, aria-label, onOpenChange, ref) are not designer-editable. -->
<!-- @ds state: host presentation kind — the is-${kind} class drives the css seam. -->
<!-- @ds guardrail: do-not-edit — MenuTrigger/Button react-aria wiring; opening the menu moves
     focus only and never reports a mode. -->
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
  <!-- @ds guardrail: do-not-edit — onSelect routes only an activated row: Plan is an
      immediate request, Build opens the leave confirmation rather than mutating. -->
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

<!-- @ds surface: plan-mode-button — persistent host-confirmed mode control + menu trigger. Decomposed into this scoped block;
     plan-mode-button / plan-mode-label are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
<style>
  /* ── Persistent Plan mode control (immediately after "+") ────────────
     One 44px tab stop with a host-confirmed label. Plan is conveyed
     redundantly (lock glyph + words), never by clay alone. */
  /* @ds surface: plan-mode-button — persistent host-confirmed mode control + menu trigger. */
  /* @ds state: chart — the ModePresentationKind set. The default chrome carries
     checking · build · running · stale · offline · forbidden · unsupported ·
     extension-error · delivery-unknown · unavailable; plan / executing / applying
     have dedicated states below. Disabling is driven by the fail-closed
     presentation kind, never by this class. */
  /* @ds state: default */
  :global(.plan-mode-button) {
    display: inline-flex;
    min-inline-size: 44px;
    min-block-size: 44px;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding-inline: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.85rem;
    font-weight: 620;
    line-height: 1.2;
    cursor: pointer;
    transition:
      background var(--duration-fast, 120ms) var(--ease-out, ease),
      color var(--duration-fast, 120ms) var(--ease-out, ease),
      border-color var(--duration-fast, 120ms) var(--ease-out, ease);
  }

  /* @ds state: hover · pressed */
  :global(.plan-mode-button[data-hovered]),
  :global(.plan-mode-button[data-pressed]) {
    background: var(--surface-muted);
  }

  /* @ds state: focus-visible */
  :global(.plan-mode-button[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* @ds state: disabled */
  :global(.plan-mode-button[data-disabled]) {
    cursor: default;
    opacity: 0.85;
  }

  /* @ds state: plan — host-confirmed Plan; lock glyph + words, never clay alone. */
  :global(.plan-mode-button.is-plan) {
    border-color: var(--line-strong);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* @ds state: plan · hover · pressed */
  :global(.plan-mode-button.is-plan[data-hovered]),
  :global(.plan-mode-button.is-plan[data-pressed]) {
    background: var(--accent-soft);
  }

  /* @ds state: executing — plan execution in progress; rows stay disabled. */
  :global(.plan-mode-button.is-executing) {
    border-color: var(--line-strong);
    color: var(--ink);
  }

  /* @ds state: applying — a mode change is in flight. */
  :global(.plan-mode-button.is-applying) .plan-mode-label {
    color: var(--ink-muted);
  }

  /* @ds slot: label — bounded, ellipsis-capped visible label. */
  .plan-mode-label {
    max-inline-size: 11rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* @ds end surface: plan-mode-button */

  /* Narrow widths give the mode control its own toolbar row above the
     textarea: the left group wraps so the label never truncates Plan ·
     read-only and the primary action stays on the first row. */
  @media (max-width: 400px) {
    :global(.plan-mode-button) {
      flex: 1 1 auto;
    }

    .plan-mode-label {
      max-inline-size: none;
    }
  }

  /* @ds slot: label — lets the button label shrink; see plan-mode-button. */
  .plan-mode-label {
    min-inline-size: 0;
  }

  /* @ds edit: layout — narrow reflow of the composer bar + ready/review card + sheets. */
  @media (max-width: 27rem) {
    :global(.plan-mode-button) {
      min-inline-size: 44px;
      flex: 1 1 9rem;
    }

    .plan-mode-label {
      max-inline-size: none;
      overflow: visible;
      text-overflow: clip;
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
</style>
