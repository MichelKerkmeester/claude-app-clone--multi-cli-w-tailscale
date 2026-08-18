// ───────────────────────────────────────────────────────────────────
// MODULE: Mode Transition Announcer
// ───────────────────────────────────────────────────────────────────
// One permanently mounted polite live region carries settled mode
// transitions; a separate pre-mounted alert region carries conflicts,
// permission loss, and delivery uncertainty. Announcements are keyed by
// the settled presentation so each transition announces exactly once,
// and the regions are inert text nodes — they never move focus.

// @ds surface: runtime-mode-announcer — dual polite/alert live regions for mode transitions.
// @ds guardrail: do-not-edit — the announce-once settle-key effect (primedRef/announcedKeyRef)
// and the ALERT_KINDS routing; the regions are inert text nodes that never move focus. Not
// designer-editable.

import { useEffect, useRef, useState } from 'react';

import { planModePresentation, type ModePresentationKind } from './PlanModeButton.js';
import type { RuntimeUiState } from './runtime.js';

// @ds state: alert — conflicts · permission loss · delivery uncertainty route to the alert region.
const ALERT_KINDS: ReadonlySet<ModePresentationKind> = new Set([
  'stale',
  'forbidden',
  'extension-error',
  'delivery-unknown',
]);

function politeCopyFor(kind: ModePresentationKind): string {
  switch (kind) {
    case 'build':
      return 'Build mode on. Changes still require approval.';
    case 'plan':
      return 'Plan mode on. Pi is read-only.';
    case 'executing':
      return 'Plan execution is in progress.';
    default:
      return '';
  }
}

function alertCopyFor(kind: ModePresentationKind): string {
  switch (kind) {
    case 'stale':
      return 'Mode changed on another device.';
    case 'forbidden':
      return 'Device not authorized. Mode controls are disabled.';
    case 'extension-error':
      return 'Plan safety could not be verified. Mode controls are disabled.';
    case 'delivery-unknown':
      return 'Mode could not be verified. Controls disabled.';
    default:
      return '';
  }
}

export interface RuntimeModeAnnouncerProps {
  readonly runtime: RuntimeUiState;
  readonly connection: string;
}

export function RuntimeModeAnnouncer({ runtime, connection }: RuntimeModeAnnouncerProps) {
  const [polite, setPolite] = useState('');
  const [alert, setAlert] = useState('');
  // The last announced settle key; the first settle is recorded without an
  // announcement so only actual transitions are spoken.
  const announcedKeyRef = useRef<string | null>(null);
  const primedRef = useRef(false);

  const presentation = planModePresentation(runtime, connection);

  useEffect(() => {
    const key = presentation.kind;
    if (!primedRef.current) {
      primedRef.current = true;
      announcedKeyRef.current = key;
      return;
    }
    if (announcedKeyRef.current === key) return;
    announcedKeyRef.current = key;
    if (ALERT_KINDS.has(key)) {
      setAlert(alertCopyFor(key));
    } else if (key === 'build' || key === 'plan' || key === 'executing') {
      setPolite(politeCopyFor(key));
    }
  }, [presentation.kind]);

  return (
    <>
      {/* @ds state: polite — settled transitions (build · plan · executing).
          @ds guardrail: do-not-edit — role="status" + aria-live="polite" + aria-atomic region. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      {/* @ds state: alert — conflicts · permission loss · delivery uncertainty.
          @ds guardrail: do-not-edit — role="alert" region. */}
      <div className="sr-only" role="alert">
        {alert}
      </div>
    </>
  );
}
