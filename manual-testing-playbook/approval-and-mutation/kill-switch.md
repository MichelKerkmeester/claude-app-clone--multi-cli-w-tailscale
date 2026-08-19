---
title: "PR-017 -- Kill switch"
description: "This scenario validates Kill switch for `PR-017`. It focuses on verifying a mutation policy that disables the enabled command family and revokes outstanding authority."
stage: routing
version: 1.0.0.0
---

# PR-017 -- Kill switch

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-017`.

---

## 1. OVERVIEW

This scenario validates Kill switch for `PR-017`. It focuses on verifying a mutation policy that disables the enabled command family and revokes outstanding authority.

### Why This Matters

Only one command family can be enabled at a time, so the kill switch is the mechanism that tears the active one down. If the policy silently stopped emitting the disable reason, the approval service could no longer revoke pending and approved leases or abort in-flight execution, leaving stale authority live when the operator believes it is dead. Because the kill switch composes the aborted state from the mutation environment flags, a regression here is invisible until an operator tries to revoke authority and the leased command keeps running.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-017` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the kill switch policy disables the enabled command family and composes the disable reason the approval service uses to revoke outstanding authority.
- Real user request: "Make sure flipping the kill switch off actually disables the command family and revokes any leases that are still open."
- Prompt: "Run the kill switch mutation regression and confirm the disabled request carries the disable reason and revokes outstanding authority with no failures."
- Expected execution process: Running the vitest suite for the relay approval contract exercises the mutation-policy kill switch, the compose of the switch from environment flags, and the approval service's revocation of pending and approved leases plus the abort of in-flight execution.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: A green run proves a disabled command family is rejected and all outstanding authority is revoked, so no process retains permission to keep executing.
- Pass/fail: PASS if the approval test file passes with 0 failures and exit code 0; FAIL if any test in the file fails or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the kill switch mutation regression and confirm the disabled request carries the disable reason and revokes outstanding authority with no failures."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/approval.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for the file `apps/pi-remote-relay/tests/approval.test.ts` showing the passed test count, and confirm exit code 0.

### Pass / Fail

- **Pass**: the test file passes with 0 failures and the run exits 0.
- **Fail**: any test in the file fails, or the run exits with a nonzero code.

### Failure Triage

Re-read the kill-switch branch in `apps/pi-remote-relay/src/policy/mutation-policy.ts` to confirm the disable reason is still composed from the mutation environment flags, then check the failing assertion in `apps/pi-remote-relay/tests/approval.test.ts` to see whether it expects the disable reason string or the revocation path exactly as the implementation emits it.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/kill-switch.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/policy/mutation-policy.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/approval.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-017
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/kill-switch.md`
