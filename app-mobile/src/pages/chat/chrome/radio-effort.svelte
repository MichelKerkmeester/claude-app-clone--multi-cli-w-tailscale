<script module lang="ts">
  // This module holds the shared Radio Effort types and helpers.
  export interface EffortRadioGroupProps {
    /** Host-advertised levels, in host order and subset (never re-sorted). */
    readonly levels: readonly string[];
    /** Host-confirmed level; the checked row. */
    readonly confirmed: string | null;
    /** The level requested by the in-flight mutation, when pending. */
    readonly pendingLevel: string | null;
    /** True while a set_thinking_level mutation is in flight. */
    readonly isPending: boolean;
    /** True when authority or the phase forbids mutation (rows not focusable). */
    readonly isDisabled: boolean;
    /** Id of the visible section heading that names this group. */
    readonly labelledBy: string;
    /** Id of the visible status line that describes the current group state, when present. */
    readonly describedBy?: string;
    /** Explicit row selection: the only path that may request a mutation. */
    readonly onSelect: (level: string) => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import {
    applyingEffortMessage,
    effortRowAccessibleName,
    effortRowDescription,
    effortRowName,
    effortStrings,
  } from '$shared/catalog/effort.js';
  import { focusVisible, focused, hover } from '$shared/primitives/a11y/interactions.js';
  import RadioGroup from '$shared/primitives/choice/radio-group.svelte';
  import RadioGroupItem from '$shared/primitives/choice/radio-group-item.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    levels,
    confirmed,
    pendingLevel,
    isPending,
    isDisabled,
    labelledBy,
    describedBy,
    onSelect,
  }: EffortRadioGroupProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let effortValue = $state('');

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Bits RadioGroup writes locally; mirror host level (non-optimistic, no empty flash).
  const hostValue = $derived(confirmed ?? '');

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    effortValue = hostValue;
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep on effort change focused on its single responsibility.
  function onEffortChange(next: string): void {
    // Do not edit — A row selection here is the only request path, never a commit; read-only guards ignore pending or disabled input even if a stale event slips past the group's state.
    if (!isPending && !isDisabled && next.length > 0) onSelect(next);
    effortValue = hostValue;
  }

  // Keep attach row interactions focused on its single responsibility.
  function attachRowInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const hoverAction = hover(el);
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    return () => {
      if (hoverAction) hoverAction.destroy?.();
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
    };
  }
</script>

<!-- Component content -->
<!-- This slot: effort-group -->
<!-- This state: group aria-busy / pending-effort — set while a request is in flight. -->
<!-- Do not edit — React-aria RadioGroup wiring: aria-labelledby, aria-describedby, data-pending, and isReadOnly while pending. -->
<RadioGroup
  class="effort-radio--group"
  aria-labelledby={labelledBy}
  aria-describedby={describedBy}
  data-pending={isPending ? 'true' : undefined}
  aria-busy={isPending ? 'true' : undefined}
  disabled={isDisabled}
  readonly={isPending}
  bind:value={effortValue}
  onValueChange={onEffortChange}
>
  {#each levels as level, index (level)}
    {@const ordinal = index + 1}
    {@const isConfirmed = level === confirmed}
    {@const isRequested = isPending && level === pendingLevel}
    {@const name = effortRowName(level, levels)}
    {@const description = effortRowDescription(level)}
    {@const descriptionId = `effort-row-description-${ordinal}`}
    <!-- This slot: effort-group row -->
    <!-- This state: effort-confirmed (✓) / effort-requested (spinner) -->
    <!-- Do not edit — React-aria Radio wiring: aria-label, aria-describedby, roving focus, and the 44px target. -->
    <RadioGroupItem
      value={level}
      class={`effort-radio-row${isRequested ? ' is-requested' : ''}`}
      aria-label={effortRowAccessibleName(level, levels, isConfirmed, isRequested)}
      aria-describedby={descriptionId}
      style="min-block-size: 44px"
      data-selected={effortValue === level ? true : undefined}
      {@attach attachRowInteractions}
    >
      <span class="effort-radio-row--main">
        <span class="effort-radio-row--label">{name}</span>
      </span>
      <span class="effort-radio-row--states">
        {#if isConfirmed}
          <span class="effort-state--confirmed">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="m3 8 3 3 7-7"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {effortStrings.confirmed}
          </span>
        {/if}
        {#if isRequested}
          <span class="effort-state--requested">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="effort--spinner">
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                opacity="0.3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
              />
            </svg>
            {effortStrings.applying}
          </span>
        {/if}
      </span>
      <span id={descriptionId} class="effort-radio-row--description">
        {description}{isRequested ? ` ${applyingEffortMessage(level, levels)}` : ''}
      </span>
    </RadioGroupItem>
  {/each}
</RadioGroup>

<!-- This slot: effort-group — the controlled list of effort radio rows. Decomposed into this scoped block;
     effort-radio--group / effort-radio-row and their states are owned solely by this component so they
     move with it. Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* This slot: effort-group — the controlled list of effort radio rows. */
  /* This state: group aria-busy — while a set-thinking-level mutation is in flight the
     group is read-only (still focusable) and marked busy. */
  :global(.effort-radio--group) {
    display: grid;
    min-inline-size: 0;
    gap: 2px;
    outline: none;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.effort-radio-row) {
    display: grid;
    min-inline-size: 0;
    min-block-size: 44px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.25rem var(--space-2);
    align-content: center;
    padding-block: 0.5rem;
    padding-inline: var(--space-3);
    border: 2px solid transparent;
    border-radius: 14px;
    color: var(--model-sheet-ink);
    cursor: pointer;
    outline: none;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.effort-radio-row[data-hovered]),
  :global(.effort-radio-row[data-focused]) {
    background: var(--model-sheet-selection);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.effort-radio-row[data-selected]) {
    border-color: var(--model-sheet-ui-accent);
    background: var(--model-sheet-selection);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.effort-radio-row[data-focus-visible]) {
    outline-color: var(--model-sheet-ui-accent);
    outline-style: solid;
    outline-width: 2px;
    outline-offset: 2px;
  }

  /* This state: read-only / disabled — effort row not actionable. */
  :global(.effort-radio-row[data-disabled]) {
    cursor: default;
    opacity: 0.72;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .effort-radio-row--main,
  .effort-radio-row--states {
    display: flex;
    min-inline-size: 0;
    align-items: center;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .effort-radio-row--main {
    flex-wrap: wrap;
    gap: 0.2rem var(--space-2);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .effort-radio-row--label {
    overflow-wrap: anywhere;
    font-size: 0.95rem;
    font-weight: 650;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .effort-radio-row--states {
    justify-content: flex-end;
    gap: 0.35rem;
    color: var(--model-sheet-accent);
    font-size: 0.72rem;
    font-weight: 700;
  }

  /* This state: effort-confirmed — ✓ on the settled row. */
  .effort-state--confirmed {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
    animation: effort-check-in 120ms ease-out;
  }

  /* This state: effort-requested — in-flight application spinner; also the visual for
     the group's pending-effort / aria-busy window. */
  .effort-state--requested {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.effort--spinner) {
    animation: composer-spin 0.8s linear infinite;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .effort-radio-row--description {
    grid-column: 1 / -1;
    color: var(--model-sheet-muted);
    font-size: 0.72rem;
    line-height: 1.35;
  }

  /* Muted copy on the soft selection wash drops below 4.5:1 in the bone
     theme, so selected/focused/hovered rows promote descriptions and IDs
     to the ink token; the accent states column already passes there. */
  :global(.effort-radio-row[data-hovered]) .effort-radio-row--description,
  :global(.effort-radio-row[data-focused]) .effort-radio-row--description,
  :global(.effort-radio-row[data-selected]) .effort-radio-row--description {
    color: var(--model-sheet-ink);
  }

  @keyframes effort-check-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
