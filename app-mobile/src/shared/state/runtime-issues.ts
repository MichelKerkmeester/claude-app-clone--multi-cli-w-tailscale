// ───────────────────────────────────────────────────────────────────
// MODULE: Bounded Runtime Issue Copy
// ───────────────────────────────────────────────────────────────────
// The browser may never render host or transport text. Every runtime
// Failure maps to one code from the protocol allowlist, and every code
// Maps to exactly one bounded copy plus recovery classification. Formatters accept
// Only these codes, so raw status, bodies, server reasons, host reasons,
// And RPC reasons can never reach visible or assistive copy.

import type { RuntimeIssueCode } from '@pi-remote/pi-rpc-protocol';

export type { RuntimeIssueCode };

export interface RuntimeIssueEntry {
  readonly copy: string;
  /** Whether waiting, reconnecting, or reconciling can clear the condition. */
  readonly repairable: boolean;
}

export const RUNTIME_ISSUE_COPY: Readonly<Record<RuntimeIssueCode, RuntimeIssueEntry>> = {
  offline: {
    copy: 'You’re offline. Reconcile when connectivity returns.',
    repairable: true,
  },
  'foreground-required': {
    copy: 'Another device is controlling Pi.',
    repairable: true,
  },
  'rate-limited': {
    copy: 'Too many changes — try again shortly.',
    repairable: true,
  },
  'host-unavailable': {
    copy: 'Pi is not ready to change runtime settings.',
    repairable: true,
  },
  'delivery-unknown': {
    copy: 'Pi may have received this change. Reconcile before trying again.',
    repairable: true,
  },
  'invalid-response': {
    copy: 'Pi returned an unreadable response. Reconcile to refresh.',
    repairable: true,
  },
  unsupported: {
    copy: 'This host does not support this change.',
    repairable: false,
  },
};

/** Local catalog lookup only; unknown strings can never be formatted. */
export function runtimeIssueMessage(issueCode: RuntimeIssueCode): string {
  return RUNTIME_ISSUE_COPY[issueCode].copy;
}

/** Local catalog lookup only; repairability never comes from host or transport data. */
export function runtimeIssueRepairable(issueCode: RuntimeIssueCode): boolean {
  return RUNTIME_ISSUE_COPY[issueCode].repairable;
}
