---
title: "PR-028 -- Staged rollout"
description: "This scenario validates Staged rollout for `PR-028`. It focuses on proving a release stage is marked ready only when every required evidence claim passes."
stage: routing
version: 1.0.0.0
---

# PR-028 -- Staged rollout

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-028`.

---

## 1. OVERVIEW

This scenario validates Staged rollout for `PR-028`. It focuses on proving a release stage is marked ready only when every required evidence claim passes.

### Why This Matters

Staged rollout is the gate between candidate code and production traffic, so a stage flips ready without complete evidence risks releasing on partial or unverified input. Each stage names a kill switch and a required evidence subset, and a stage is only ready when every required claim passes. Silently allowing a stage to go green on partial evidence would undermine operator confidence in the rollout gate and could let an under- or mis-validated release through.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-028` and confirm the expected signals without contradictory evidence.

- Objective: prove a release stage is marked ready only when every required evidence claim passes
- Real user request: "Make sure a rollout stage can't be marked ready until all of its required evidence is in and valid."
- Prompt: "Run the staged rollout regression and confirm a stage only goes ready once every required evidence claim passes."
- Expected execution process: running the rollout-gate test file exercises the staged rollout policy — three stages each naming a kill switch and a required evidence subset — and asserts that a stage is ready only when every required claim passes and that any operator evidence is schema-valid with app-relative artifact paths.
- Expected signals: the test file 'tests/rollout-gate.test.mjs' passes with 0 failures, exit code 0
- Desired user-visible outcome: a green run proves the shipped behavior that a stage is only marked ready on complete, schema-valid evidence
- Pass/fail: PASS if the test file 'tests/rollout-gate.test.mjs' passes with 0 failures and exit code 0; FAIL if any test fails or the run exits non-zero

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the staged rollout regression and confirm a stage only goes ready once every required evidence claim passes."

### Commands

1. `npx vitest run tests/rollout-gate.test.mjs`

### Expected

The test file 'tests/rollout-gate.test.mjs' passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for `tests/rollout-gate.test.mjs` showing 0 failures and the exit code 0.

### Pass / Fail

- **Pass**: the test file 'tests/rollout-gate.test.mjs' passes with 0 failures and the run exits with code 0
- **Fail**: any test in 'tests/rollout-gate.test.mjs' fails, or the run exits with a non-zero code

### Failure Triage

Re-read the staged rollout policy in `release/rollout.json` and confirm the expected kill switches and required evidence subsets, then inspect the failing assertion in `tests/rollout-gate.test.mjs` to see which stage and claim assumption no longer holds.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/release/staged-rollout.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `release/rollout.json` | Primary implementation anchor |
| `tests/rollout-gate.test.mjs` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: release
- Playbook ID: PR-028
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `release/staged-rollout.md`
