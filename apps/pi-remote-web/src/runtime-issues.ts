// ───────────────────────────────────────────────────────────────────
// MODULE: Bounded Runtime Issue Copy
// ───────────────────────────────────────────────────────────────────
// The browser may never render host or transport text. Every runtime
// failure maps to one code from the protocol allowlist, and every code
// maps to exactly one string from this local catalog. Formatters accept
// only these codes, so raw status, bodies, server reasons, host reasons,
// and RPC reasons can never reach visible or assistive copy.

import type { RuntimeIssueCode } from '@pi-remote/pi-rpc-protocol';

export type { RuntimeIssueCode };

export const RUNTIME_ISSUE_COPY: Readonly<Record<RuntimeIssueCode, string>> = {
  offline: 'You’re offline. Reconcile when connectivity returns.',
  'foreground-required': 'Another device is controlling Pi.',
  'rate-limited': 'Too many changes — try again shortly.',
  'host-unavailable': 'Pi is not ready to change runtime settings.',
  'delivery-unknown': 'Pi may have received this change. Reconcile before trying again.',
  'invalid-response': 'Pi returned an unreadable response. Reconcile to refresh.',
  unsupported: 'This host does not support this change.',
};

/** Local catalog lookup only; unknown strings can never be formatted. */
export function runtimeIssueMessage(issueCode: RuntimeIssueCode): string {
  return RUNTIME_ISSUE_COPY[issueCode];
}
