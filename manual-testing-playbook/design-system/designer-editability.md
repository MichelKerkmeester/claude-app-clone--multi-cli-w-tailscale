---
title: "PR-041 -- Designer Editability"
description: "This scenario validates Designer Editability for `PR-041`. It focuses on the accessibility/contrast pass over the audited, designer-editable design system and the shipped designer guide."
stage: routing
version: 1.0.0.0
---

# PR-041 -- Designer Editability

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-041`.

---

## 1. OVERVIEW

This scenario validates Designer Editability for `PR-041`. It focuses on the accessibility/contrast pass over the migrated design-system surface and confirming the shipped designer guide still holds while the surface stays editable for low-code designer tasks.

### Why This Matters

Designer editability was audited against real low-code edit workflows, and ergonomic and guardrail gaps plus the accessibility/contrast pass were repeated as part of the ship. If the contrast test silently regresses, the designer guide's asserted color safety would be contradicted and the "surface remains editable" claim would lose its access proof. The whole deliverable rests on editability evidence plus the guide, with no color value or security boundary changed — so a red contrast gate would cast doubt on the editability audit itself.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-041` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the accessibility/contrast regression for the designer-editable design-system passes, proving the shipped designer guide's palette stays access-safe with no value or security boundary changed.
- Real user request: "Make sure the transferred design system is still editable for low-code designer tasks and that the accessibility pass still holds."
- Prompt: "Run the design-system contrast regression and confirm the accessibility pass still holds with 0 failures."
- Expected execution process: running the contrast test exercises the design-system's color and contrast definitions that the shipped designer guide documents as editable seams, replaying the accessibility/contrast pass against the current-state tokens.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: a green run proves the shipped designer guide's asserted color safety survives the editability audit, so low-code edits inside the documented seams stay access-safe without runtime change.
- Pass/fail: PASS if `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures at exit code 0; FAIL if that file reports failures or a non-zero exit code.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the design-system contrast regression and confirm the accessibility pass still holds with 0 failures."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/contrast.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures and exit code 0.

### Evidence

- The vitest summary line that names `apps/pi-remote-web/tests/contrast.test.tsx` reporting 0 failures.
- The command's final exit code of 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures and exit code 0.
- **Fail**: the test file reports 1 or more failures, exits non-zero, or fails to run.

### Failure Triage

Re-read the designer-guide impl anchor to confirm the documented palette and editable seams still match the asserted contrast expectations, then check the failing assertion in `apps/pi-remote-web/tests/contrast.test.tsx` to see whether the expectations or the shipped tokens drifted. Distinguish a genuine palette regression from a stale test expectation before touching either.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/design-system/designer-editability.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/design-system/designer-guide.md` | Primary implementation anchor |
| `apps/pi-remote-web/tests/contrast.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: design-system
- Playbook ID: PR-041
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `design-system/designer-editability.md`
