---
title: "PR-016 -- Final-gate digest"
description: "This scenario validates Final-gate digest for `PR-016`. It focuses on the pre-execution recomputation of the action digest and the recheck of authority gates before the lease is consumed."
stage: routing
version: 1.0.0.0
---

# PR-016 -- Final-gate digest

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-016`.

---

## 1. OVERVIEW

This scenario validates Final-gate digest for `PR-016`. It focuses on the pre-execution recomputation of the action digest and the recheck of authority gates before the lease is consumed.

### Why This Matters

The final gate is the last boundary between an approved action and its execution. If the digest is not recomputed here — or the epoch, policy version, expiry, lease status, or policy enablement is not rechecked — a stale or tampered action could reach execution after it was authorized. A silent regression here would let authority grant on an action that no longer matches what was approved, so this boundary must stay verified.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-016` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the relay recomputes the canonical digest from the live action at the final boundary and rechecks every authority gate before consuming the lease.
- Real user request: `Make sure the final authority check still recomputes the digest and rechecks all gates before the lease is consumed.`
- Prompt: `Run the final-gate digest regression and confirm the digest is recomputed and every authority gate is rechecked before the lease is marked consumed.`
- Expected execution process: running the approval test suite exercises the final-gate recomputation of the canonical digest from the live action and the rechecks of epoch, policy version, expiry, lease status, and policy enablement, and verifies the lease is only then marked consumed; the extension boundary runs the same digest check against the relay authority routes.
- Expected signals: the named test file passes with 0 failures
- Desired user-visible outcome: a green run proves the shipped relay still recomputes the exact action digest at the final boundary and refuses to grant authority unless every gate passes
- Pass/fail: PASS if the test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures and exit code 0; FAIL if any test fails or the exit code is nonzero

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the final-gate digest regression and confirm the digest is recomputed and every authority gate is rechecked before the lease is marked consumed.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/approval.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for `apps/pi-remote-relay/tests/approval.test.ts` showing the passing test count with 0 failures, and record the exit code 0.

### Pass / Fail

- **Pass**: the test file `apps/pi-remote-relay/tests/approval.test.ts` passes with 0 failures and the command exits 0
- **Fail**: one or more tests fail, or the command exits nonzero

### Failure Triage

First, re-read the implementation anchor `apps/pi-remote-relay/src/approval/final-gate.ts` to confirm the digest recomputation and gate rechecks are present and in the expected order. Then inspect the failing assertion in `apps/pi-remote-relay/tests/approval.test.ts` to see which gate or digest expectation diverged from the current behavior.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/final-gate-digest.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/approval/final-gate.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/approval.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-016
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/final-gate-digest.md`
