---
title: "PR-013 -- Accept-edits grants"
description: "This scenario validates accept-edits grants for `PR-013`. It focuses on bounded grants that auto-approve a fixed number of edits within named enabled tools."
stage: routing
version: 1.0.0.0
---

# PR-013 -- Accept-edits grants

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-013`.

---

## 1. OVERVIEW

This scenario validates accept-edits grants for `PR-013`. It focuses on bounded grants that auto-approve a fixed number of edits within named enabled tools.

### Why This Matters

Accept-edits grants are the enforcement point that keeps a session's write allowance bounded: each approved action must consume exactly one unit of a counted allowance within a hard TTL ceiling. If the counting, principal/session/epoch matching, or the no-repeat-after-denial rule silently regressed, a session could exceed its authorized edit budget or replay a previously rejected action. This behavior is load-bearing for safe, auditable mutation, so it must be re-validated deterministically.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-013` and confirm the expected signals without contradictory evidence.

- Objective: Prove bounded grants auto-approve a fixed number of edits inside named enabled tools, each action consuming one allowance, scoped by grant principal, session, and epoch, with no replay of a previously denied action.
- Real user request: `"Make sure an approved edit allowance still respects its count, its TTL ceiling, and its session/epoch scope, and never re-approves something that was already denied."`
- Prompt: `Run the accept-edits grants regression and confirm the bounded-grant enforcement in the approval service still passes without regressions.`
- Expected execution process: Runs the approval regression suite, exercising grant creation, per-action allowance consumption, TTL enforcement, principal/session/epoch matching, and the no-repeat-after-denial guard across the named edit and write tools.
- Expected signals: the test file passes with 0 failures, exit code 0.
- Desired user-visible outcome: A green run proves the shipped behavior — an operator-issued grant authorizes only the counted number of edit/write actions within its TTL, scoped to the right principal and epoch, and never repeats a denied action.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test fails or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the accept-edits grants regression and confirm the bounded-grant enforcement in the approval service still passes without regressions.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/approval.test.ts`

### Expected

the test file passes with 0 failures, exit code 0.

### Evidence

What to capture: the vitest summary line for `apps/pi-remote-relay/tests/approval.test.ts` reflecting 0 failures, plus the exit code of the command (0).

### Pass / Fail

- **Pass**: the test file passes with 0 failures and the command exits 0.
- **Fail**: any test in the file fails or the command exits nonzero.

### Failure Triage

1. Re-read the implementation anchor `apps/pi-remote-relay/src/approval/approval-service.ts` to confirm the grant-count, TTL, and no-repeat guards still match the test's assertions.
2. Inspect the failing assertion in `apps/pi-remote-relay/tests/approval.test.ts` to see whether the failure is in allowance consumption, scope matching, or the denied-action replay guard, and isolate the exact grant boundary.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/accept-edits-grants.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/approval/approval-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/approval.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-013
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/accept-edits-grants.md`
