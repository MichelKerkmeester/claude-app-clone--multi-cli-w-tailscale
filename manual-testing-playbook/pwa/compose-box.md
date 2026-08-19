---
title: "PR-023 -- Compose box"
description: "This scenario validates Compose box for `PR-023`. It focuses on the optimistic-block submit-and-retry composer flow."
stage: routing
version: 1.0.0.0
---

# PR-023 -- Compose box

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-023`.

---

## 1. OVERVIEW

This scenario validates Compose box for `PR-023`. It focuses on the optimistic-block submit-and-retry composer flow.

### Why This Matters

The composer is the primary steering input for the app, so a regression makes every user interaction break at the entry point. Silent regressions here are costly: an optimistic block that never commits, or a lost draft on rejection, corrupts the user's intent without an obvious error. Validating submit, commit, and retry keeps the feedback loop honest end to end.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-023` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the compose box submits input, shows an optimistic block, commits it on acceptance, and restores the draft with the same submission id on rejection so retry works.
- Real user request: "Make sure the prompt composer still shows my input immediately and retries cleanly if steering is rejected."
- Prompt: "Run the compose-box regression and confirm submit, optimistic block, commit, and rejection-restore-with-retry all behave as designed."
- Expected execution process: The test run exercises the composer's submit path, optimistic user-block insertion, relay submission through the command path, commit-on-accept replacement, and rejection restore that keeps the submission id.
- Expected signals: the named test file passes with 0 failures, exit code 0.
- Desired user-visible outcome: A green run proves the shipped composer submits steering input, reflects it optimistically, and recovers the draft on rejection with a stable retry id.
- Pass/fail: PASS if `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures and exit code 0; FAIL if the file reports failures, errors, or a nonzero exit code.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the compose-box regression and confirm submit, optimistic block, commit, and rejection-restore-with-retry all behave as designed."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/App.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures, exit code 0.

### Evidence

- The vitest summary line for `apps/pi-remote-web/tests/App.test.tsx` showing 0 failed, 0 errors.
- Exit code 0.
- Any failure or nonzero exit code is captured verbatim for triage.

### Pass / Fail

- **Pass**: the file reports 0 failure and 0 error with exit code 0.
- **Fail**: the file reports any failure or error, or the run exits nonzero.

### Failure Triage

- Re-read the composer paths in `apps/pi-remote-web/src/App.tsx` (optimistic insert, submit, commit-on-accept, rejection restore).
- Re-read the assertions in `apps/pi-remote-web/tests/App.test.tsx` that target the submission id and restored draft, and confirm they match current behavior.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/pwa/compose-box.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/App.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/App.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: pwa
- Playbook ID: PR-023
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `pwa/compose-box.md`
