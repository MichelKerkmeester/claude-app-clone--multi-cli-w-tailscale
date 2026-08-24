// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Final Approval Gate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { approvalActionDigest, type ApprovalAction } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type FinalGateDenial =
  | 'digest-mismatch'
  | 'stale-epoch'
  | 'expired'
  | 'duplicate'
  | 'restart-invalidated'
  | 'revoked'
  | 'not-approved'
  | 'policy-disabled'
  | 'principal-mismatch'
  | 'session-mismatch'
  | 'policy-version-mismatch';

export interface FinalGateLease {
  readonly principal: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly digest: string;
  readonly policyVersion: number;
  readonly expiresAt: string;
  readonly status: string;
}

export type FinalGateResult =
  | { readonly allowed: true; readonly digest: string }
  | { readonly allowed: false; readonly reason: FinalGateDenial };

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Recompute the exact action at the final boundary without mutating lease state. */
export function verifyFinalGate(input: {
  readonly action: ApprovalAction;
  readonly lease: FinalGateLease;
  readonly currentEpoch: string;
  readonly currentPolicyVersion: number;
  readonly policyAllows: boolean;
  readonly now: number;
}): FinalGateResult {
  const { action, lease } = input;
  if (!input.policyAllows) return { allowed: false, reason: 'policy-disabled' };
  if (lease.status === 'restart-invalidated')
    return { allowed: false, reason: 'restart-invalidated' };
  if (lease.status === 'revoked') return { allowed: false, reason: 'revoked' };
  if (lease.status === 'consumed') return { allowed: false, reason: 'duplicate' };
  if (lease.status !== 'approved') return { allowed: false, reason: 'not-approved' };
  if (Date.parse(lease.expiresAt) <= input.now) return { allowed: false, reason: 'expired' };
  if (action.epoch !== input.currentEpoch || lease.epoch !== input.currentEpoch) {
    return { allowed: false, reason: 'stale-epoch' };
  }
  if (lease.principal !== action.principal) return { allowed: false, reason: 'principal-mismatch' };
  if (lease.sessionId !== action.sessionId) return { allowed: false, reason: 'session-mismatch' };
  if (
    lease.policyVersion !== input.currentPolicyVersion ||
    action.policyVersion !== input.currentPolicyVersion
  ) {
    return { allowed: false, reason: 'policy-version-mismatch' };
  }
  const digest = approvalActionDigest(action);
  return digest === lease.digest
    ? { allowed: true, digest }
    : { allowed: false, reason: 'digest-mismatch' };
}
