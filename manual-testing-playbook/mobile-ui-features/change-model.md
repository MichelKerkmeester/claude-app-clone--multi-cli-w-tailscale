---
title: "PR-032 -- Change Model"
description: "This scenario validates Change Model for `PR-032`. It focuses on browsing the host-confirmed model catalog and staging a model in a bottom sheet, committed only via a one-use ticketed Switch action."
stage: routing
version: 1.0.0.0
---

# PR-032 -- Change Model

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-032`.

---

## 1. OVERVIEW

This scenario validates Change Model for `PR-032`. It focuses on browsing the host-confirmed model catalog and staging a model in a bottom sheet, committed only via a one-use ticketed Switch action.

### Why This Matters

The session header must always show the host-confirmed model label. If staging could mutate state without an explicit switch, or if a raw (non-ticketed) commit path leaked through, an operator could land on a model the host never confirmed. Validating the browser/search/stage flow and the one-use ticketed commit guards against silent model drift.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-032` and confirm the expected signals without contradictory evidence.

- Objective: Validate change-model behavior (catalog browse/search, bottom-sheet staging, one-use ticketed Switch commit)
- Real user request: "Make sure switching models still only works through the bottom sheet and never changes the header label until the host accepts."
- Prompt: "Run the change-model regression and confirm the ModelSwitcherSheet test passes, so staging stays read-only and the header only updates on a ticketed switch."
- Expected execution process: Running the command exercises the host-confirmed model catalog browse and search, bottom-sheet staging of a model read-only, and the one-use ticketed Switch action that keeps the header label unchanged until the host accepts.
- Expected signals: the named test file `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` passes with 0 failures.
- Desired user-visible outcome: a green run proves the shipped behavior — the header stays stable and a model is committed only via the ticketed Switch action.
- Pass/fail: PASS if the test file `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` passes with 0 failures and exit code is 0; FAIL if it errors or reports any failure.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the change-model regression and confirm the ModelSwitcherSheet test passes, so staging stays read-only and the header only updates on a ticketed switch."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx`

### Expected

The vitest run reports the model-switcher sheet test file `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` passing with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code (must be 0).

### Pass / Fail

- **Pass**: the test executes with 0 failures and exits 0.
- **Fail**: vitest reports any failed/errored test in the file or a non-zero exit.

### Failure Triage

If it fails, re-read the primary implementation anchor `apps/pi-remote-web/src/SessionHeader.tsx` to confirm the header label flow and the ticketed commit path, then inspect the failing assertion in `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` to check whether staging mutated state before the Switch action.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/change-model.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/SessionHeader.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/ModelSwitcherSheet.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-032
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/change-model.md`
