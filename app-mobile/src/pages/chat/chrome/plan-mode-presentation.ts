// This module holds the shared Plan Mode Presentation types, data, and helpers.

// Fail-closed plan-mode presentation for host-confirmed authority (React-free port of PlanModeButton).

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { modeAuthority, type RuntimeUiState } from '$shared/state/runtime.js';
import { runtimeIssueMessage } from '$shared/state/runtime-issues.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

// This state: chart — the ModePresentationKind set; each kind maps to an is-<kind> class seam.
export type ModePresentationKind =
  | 'checking'
  | 'build'
  | 'plan'
  | 'executing'
  | 'applying'
  | 'running'
  | 'stale'
  | 'offline'
  | 'forbidden'
  | 'unsupported'
  | 'extension-error'
  | 'delivery-unknown'
  | 'unavailable';

export interface ModePresentation {
  readonly kind: ModePresentationKind;
  /** The visible label on the button; bounded local copy only. */
  readonly label: string;
  /** Consequence-bearing accessible name (visible label + consequence). */
  readonly accessibleName: string;
  /** Bounded reason shown when the control cannot be used. */
  readonly description: string;
  /** The button is disabled (and the menu cannot open) when true. */
  readonly disabled: boolean;
  /** Non-null when the menu may open but row selection is unsafe. */
  readonly rowsDisabledReason: string | null;
}

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function confirmedLabelFor(confirmedMode: string): string {
  switch (confirmedMode) {
    case 'build':
      return 'Build';
    case 'plan':
      return 'Plan · read-only';
    case 'executing-plan':
      return 'Executing plan';
    default:
      return 'Mode unavailable';
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. FAIL-CLOSED PRESENTATION DERIVATION
// ───────────────────────────────────────────────────────────────────

/** Fail-closed labels from committed runtime + connection; host-confirmed mode only. */
// Do not edit — Default-deny, fail-closed derivation; every value is bounded local copy and no mode is guessed beyond what the host confirmed. Not designer-editable.
export function planModePresentation(
  runtime: RuntimeUiState,
  connection: string,
): ModePresentation {
  const authority = modeAuthority(runtime);
  const confirmedLabel = confirmedLabelFor(authority.confirmedMode);

  if (connection === 'unenrolled') {
    return {
      kind: 'forbidden',
      label: 'Mode unavailable',
      accessibleName: 'Agent mode: Mode unavailable. Device not authorized.',
      description: 'Device not authorized.',
      disabled: true,
      rowsDisabledReason: null,
    };
  }
  if (runtime.state === null || runtime.status === 'checking') {
    return {
      kind: 'checking',
      label: 'Checking mode…',
      accessibleName: 'Agent mode: Checking mode…',
      description: 'Checking with the host…',
      disabled: true,
      rowsDisabledReason: null,
    };
  }
  if (runtime.deliveryUnknown) {
    return {
      kind: 'delivery-unknown',
      label: 'Mode unconfirmed',
      accessibleName: `Agent mode: Mode unconfirmed. Last confirmed: ${confirmedLabel}. Controls disabled.`,
      description: 'Controls disabled until the host confirms.',
      disabled: true,
      rowsDisabledReason: null,
    };
  }

  const phase = runtime.phase ?? 'checking';
  switch (phase) {
    case 'offline':
      return {
        kind: 'offline',
        label: authority.confirmedMode === 'unknown' ? 'Offline' : `${confirmedLabel} · offline`,
        accessibleName: `Agent mode: ${confirmedLabel}. Offline — reconnect to change mode.`,
        description: 'Reconnect to change mode.',
        disabled: true,
        rowsDisabledReason: null,
      };
    case 'foreground-required':
      return {
        kind: 'forbidden',
        label: 'Mode unavailable',
        accessibleName: 'Agent mode: Mode unavailable. Bring Pi Remote to the foreground.',
        description: 'Bring Pi Remote to the foreground.',
        disabled: true,
        rowsDisabledReason: null,
      };
    case 'unsupported':
      return runtime.lastOutcome === 'policy_blocked'
        ? {
            kind: 'extension-error',
            label: 'Mode unavailable',
            accessibleName: 'Agent mode: Mode unavailable. Plan safety could not be verified.',
            description: 'Plan safety could not be verified.',
            disabled: true,
            rowsDisabledReason: null,
          }
        : {
            kind: 'unsupported',
            label: 'Mode unavailable',
            accessibleName: 'Agent mode: Mode unavailable. Plan unavailable on this host.',
            description: 'Plan unavailable on this host.',
            disabled: true,
            rowsDisabledReason: null,
          };
    case 'pending':
      return {
        kind: 'applying',
        label: authority.confirmedMode === 'unknown' ? 'Applying…' : `${confirmedLabel} · Applying…`,
        accessibleName: `Agent mode: ${confirmedLabel}. Applying…`,
        description: 'A change is applying. Wait for the host to confirm.',
        disabled: true,
        rowsDisabledReason: null,
      };
    case 'streaming':
      return {
        kind: 'running',
        label: confirmedLabel,
        accessibleName: `Agent mode: ${confirmedLabel}. Stop the current turn before changing mode.`,
        description: 'Stop the current turn before changing mode.',
        disabled: true,
        rowsDisabledReason: null,
      };
    case 'stale':
      return {
        kind: 'stale',
        label: confirmedLabel,
        accessibleName: `Agent mode: ${confirmedLabel}. The host changed elsewhere.`,
        description: 'The host changed. Refresh to continue.',
        disabled: true,
        rowsDisabledReason: null,
      };
    case 'rate-limited':
    case 'host-unavailable':
    case 'inconsistent-state': {
      const message = runtimeIssueMessage(
        phase === 'rate-limited'
          ? 'rate-limited'
          : phase === 'host-unavailable'
            ? 'host-unavailable'
            : 'invalid-response',
      );
      return {
        kind: 'unavailable',
        label: 'Mode unavailable',
        accessibleName: `Agent mode: Mode unavailable. ${message}`,
        description: message,
        disabled: true,
        rowsDisabledReason: null,
      };
    }
    default:
      break;
  }

  // Settled authority: host-confirmed mode labels the control; executing-plan disables selection.
  switch (authority.confirmedMode) {
    case 'build':
      return {
        kind: 'build',
        label: 'Build',
        accessibleName: 'Agent mode: Build. Pi may request write-capable tools; approvals still apply.',
        description: '',
        disabled: connection !== 'live',
        rowsDisabledReason: null,
      };
    case 'plan':
      return {
        kind: 'plan',
        label: 'Plan · read-only',
        accessibleName: 'Agent mode: Plan, read-only.',
        description: '',
        disabled: connection !== 'live',
        rowsDisabledReason: null,
      };
    case 'executing-plan':
      return {
        kind: 'executing',
        label: 'Executing plan',
        accessibleName: 'Agent mode: Executing plan. Mode cannot be changed.',
        description: 'Plan execution is in progress.',
        disabled: false,
        rowsDisabledReason: 'Plan execution is in progress.',
      };
    default:
      return {
        kind: 'unavailable',
        label: 'Mode unavailable',
        accessibleName: 'Agent mode: Mode unavailable. The host has not confirmed a mode.',
        description: 'The host has not confirmed a mode.',
        disabled: true,
        rowsDisabledReason: null,
      };
  }
}
