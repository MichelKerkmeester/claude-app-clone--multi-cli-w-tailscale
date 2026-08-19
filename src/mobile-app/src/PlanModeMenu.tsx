// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Mode Menu (exact two-row Build/Plan picker)
// ───────────────────────────────────────────────────────────────────
// The one mode picker, shared by the composer button and the keyboard
// shortcut. It is a read-only surface: arrow keys and focus movement
// never mutate authority, and only row activation reports a choice to
// the caller, which then decides whether a request is safe (Build →
// Plan) or needs the leave confirmation (Plan → Build).

// @ds surface: plan-mode-menu — the exact two-row Build / Plan picker.
// @ds guardrail: do-not-edit — react-aria Menu/MenuItem/Popover wiring (id, onAction,
// isDisabled, Text slots); rows are read-only, focus movement never mutates, and only an
// activated row reports a choice to the caller. Not designer-editable.

import { Menu, MenuItem, Popover, Text } from 'react-aria-components';

import type { ConfirmedMode } from './runtime.js';

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

export function PlanModeMenu({
  confirmedMode,
  rowsDisabled,
  rowsDisabledReason,
  onSelect,
}: PlanModeMenuProps) {
  return (
    <Popover className="plan-mode-popover">{/* @ds slot: popover — floating placement chrome. */}
      <Menu
        aria-label="Agent mode"
        className="plan-mode-menu"
        onAction={(key) => {
          if (key === 'build' || key === 'plan') onSelect(key);
        }}
      >
        {/* @ds state: row build — immediately requestable when safe. */}
        <MenuItem
          id="build"
          className="plan-mode-row"
          isDisabled={rowsDisabled || confirmedMode === 'build'}
        >
          <Text slot="label">Build</Text>
          <Text slot="description">{BUILD_DESCRIPTION}</Text>
          {confirmedMode === 'build' && <CheckGlyph />}
        </MenuItem>
        {/* @ds state: row plan — read-only target; only activation reports. */}
        <MenuItem
          id="plan"
          className="plan-mode-row"
          isDisabled={rowsDisabled || confirmedMode === 'plan'}
        >
          <Text slot="label">Plan</Text>
          <Text slot="description">{PLAN_DESCRIPTION}</Text>
          {confirmedMode === 'plan' && <CheckGlyph />}
        </MenuItem>
      </Menu>
      {rowsDisabled && rowsDisabledReason !== null && (
        /* @ds slot: note — bounded reason when a row cannot be chosen. */
        <p className="plan-mode-menu-note">{rowsDisabledReason}</p>
      )}
    </Popover>
  );
}

/* @ds slot: check-glyph — the ✓ on the confirmed row; strokes inherit currentColor. */
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
