// ───────────────────────────────────────────────────────────────────
// MODULE: Persistent Plan Mode Button (host-confirmed status + menu)
// ───────────────────────────────────────────────────────────────────
// The one always-visible mode control in the sticky composer toolbar,
// placed immediately after the "+" tools button. It presents only
// host-confirmed authority — Build, Plan · read-only, Executing plan,
// or a fail-closed unavailable/pending copy — and never flashes an
// unconfirmed Build. The button itself never mutates anything: opening
// the two-row menu moves focus only, and only a row activation (or the
// guarded keyboard path) can lead to a mode request.

import { useEffect } from 'react';
import { Button, MenuTrigger } from 'react-aria-components';
import type { RefObject } from 'react';

import { PlanModeMenu } from './PlanModeMenu.js';
import { modeAuthority, type RuntimeUiState } from './runtime.js';
import { runtimeIssueMessage } from './runtime-issues.js';

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

/**
 * Derive the full fail-closed presentation from the committed runtime and the
 * session connection. Every branch is bounded local copy; the host-confirmed
 * mode is the only data that can ever label the control as Build or Plan.
 */
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

  // Settled ready authority: only the host-confirmed mode may label the
  // control, and an executing-plan state disables selection with a reason.
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
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
}

export function PlanModeButton({
  runtime,
  connection,
  isOpen,
  onOpenChange,
  onSelectPlan,
  onSelectBuild,
  buttonRef,
}: PlanModeButtonProps) {
  const presentation = planModePresentation(runtime, connection);
  const authority = modeAuthority(runtime);

  // The ARIA keyboard-shortcuts hint is not in this react-aria release's
  // filtered prop list, so it is attached imperatively and survives
  // re-renders (React never removes attributes it did not set).
  useEffect(() => {
    buttonRef.current?.setAttribute('aria-keyshortcuts', 'Shift+Tab Meta+Shift+M');
  }, [buttonRef]);

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        ref={buttonRef}
        type="button"
        className={`plan-mode-button is-${presentation.kind}`}
        aria-label={presentation.accessibleName}
        isDisabled={presentation.disabled}
      >
        <ModeGlyph kind={presentation.kind} />
        <span className="plan-mode-label">{presentation.label}</span>
      </Button>
      <PlanModeMenu
        confirmedMode={authority.confirmedMode}
        rowsDisabled={presentation.rowsDisabledReason !== null}
        rowsDisabledReason={presentation.rowsDisabledReason}
        onSelect={(target) => {
          if (target === 'plan') onSelectPlan();
          else onSelectBuild();
        }}
      />
    </MenuTrigger>
  );
}

function ModeGlyph({ kind }: { readonly kind: ModePresentationKind }) {
  switch (kind) {
    case 'plan':
      return <LockGlyph />;
    case 'executing':
      return <PlayGlyph />;
    case 'checking':
      return <PendingGlyph />;
    case 'build':
      return <BoltGlyph />;
    default:
      return <WarningGlyph />;
  }
}

function BoltGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M13 3L5 13.5h5L9 21l8-10.5h-5L13 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <rect
        x="5"
        y="10.5"
        width="14"
        height="9.5"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" />
    </svg>
  );
}

function PendingGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path
        d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M12 4L21 20H3L12 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
    </svg>
  );
}
