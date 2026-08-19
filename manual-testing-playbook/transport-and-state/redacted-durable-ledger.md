---
title: "PR-003 -- Redacted durable ledger"
description: "This scenario validates Redacted durable ledger for `PR-003`. It focuses on the SQLite ledger that persists redacted envelopes with epoch ordering, deduplication, and retention floors."
stage: routing
version: 1.0.0.0
---

# PR-003 -- Redacted durable ledger

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-003`.

---

## 1. OVERVIEW

This scenario validates Redacted durable ledger for `PR-003`. It focuses on the SQLite ledger that persists redacted envelopes with epoch ordering, deduplication, and retention floors.

### Why This Matters

The store is the only persistence layer in the relay, so the ledger's correctness is load-bearing for everything that ships state forward. It owns the envelope table, the epoch and stream state, the session catalog projection, the transcript pages, and the migration runner that brings the schema up on open. If this silently regressed, restarts would lose ordering guarantees, re-persist duplicates, or drop envelopes that should be retained.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-003` and confirm the expected signals without contradictory evidence.

- Objective: Verify the SQLite ledger still persists redacted envelopes with correct epoch ordering, deduplication, and retention floors.
- Real user request: "Make sure the relay's durable ledger still survives restarts without losing ordering, re-persisting duplicates, or dropping envelopes that should be retained."
- Prompt: "Run the store regression and confirm the SQLite ledger persists redacted envelopes with epoch ordering, deduplication, and retention floors."
- Expected execution process: Running the vitest command exercises the store's persistence contract — the envelope table, epoch and stream ordering, deduplication of already-recorded envelopes, and the retention floor that prevents premature eviction — plus the migration runner that brings the schema up on open.
- Expected signals: The test file `apps/pi-remote-relay/tests/store.test.ts` passes with 0 failures and exit code 0.
- Desired user-visible outcome: A green run proves the shipped ledger persists redacted envelopes durably and consistently, so a restart yields the same ordered, deduplicated, retentioned state with an up-to-date schema.
- Pass/fail: PASS if the store test file passes with 0 failures and exit code 0; FAIL if any test in the file fails or exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the store regression and confirm the SQLite ledger persists redacted envelopes with epoch ordering, deduplication, and retention floors."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/store.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/store.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named store file showing 0 failed tests and exit code 0.

### Pass / Fail

- **Pass**: `npx vitest run apps/pi-remote-relay/tests/store.test.ts` completes with 0 failures and exit code 0.
- **Fail**: Any test in the file fails, or the command exits non-zero.

### Failure Triage

If a test fails, re-read the implementation anchor `apps/pi-remote-relay/src/store/relay-store.ts` to confirm the envelope table, epoch ordering, deduplication, and retention logic match the assertion, then check whether the failure is an ordering, dedup, retention, or migration concern before changing the test.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/redacted-durable-ledger.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/store/relay-store.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/store.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-003
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/redacted-durable-ledger.md`
