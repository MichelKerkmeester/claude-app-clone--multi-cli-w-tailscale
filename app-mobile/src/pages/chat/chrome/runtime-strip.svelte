<script module lang="ts">
  // This module holds the shared Runtime Strip types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RuntimeControls } from '$shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface RuntimeStripProps {
    readonly controls: RuntimeControls;
    /** Whether the shared model/effort sheet is open (for aria-expanded). */
    readonly sheetOpen: boolean;
    /** Opens the shared sheet at the effort section. */
    readonly onOpenEffortSheet: () => void;
    /** Attached to the effort trigger so the sheet can restore focus to it. */
    effortTriggerRef?: HTMLButtonElement | null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep status hint focused on its single responsibility.
  function statusHint(status: RuntimeControls['runtime']['status'], hasPending: boolean): string {
    switch (status) {
      case 'checking':
        return 'Checking…';
      case 'pending':
        return hasPending ? 'Applying…' : 'Working…';
      case 'stale':
        return 'Refreshed — host changed';
      case 'error':
        return 'Unavailable — reconcile';
      default:
        return '';
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { effortTriggerName, effortTriggerText } from '$shared/catalog/effort.js';
  import Button from '$shared/primitives/button/button.svelte';
  import ToggleGroup from '$shared/primitives/choice/toggle-group.svelte';
  import ToggleGroupItem from '$shared/primitives/choice/toggle-group-item.svelte';

  let {
    controls,
    sheetOpen,
    onOpenEffortSheet,
    effortTriggerRef = $bindable(null),
  }: RuntimeStripProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const runtime = $derived(controls.runtime);
  const snapshot = $derived(runtime.state);
  const disabled = $derived(runtime.status !== 'ready' || snapshot === null);
  const modelLabel = $derived(snapshot?.model?.label ?? '—');
  const effortText = $derived(
    effortTriggerText(snapshot?.thinkingLevel, snapshot?.availableThinkingLevels ?? []),
  );
  const planActive = $derived(snapshot?.mode === 'plan' || snapshot?.mode === 'executing-plan');
  const hostMode = $derived(snapshot === null ? '' : planActive ? 'plan' : 'build');
  // Mirror the host-confirmed mode while a mode request is in flight.
  let modeValue = $derived(hostMode);

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep on mode change focused on its single responsibility.
  function onModeChange(next: string): void {
    if (next === 'build' || next === 'plan') void controls.setMode(next);
    // Put the selection back to what the host reports. The binding moves it on
    // click, which would show a mode the host has not confirmed and may never
    // accept; this client shows host truth, never a request in flight.
    modeValue = hostMode;
  }
</script>

<!-- Component content -->
<!-- Runtime strip -->
<!-- This surface: runtime--strip — host-backed readout + controls strip. -->
<div class="runtime--strip" role="group" aria-label="Runtime controls">
  <!-- This slot: model-readout — confirmed model readout. -->
  <span class="runtime-readout runtime-model-readout">
    <span class="runtime-readout--label">Model</span>
    <span class="runtime-readout--value">{modelLabel}</span>
  </span>

<!-- Effort trigger -->
  <!-- This surface: effort-trigger — opens the shared model/effort sheet. -->
  <!-- Do not edit — react-aria Button wiring (ref, aria-haspopup/expanded, onPress) — Not designer-editable. -->
  <Button
    class="runtime--effort-trigger"
    aria-label={effortTriggerName(effortText)}
    aria-haspopup="dialog"
    aria-expanded={sheetOpen}
    aria-controls="model-effort-dialog"
    style="min-block-size: 44px"
    onclick={onOpenEffortSheet}
    {@attach (node) => {
      effortTriggerRef = node as HTMLButtonElement;
      return () => {
        if (effortTriggerRef === node) effortTriggerRef = null;
      };
    }}
  >
    <span class="runtime-readout--label">Effort</span>
    <span class="runtime-readout--value">{effortText}</span>
    <!-- This slot: chevron-up — inline glyph; strokes inherit currentColor. -->
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M6 15l6-6 6 6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </Button>

<!-- Build plan toggle -->
  <!-- This surface: build-plan-toggle — Build / Plan segmented toggle. -->
  <!-- Do not edit — react-aria ToggleButtonGroup wiring (selection + onChange + aria) — Not designer-editable. -->
  <!-- This state: build · plan — selection is disabled while the authority is not ready; the
      label never precedes host confirmation (non-optimistic). -->
  <ToggleGroup
    class="runtime--control runtime--mode"
    aria-label="Build or Plan"
    bind:value={modeValue}
    onValueChange={onModeChange}
  >
    <ToggleGroupItem
      id="build"
      value="build"
      class="react-aria-ToggleButton"
      disabled={disabled}
      data-selected={modeValue === 'build' ? true : undefined}
    >
      Build
    </ToggleGroupItem>
    <ToggleGroupItem
      id="plan"
      value="plan"
      class="react-aria-ToggleButton"
      disabled={disabled}
      data-selected={modeValue === 'plan' ? true : undefined}
    >
      {snapshot?.mode === 'plan' ? 'Plan · read-only' : 'Plan'}
    </ToggleGroupItem>
  </ToggleGroup>

  <!-- This slot: status — applied runtime status hint. -->
  <!-- This state: checking · applying · stale · error — the runtime status hint. -->
  <!-- Do not edit — role="status" + aria-live="polite" live region. -->
  <span class="runtime--status" role="status" aria-live="polite">
    {statusHint(runtime.status, runtime.pending !== null)}
  </span>
</div>

<!-- Runtime strip -->
<!-- This surface: runtime--strip — host-backed readout + controls strip. Decomposed into this scoped block;
     effort-trigger and build-plan-toggle are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
<style>
  /* This surface: runtime--strip — host-backed readout + controls strip. */
  .runtime--strip {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block: var(--space-2) 0;
    padding-inline: var(--page-gutter);
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* This slot: readout — confirmed model / effort readout. */
  .runtime-readout {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
    white-space: nowrap;
  }

  /* This slot: readout-label */
  .runtime-readout--label {
    color: var(--ink-muted);
    font-size: 0.65rem;
    font-weight: 650;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  /* This slot: readout-value */
  .runtime-readout--value {
    color: var(--ink-secondary);
    font-weight: 620;
  }

  /* This surface: effort-trigger — opens the shared model/effort sheet. */
  /* This state: default */
  :global(.runtime--effort-trigger) {
    display: inline-flex;
    min-inline-size: 44px;
    min-block-size: 44px;
    align-items: center;
    gap: 0.35rem;
    padding-inline: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-secondary);
    cursor: pointer;
  }

  /* This state: hover */
  :global(.runtime--effort-trigger[data-hovered]) {
    background: var(--surface-muted);
  }

  /* This state: focus-visible */
  :global(.runtime--effort-trigger[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  /* End of surface: effort-trigger */

  /* This surface: build-plan-toggle — the Build / Plan segmented toggle. */
  :global(.runtime--control.runtime--mode) {
    display: inline-flex;
    padding: 0.2rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
  }

  /* This state: default */
  :global(.runtime--mode .react-aria-ToggleButton) {
    min-block-size: 2rem;
    padding-inline: 0.7rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 620;
    cursor: pointer;
  }

  /* This state: selected */
  :global(.runtime--mode .react-aria-ToggleButton[data-selected]) {
    background: var(--ink);
    color: var(--ink-inverse);
  }

  /* This state: disabled */
  :global(.runtime--mode .react-aria-ToggleButton[data-disabled]) {
    cursor: default;
    opacity: 0.5;
  }
  /* End of surface: build-plan-toggle */

  /* This slot: status — applied runtime status hint. */
  .runtime--status {
    min-block-size: 1rem;
    white-space: nowrap;
  }
  /* End of surface: runtime--strip */
</style>
