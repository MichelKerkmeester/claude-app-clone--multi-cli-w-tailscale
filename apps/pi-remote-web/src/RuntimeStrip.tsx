// ───────────────────────────────────────────────────────────────────
// MODULE: Host-Backed Runtime Control Strip (Model / Effort / Build·Plan)
// ───────────────────────────────────────────────────────────────────
// The compact composer-adjacent strip. The confirmed model reads as a
// static span, the confirmed effort is a summary trigger that opens the
// shared sheet at the effort section, and Build/Plan stays a separate
// host-confirmed toggle. No picker or mutation implementation lives
// here: the sheet owns the surface and the runtime hook owns mutations.

import { Button, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import type { RefObject } from 'react';

import { effortTriggerName, effortTriggerText } from './effort.js';
import type { RuntimeControls } from './runtime.js';

export interface RuntimeStripProps {
  readonly controls: RuntimeControls;
  /** Whether the shared model/effort sheet is open (for aria-expanded). */
  readonly sheetOpen: boolean;
  /** Opens the shared sheet at the effort section. */
  readonly onOpenEffortSheet: () => void;
  /** Attached to the effort trigger so the sheet can restore focus to it. */
  readonly effortTriggerRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The three host-authoritative controls. Every label reflects host-confirmed
 * state only; a mutation shows pending on the sheet and never an optimistic
 * value, and the Build/Plan toggle disables whenever authority is not `ready`.
 */
export function RuntimeStrip({
  controls,
  sheetOpen,
  onOpenEffortSheet,
  effortTriggerRef,
}: RuntimeStripProps) {
  const { runtime, setMode } = controls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;

  const modelLabel = state?.model?.label ?? '—';
  const effortText = effortTriggerText(state?.thinkingLevel, state?.availableThinkingLevels ?? []);
  const planActive = state?.mode === 'plan' || state?.mode === 'executing-plan';

  // @ds surface: runtime-strip — host-backed readout + controls strip.
  return (
    <div className="runtime-strip" role="group" aria-label="Runtime controls">
      <span className="runtime-readout runtime-model-readout">
        <span className="runtime-readout-label">Model</span>
        <span className="runtime-readout-value">{modelLabel}</span>
      </span>

      {/* @ds surface: effort-trigger — opens the shared model/effort sheet. */}
      {/* @ds guardrail: react-aria Button wiring (ref, aria-haspopup/expanded, onPress) — not designer-editable. */}
      <Button
        ref={effortTriggerRef}
        className="runtime-effort-trigger"
        aria-label={effortTriggerName(effortText)}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        aria-controls="model-effort-dialog"
        onPress={onOpenEffortSheet}
        style={{ minBlockSize: '44px' }}
      >
        <span className="runtime-readout-label">Effort</span>
        <span className="runtime-readout-value">{effortText}</span>
        <ChevronUpGlyph />
      </Button>

      {/* @ds surface: build-plan-toggle — Build / Plan segmented toggle. */}
      {/* @ds guardrail: react-aria ToggleButtonGroup wiring (selection + onChange + aria) — not designer-editable. */}
      <ToggleButtonGroup
        className="runtime-control runtime-mode"
        aria-label="Build or Plan"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={state ? [planActive ? 'plan' : 'build'] : []}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next === 'build' || next === 'plan') void setMode(next);
        }}
      >
        <ToggleButton id="build" isDisabled={disabled}>
          Build
        </ToggleButton>
        <ToggleButton id="plan" isDisabled={disabled}>
          {state?.mode === 'plan' ? 'Plan · read-only' : 'Plan'}
        </ToggleButton>
      </ToggleButtonGroup>

      <span className="runtime-status" role="status" aria-live="polite">
        {statusHint(runtime.status, runtime.pending !== null)}
      </span>
    </div>
  );
}

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

/* @ds slot: chevron-up — inline glyph; strokes inherit currentColor. */
function ChevronUpGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M6 15l6-6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
