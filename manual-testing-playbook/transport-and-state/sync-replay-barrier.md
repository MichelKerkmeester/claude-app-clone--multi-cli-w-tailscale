---
title: "PR-005 -- Sync and replay barrier"
description: "This scenario validates Sync and replay barrier for `PR-005`. It focuses on the replay-snapshot/live-delta interleaving barrier."
stage: routing
version: 1.0.0.0
---

# PR-005 -- Sync and replay barrier

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-005`.

---

## 1. OVERVIEW

This scenario validates Sync and replay barrier for `PR-005`. It focuses on the barrier that prevents pre-snapshot messages from interleaving into live delivery.

### Why This Matters

The hub is the publish and subscribe spine of the relay: every committed envelope is broadcast to matching subscriptions, and each subscription opens with a replay plan that is frozen before live delivery begins. If the replay and live paths ever interleave, a subscriber can receive a pre-snapshot message out of order after the snapshot, silently corrupting state. Validating this barrier is required to guarantee that joined replay snapshots and live deltas never mix, and that a regression here produces stale or duplicated state across the whole relay.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-005` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the sync hub joins replay snapshots and live deltas without interleaving pre-snapshot messages.
- Real user request: "Make sure joining a sync session never lets pre-snapshot messages leak into live delivery after the snapshot."
- Prompt: "Run the sync regression and confirm the replay barrier holds, so the snapshot replays fully before any live delta is delivered."
- Expected execution process: The vitest run exercises the sync hub's replay-snapshot join behavior, broadcasting committed envelopes to matching subscriptions and freezing each subscription's replay plan before live delivery begins, then asserts that no pre-snapshot message interleaves into the live stream.
- Expected signals: The named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: A green run proves the replay barrier holds and joined snapshots and live deltas are delivered strictly in order.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test in the file fails or the exit code is non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the sync regression and confirm the replay barrier holds, so the snapshot replays fully before any live delta is delivered."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/sync.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/sync.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file (the per-file pass count with 0 failures) and the exit code 0.

### Pass / Fail

- **Pass**: The named test file passes with 0 failures and the command exits 0.
- **Fail**: Any test in the file fails, any failure count is non-zero, or the exit code is non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/replay/sync.ts` to confirm the replay plan is frozen before live delivery begins, then inspect the failing assertion in `apps/pi-remote-relay/tests/sync.test.ts` to determine whether a pre-snapshot message interleaved or an ordering expectation shifted.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/sync-replay-barrier.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/replay/sync.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/sync.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-005
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/sync-replay-barrier.md`
