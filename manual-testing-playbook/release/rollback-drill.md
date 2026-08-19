---
title: "PR-027 -- Rollback drill"
description: "This scenario validates Rollback drill for `PR-027`. It focuses on exercising authority drain, backup restore, and down-migration on disposable state."
stage: routing
version: 1.0.0.0
---

# PR-027 -- Rollback drill

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-027`.

---

## 1. OVERVIEW

This scenario validates Rollback drill for `PR-027`. It focuses on exercising authority drain, backup restore, and down-migration on disposable state.

### Why This Matters

The drill is the executable proof that all destructive paths can be rehearsed safely on disposable state before they are ever needed against real data. If the drain, restore, or down-migration leg silently regressed, operators would only discover the failure during a genuine rollback under pressure. The drill also locks in data-preservation guarantees — session and indeterminate rows survive the down-migration, and the native session history outside the relay stays untouched.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-027` and confirm the expected signals without contradictory evidence.

- Objective: Rehearse authority drain, backup restore, and down-migration to version 6 on disposable state.
- Real user request: "Make sure the rollback path still works end-to-end against throwaway state before we ever need it for real."
- Prompt: "Run the rollback drill and confirm the kill switch drains authority, the damaged backup restores, and the down-migration preserves session and indeterminate rows."
- Expected execution process: Builds a disposable database, approves and consumes a lease, flips the kill switch to drain authority, damages and restores the backup, and migrates down to version 6 while preserving session and indeterminate rows. The native session history outside the relay is left untouched.
- Expected signals: the test file `tests/rollback-drill.test.ts` passes with 0 failures, exit code 0
- Desired user-visible outcome: A green run proves the whole rollback sequence executes against disposable state without touching the native session history outside the relay.
- Pass/fail: PASS if the drill test runs and exits 0 with 0 failures; FAIL if any drill assertion fails or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the rollback drill and confirm the kill switch drains authority, the damaged backup restores, and the down-migration preserves session and indeterminate rows."

### Commands

1. `npx vitest run tests/rollback-drill.test.ts`

### Expected

The test file `tests/rollback-drill.test.ts` passes with 0 failures and an exit code of 0.

### Evidence

Capture the vitest summary line for the named file (`tests/rollback-drill.test.ts`) and the exit code (0).

### Pass / Fail

- **Pass**: the drill test file passes with 0 failures and the run exits 0.
- **Fail**: any assertion in the drill file fails or the run exits nonzero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/release/rollback-drill.ts` to confirm which leg (drain, restore, or down-migration) the failing assertion targets, then inspect the matching assertions in `tests/rollback-drill.test.ts`. Verify whether the failure reflects a changed behavior that the drill should now encode or an actual regression.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/release/rollback-drill.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/release/rollback-drill.ts` | Primary implementation anchor |
| `tests/rollback-drill.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: release
- Playbook ID: PR-027
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `release/rollback-drill.md`
