<script module lang="ts">
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

  import './runtime-strip.css';

  let {
    controls,
    sheetOpen,
    onOpenEffortSheet,
    effortTriggerRef = $bindable(null),
  }: RuntimeStripProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // Host-confirmed selection only; Bits UI single-type allows emptying, so a local
  // Copy is restored to hostMode after every change (non-optimistic, no empty).
  let modeValue = $state('');

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

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    modeValue = hostMode;
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onModeChange(next: string): void {
    if (next === 'build' || next === 'plan') void controls.setMode(next);
    modeValue = hostMode;
  }
</script>

<!-- @ds surface: runtime-strip — host-backed readout + controls strip. -->
<div class="runtime-strip" role="group" aria-label="Runtime controls">
  <!-- @ds slot: model-readout — confirmed model readout. -->
  <span class="runtime-readout runtime-model-readout">
    <span class="runtime-readout-label">Model</span>
    <span class="runtime-readout-value">{modelLabel}</span>
  </span>

  <!-- @ds surface: effort-trigger — opens the shared model/effort sheet. -->
  <!-- @ds guardrail: react-aria Button wiring (ref, aria-haspopup/expanded, onPress) — Not designer-editable. -->
  <Button
    class="runtime-effort-trigger"
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
    <span class="runtime-readout-label">Effort</span>
    <span class="runtime-readout-value">{effortText}</span>
    <!-- @ds slot: chevron-up — inline glyph; strokes inherit currentColor. -->
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

  <!-- @ds surface: build-plan-toggle — Build / Plan segmented toggle. -->
  <!-- @ds guardrail: react-aria ToggleButtonGroup wiring (selection + onChange + aria) — Not designer-editable. -->
  <!-- @ds state: build · plan — selection is disabled while the authority is not ready; the
      label never precedes host confirmation (non-optimistic). -->
  <ToggleGroup
    class="runtime-control runtime-mode"
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

  <!-- @ds slot: status — applied runtime status hint. -->
  <!-- @ds state: checking · applying · stale · error — the runtime status hint. -->
  <!-- @ds guardrail: do-not-edit — role="status" + aria-live="polite" live region. -->
  <span class="runtime-status" role="status" aria-live="polite">
    {statusHint(runtime.status, runtime.pending !== null)}
  </span>
</div>

<!-- @ds surface: runtime-strip — host-backed readout + controls strip. Decomposed into this co-located CSS file;
     effort-trigger and build-plan-toggle are owned solely by this component so they move with it.
     Child-primitive classes and react-aria/runtime data-attributes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
