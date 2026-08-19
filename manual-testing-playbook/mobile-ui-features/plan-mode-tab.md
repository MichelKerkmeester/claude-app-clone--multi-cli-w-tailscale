---
title: "PR-036 -- Plan Mode Tab"
description: "This scenario validates Plan Mode Tab for `PR-036`. It focuses on the persistent composer-adjacent control presenting only host-confirmed build/plan mode and atomically executing reviewed plans under a one-use ticket."
stage: routing
version: 1.0.0.0
---

# PR-036 -- Plan Mode Tab

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-036`.

---

## 1. OVERVIEW

This scenario validates Plan Mode Tab for `PR-036`. It focuses on the persistent composer-adjacent control presenting only host-confirmed build/plan mode and atomically executing reviewed plans under a one-use ticket.

A `PlanModeButton` sits immediately after the `+` button beside the composer and displays the mode the host has actually confirmed. Tapping it opens a two-option Build/Plan menu. A `Shift+Tab` keyboard shortcut toggles the mode, but only while the composer textarea is focused and the runtime is ready and settled. A requested mode never appears as the current mode until the host acknowledges it.

### Why This Matters

The control is the single surface through which a reviewed plan moves to atomic execution, so a regression here could let unreviewed work run or let the UI claim a mode the host never confirmed. Mode integrity is load-bearing: the shortcut path is gated on focus and runtime readiness, and the one-use ticket enforces that each reviewed plan executes exactly once. If these signals silently broke, operators could be misled into believing a build/plan context existed when the host had not acknowledged it.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-036` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the PlanModeButton reflects only host-confirmed mode, exposes a two-option Build/Plan menu, and gates the mode toggle to focused-composer, ready, settled runtime states.
- Real user request: `"Make sure the plan mode tab only ever shows the mode the host actually confirmed and that a reviewed plan runs under its one-use ticket."`
- Prompt: `"Run the Plan Mode Tab regression and confirm the button reflects only host-confirmed build/plan mode with no contradictory signals."`
- Expected execution process: running the named test file exercises PlanModeButton rendering, the Build/Plan menu options, the Shift+Tab toggle gate across composer-focus and runtime-ready/settled states, and the one-use-ticket behavior.
- Expected signals: the named test file passes with 0 failures, exit code 0.
- Desired user-visible outcome: a green run proves the shipped button always shows the confirmed mode, never a requested-but-unacknowledged mode, and that reviewed plans execute atomically under a single-use ticket.
- Pass/fail: PASS if the test file passes with 0 failures and exit code 0; FAIL if any test in the file fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `"Run the Plan Mode Tab regression and confirm the button reflects only host-confirmed build/plan mode with no contradictory signals."`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/PlanModeButton.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/PlanModeButton.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file (the file-level pass/fail and 0 failures) and the command's exit code (0).

### Pass / Fail

- **Pass**: the run finishes with exit code 0 and the summary reports 0 failures for `apps/pi-remote-web/tests/PlanModeButton.test.tsx`.
- **Fail**: any test in that file fails, errors, or the process exits non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-web/src/PlanModeButton.tsx` to confirm rendering and mode-gating still match the assertions, then inspect the failing assertion in `apps/pi-remote-web/tests/PlanModeButton.test.tsx` to see which behavior (menu options, host-confirmed mode, shortcut gate, or one-use ticket) diverged. Treat the failure as a hypothesis about current-state behavior and confirm against the actual failing test output before changing anything.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/plan-mode-tab.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/PlanModeButton.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/PlanModeButton.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-036
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/plan-mode-tab.md`
