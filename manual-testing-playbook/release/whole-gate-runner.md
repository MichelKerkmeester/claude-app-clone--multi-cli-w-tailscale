---
title: "PR-029 -- Whole-gate runner"
description: "This scenario validates Whole-gate runner for `PR-029`. It focuses on confirmation that the release verification runner spawns the full gate sequence and writes an evidence document without leaking absolute paths."
stage: routing
version: 1.0.0.0
---

# PR-029 -- Whole-gate runner

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-029`.

---

## 1. OVERVIEW

This scenario validates Whole-gate runner for `PR-029`. It focuses on confirmation that the runner executes the entire gate sequence in order, sanitizes output, and writes a timestamped evidence document that never exposes absolute app or home paths.

### Why This Matters

The whole-gate runner is the release verification entry point, so a silent regression here undermines every release decision built on its evidence document. If an absolute path leaked into that document, it would break the derived-claims and rollout-readiness evaluation that depend on it. Validating path sanitization and gate ordering protects both the integrity of release evidence and the portability of what gets recorded.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-029` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the runner's gate sequence, output sanitization, and evidence-document generation via its regression test.
- Real user request: `Ensure the release runner still spawns every gate in order and strips absolute app and home paths from the evidence it writes.`
- Prompt: `Run the whole-gate runner regression and confirm the gate sequence runs and no absolute path reaches the evidence document.`
- Expected execution process: Running the command exercises the orchestration of typecheck, lint, format, test, build, web, drill, and threshold gates, the sanitization of their output, and the construction and claims derivation that feed rollout-readiness evaluation.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: a green run proves the shipped runner produces reliable, path-clean evidence for release decisions.
- Pass/fail: PASS if `tests/rollout-gate.test.mjs` passes with 0 failures and exit code 0; FAIL if any test in the file fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the whole-gate runner regression and confirm the gate sequence runs and no absolute path reaches the evidence document.`

### Commands

1. `npx vitest run tests/rollout-gate.test.mjs`

### Expected

The tests in `tests/rollout-gate.test.mjs` execute to completion with 0 failures and an exit code of 0.

### Evidence

Capture the vitest summary line for `tests/rollout-gate.test.mjs` reporting 0 failures, and the command's exit code of 0.

### Pass / Fail

- **Pass**: `tests/rollout-gate.test.mjs` reports 0 failures and the command exits 0.
- **Fail**: any assertion in the file fails, or the command exits non-zero.

### Failure Triage

Re-read the runner implementation in `scripts/release-verify.mjs` to confirm the gate ordering and sanitization logic the test targets, then inspect the specific failing assertion in `tests/rollout-gate.test.mjs` to identify whether the test expectation or the implementation drifted.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/release/whole-gate-runner.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `scripts/release-verify.mjs` | Primary implementation anchor |
| `tests/rollout-gate.test.mjs` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: release
- Playbook ID: PR-029
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `release/whole-gate-runner.md`
