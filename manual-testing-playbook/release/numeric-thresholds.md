---
title: "PR-026 -- Numeric thresholds"
description: "This scenario validates numeric thresholds for `PR-026`. It focuses on declared numeric limits for release metrics with machine and operator measurement sources."
stage: routing
version: 1.0.0.0
---

# PR-026 -- Numeric thresholds

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-026`.

---

## 1. OVERVIEW

This scenario validates Numeric thresholds for `PR-026`. It focuses on declared numeric limits for release metrics with machine and operator measurement sources.

### Why This Matters

Release metrics must carry enforceable numeric bounds rather than open-ended signals. Eight metrics declare a finite threshold, a max or min comparison, a unit, and a source, so a silently inflated or missing bound would let risky builds pass as green. Distinguishing machine from operator sources matters because a missing machine measurement must fail the gate while a missing operator measurement stays pending. A regression here would undo a load-bearing release-safety check.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-026` and confirm the expected signals without contradictory evidence.

- Objective: Declared numeric limits for release metrics with machine and operator measurement sources.
- Real user request: "Make sure the release gate still enforces numeric thresholds and treats a missing machine measurement as a failure."
- Prompt: "Run the numeric-threshold gate and confirm every metric carries a finite threshold and that a missing machine measurement fails while a missing operator measurement stays pending."
- Expected execution process: Running the command exercises the threshold gate against declared metric bounds, covering the finite-threshold, max/min-comparison, unit, and source fields, and the missing-machine-versus-missing-operator failure behavior.
- Expected signals: the test file 'tests/threshold-gate.test.mjs' passes with 0 failures, exit code 0.
- Desired user-visible outcome: A green run proves the shipped gate enforces numeric thresholds and correctly distinguishes machine failure from operator pending.
- Pass/fail: PASS if `tests/threshold-gate.test.mjs` passes with 0 failures and exit code 0; FAIL if the file fails, reports nonzero failures, or exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the numeric-threshold gate and confirm every metric carries a finite threshold and that a missing machine measurement fails while a missing operator measurement stays pending."

### Commands

1. `npx vitest run tests/threshold-gate.test.mjs`

### Expected

The file `tests/threshold-gate.test.mjs` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for the named file and confirm exit code 0.

### Pass / Fail

- **Pass**: `tests/threshold-gate.test.mjs` passes with 0 failures and exit code 0.
- **Fail**: the file fails, reports nonzero failures, or exits nonzero.

### Failure Triage

Re-read the implementation anchor `release/thresholds.json` to confirm the eight declared bounds are still finite and correctly typed (threshold, comparison, unit, source). Then open the failing assertion in `tests/threshold-gate.test.mjs` and check whether the missing-machine-fails / missing-operator-pending behavior diverges from the declaration.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/release/numeric-thresholds.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `release/thresholds.json` | Primary implementation anchor |
| `tests/threshold-gate.test.mjs` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: release
- Playbook ID: PR-026
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `release/numeric-thresholds.md`
