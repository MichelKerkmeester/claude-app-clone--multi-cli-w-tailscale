<script module lang="ts">
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

  import './radio-effort.css';

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

  // Host-confirmed selection only; Bits RadioGroup writes the clicked value, so a
  // Local copy is restored to the host-confirmed level after every change
  // (non-optimistic, never an empty selection flash while a request is in flight).
  const hostValue = $derived(confirmed ?? '');

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    effortValue = hostValue;
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onEffortChange(next: string): void {
    // @ds guardrail: do-not-edit — A row selection here is the only request path, never a commit; read-only guards ignore pending or disabled input even if a stale event slips past the group's state.
    if (!isPending && !isDisabled && next.length > 0) onSelect(next);
    effortValue = hostValue;
  }

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

<!-- @ds slot: effort-group -->
<!-- @ds state: group aria-busy / pending-effort — set while a request is in flight. -->
<!-- @ds guardrail: do-not-edit — React-aria RadioGroup wiring: aria-labelledby, aria-describedby, data-pending, and isReadOnly while pending. -->
<RadioGroup
  class="effort-radio-group"
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
    <!-- @ds slot: effort-group row -->
    <!-- @ds state: effort-confirmed (✓) / effort-requested (spinner) -->
    <!-- @ds guardrail: do-not-edit — React-aria Radio wiring: aria-label, aria-describedby, roving focus, and the 44px target. -->
    <RadioGroupItem
      value={level}
      class={`effort-radio-row${isRequested ? ' is-requested' : ''}`}
      aria-label={effortRowAccessibleName(level, levels, isConfirmed, isRequested)}
      aria-describedby={descriptionId}
      style="min-block-size: 44px"
      data-selected={effortValue === level ? true : undefined}
      {@attach attachRowInteractions}
    >
      <span class="effort-radio-row-main">
        <span class="effort-radio-row-label">{name}</span>
      </span>
      <span class="effort-radio-row-states">
        {#if isConfirmed}
          <span class="effort-state-confirmed">
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
          <span class="effort-state-requested">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="effort-spinner">
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
      <span id={descriptionId} class="effort-radio-row-description">
        {description}{isRequested ? ` ${applyingEffortMessage(level, levels)}` : ''}
      </span>
    </RadioGroupItem>
  {/each}
</RadioGroup>

<!-- @ds slot: effort-group — the controlled list of effort radio rows. Decomposed into this co-located CSS file;
     effort-radio-group / effort-radio-row and their states are owned solely by this component so they
     move with it. Child-primitive classes and react-aria/runtime data-attributes use :global so
     Svelte scoping cannot drop them. Values unchanged. -->
