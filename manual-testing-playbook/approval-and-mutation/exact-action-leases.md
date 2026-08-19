---
title: "PR-015 -- Exact-action leases"
description: "This scenario validates Exact-action leases for `PR-015`. It focuses on one-decision approval leases bound to the exact canonical action digest."
stage: routing
version: 1.0.0.0
---

# PR-015 -- Exact-action leases

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-015`.

---

## 1. OVERVIEW

This scenario validates Exact-action leases for `PR-015`. It focuses on one-decision approval leases bound to the exact canonical action digest.

### Why This Matters

Each protected tool call must be pinned to the exact action before any decision is made. If a lease could be reused across a changed action, an operator's approval could authorize the wrong mutation. This behavior must be validated so the shipped guarantee — a bounded lease tied to principal, session, epoch, tool, and canonical arguments digest — stays intact.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-015` and confirm the expected signals without contradictory evidence.

- Objective: one-decision approval leases bound to the exact canonical action digest
- Real user request: "Make sure an approval can never be replayed against a different action."
- Prompt: "Run the exact-action lease regression and confirm every lease pins the canonical action digest with a bounded TTL."
- Expected execution process: the regression drives the lease path for protected tool calls and confirms each lease is bound to the canonical arguments digest.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: a green run proves leases are scoped to the exact action and cannot authorize a different mutation.
- Pass/fail: PASS if `npx vitest run apps/pi-remote-relay/tests/approval.test.ts` exits 0 with 0 failures; FAIL if the file reports any failure or exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the exact-action lease regression and confirm every lease pins the canonical action digest with a bounded TTL."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/approval.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0.

### Pass / Fail

- **Pass**: the test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures and exits 0.
- **Fail**: the file reports any failing test or exits non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/approval/approval-service.ts` to confirm the lease is bound to the canonical arguments digest, then inspect the failing assertion in `apps/pi-remote-relay/tests/approval.test.ts` to verify what lease property it checks (digest pinning or TTL bound) before rerunning the command.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/exact-action-leases.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/approval/approval-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/approval.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-015
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/exact-action-leases.md`
