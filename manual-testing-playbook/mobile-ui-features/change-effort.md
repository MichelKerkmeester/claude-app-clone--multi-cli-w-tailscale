---
title: "PR-031 -- Change Effort"
description: "This scenario validates Change Effort for `PR-031`. It focuses on changing the host-confirmed thinking effort through one canonical Model and Effort sheet."
stage: routing
version: 1.0.0.0
---

# PR-031 -- Change Effort

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-031`.

---

## 1. OVERVIEW

This scenario validates Change Effort for `PR-031`. It focuses on changing the host-confirmed thinking effort through one canonical Model and Effort sheet.

### Why This Matters

The header and RuntimeStrip surface only the host-confirmed effort value, so the operator depends on this sheet as the single trusted way to change it. A regression here could let a stale or unconfirmed effort propagate to the UI. This scenario guards that path with one fresh ticketed, revision-checked mutation per selection.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-031` and confirm the expected signals without contradictory evidence.

- Objective: change the host-confirmed thinking effort through one canonical Model and Effort sheet
- Real user request: "Make sure selecting a different thinking effort results in one fresh host-confirmed mutation and that the UI stays unselected until Pi confirms the new state."
- Prompt: "Run the Change Effort regression and confirm that the Model and Effort sheet replaces the old nested effort Select, requests one fresh ticketed mutation, and stays visually unselected until Pi confirms."
- Expected execution process: the test exercises the EffortRadioGroup component, covering rendering of the effort rows, selection triggering a single mutation request, and the visually-unselected state persisting until confirmation arrives.
- Expected signals: the named test file passes with 0 failures
- Desired user-visible outcome: a green run proves the sheet renders the correct choices and does not paint a new effort value before the host confirms it.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test fails or the command exits non-zero

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the Change Effort regression and confirm that the Model and Effort sheet replaces the old nested effort Select, requests one fresh ticketed mutation, and stays visually unselected until Pi confirms."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/EffortRadioGroup.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/EffortRadioGroup.test.tsx` passes with 0 failures, exit code 0.

### Evidence

the vitest summary line reporting 0 failures for `EffortRadioGroup.test.tsx` and a process exit code of 0.

### Pass / Fail

- **Pass**: the named test file reports 0 failures and the command exits with code 0
- **Fail**: the named test file reports any failure or the command exits non-zero

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-web/src/EffortRadioGroup.tsx` to verify the effort rows render from the confirmed value and that the selected state is only set on confirmation. Then inspect the assertions in `apps/pi-remote-web/tests/EffortRadioGroup.test.tsx` for drift between expected and actual mutation or selection behavior before rerunning the command.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/change-effort.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/EffortRadioGroup.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/EffortRadioGroup.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-031
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/change-effort.md`
