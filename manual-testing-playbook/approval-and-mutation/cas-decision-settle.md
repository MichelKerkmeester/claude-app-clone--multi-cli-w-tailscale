---
title: "PR-014 -- CAS decision settle"
description: "This scenario validates CAS decision settle for `PR-014`. It focuses on compare-and-swap settling of one approval decision under idempotency and revision guards."
stage: routing
version: 1.0.0.0
---

# PR-014 -- CAS decision settle

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-014`.

---

## 1. OVERVIEW

This scenario validates CAS decision settle for `PR-014`. It focuses on compare-and-swap settling of one approval decision under idempotency and revision guards.

### Why This Matters

A decision must apply only when the lease is still pending at the submitted revision, the digest and epoch match, and the idempotency key has not been used. Replayed, raced, stale, and expired decisions must be rejected with a reason.

If a stale or replayed decision were silently applied, approvals could settle out of order or record a decision that no longer matches the pending lease, corrupting the audit trail.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-014` and confirm the expected signals without contradictory evidence.

- Objective: Compare-and-swap settling of one approval decision under idempotency and revision guards.
- Real user request: `Make sure settling an approval decision only lands when the lease is still pending at the submitted revision, with matching digest, epoch, and a fresh idempotency key.`
- Prompt: `Run the approval regression and confirm decision settling stays idempotent and revision-guarded.`
- Expected execution process: Running the approval test suite exercises `approval-service.ts`'s compare-and-swap settle path, including replayed, raced, stale, and expired decisions.
- Expected signals: the named test file passes with 0 failures.
- Desired user-visible outcome: A green run proves that only valid pending decisions settle and every invalid one is rejected with a reason.
- Pass/fail: PASS if the test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures, exit code 0; FAIL if any test in that file fails or the exit code is non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the approval regression and confirm decision settling stays idempotent and revision-guarded.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/approval.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the file `apps/pi-remote-relay/tests/approval.test.ts` and the exit code 0.

### Pass / Fail

- **Pass**: the test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures, exit code 0
- **Fail**: any test in `apps/pi-remote-relay/tests/approval.test.ts` fails, or the command returns a non-zero exit code

### Failure Triage

Re-read the impl anchor `apps/pi-remote-relay/src/approval/approval-service.ts` to verify the settle guards (pending lease at submitted revision, digest, epoch, idempotency key). Then inspect the failing assertion in `apps/pi-remote-relay/tests/approval.test.ts` to see which guard rejected a decision that was expected to settle.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/cas-decision-settle.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/approval/approval-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/approval.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-014
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/cas-decision-settle.md`
