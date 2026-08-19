---
title: "PR-040 -- Component Migration"
description: "This scenario validates Component Migration for `PR-040`. It focuses on confirming the migrated component surfaces preserve WCAG AA contrast and ≥44px control targets through the semantic token layer."
stage: routing
version: 1.0.0.0
---

# PR-040 -- Component Migration

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-040`.

---

## 1. OVERVIEW

This scenario validates Component Migration for `PR-040`. It focuses on confirming that every migrated component surface resolves the frozen ink-on-parchment palette through the semantic token layer without regressing the WCAG AA contrast and ≥44px control targets.

The component library holds roughly 55 hand-styled components. Each one reads semantic and per-surface component tokens from the token library instead of hard-coded values, applying the `@ds` inline-comment grammar and per-state seams. The live design-system catalog indexes every migrated surface and serves as a standalone visual reference for the whole library. If this behavior silently regressed, a surface could fall back to a hard-coded value that no longer resolves the semantic palette, dropping below WCAG AA or falling under the 44px control minimum without any catalog-level signal.

### Why This Matters

No source palette value and no security boundary changes as part of the work, so the migration must be provably neutral. The risk is an unseen regression where a hand-styled component stops honoring the semantic tokens and breaks contrast or control-size compliance, while the rest of the library still reports green. Validating the contrast suite keeps that neutrality legible and reproducible.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-040` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the migrated component surfaces still resolve the semantic ink-on-parchment palette with WCAG AA contrast and no regression.
- Real user request: "Make sure the migrated components still meet contrast against the parchment surface after moving off hard-coded values."
- Prompt: "Run the contrast regression and confirm every migrated surface still resolves the semantic palette with no failing contrast checks."
- Expected execution process: Running the exact command invokes the workspace vitest project on the contrast test file, exercising the migrated surface tokens and their per-state seams against the frozen palette.
- Expected signals: The named test file passes with 0 failures; the runner exits with code 0.
- Desired user-visible outcome: A green run proves the migrated components keep WCAG AA contrast through the semantic layer, matching the pre-migration baseline.
- Pass/fail: PASS if the test file `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures and exit code 0; FAIL if any test fails or the command exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the contrast regression and confirm every migrated surface still resolves the semantic palette with no failing contrast checks."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/contrast.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures and the runner exits with code 0.

### Evidence

Capture the vitest summary line for the named file showing 0 failed tests, plus the process exit code of 0.

### Pass / Fail

- **Pass**: The named test file reports 0 failed tests and the command exits with code 0.
- **Fail**: Any test in the file fails, the file does not run, or the command exits non-zero.

### Failure Triage

1. Re-read the implementation anchor `apps/pi-remote-web/src/style.css` to check whether a migrated surface fell back to a hard-coded token outside the semantic layer.
2. Inspect the specific failing assertion to see whether the failing surface is a contrast or control-size seam, then re-run the same command after correcting the token resolution.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/design-system/component-migration.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/style.css` | Primary implementation anchor |
| `apps/pi-remote-web/tests/contrast.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: design-system
- Playbook ID: PR-040
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `design-system/component-migration.md`
