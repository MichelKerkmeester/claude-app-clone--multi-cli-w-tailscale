---
title: "PR-043 -- Token Library"
description: "This scenario validates Token Library for `PR-043`. It focuses on runtime styling resolution through `@theme` design-scale tokens and a guardrailed semantic role layer."
stage: routing
version: 1.0.0.0
---

# PR-043 -- Token Library

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-043`.

---

## 1. OVERVIEW

This scenario validates Token Library for `PR-043`. It focuses on runtime styling resolution through `@theme` design-scale tokens and a guardrailed semantic role layer backed by a frozen primitive palette.

### Why This Matters

All runtime styling resolves through the token system, so a regression in token resolution silently distorts contrast and appearance across the whole surface. Operators rely on retinting by changing a single semantic role rather than editing frozen primitives; if that layer breaks, the app loses its single source of truth for color. The contrast contract must hold at runtime so the shipped app stays on-palette and accessible.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-043` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the token library resolves the full contrast contract at runtime with zero failures.
- Real user request: `Make sure the design tokens still resolve contrast correctly whenever we retint a semantic role.`
- Prompt: `Run the token-library contrast regression and confirm the full test file passes with zero failures.`
- Expected execution process: Running the command exercises the Vitest runner against the contrast test in the pi-remote-web app, which loads the runtime token layer (`@theme` design-scale tokens plus the semantic role layer) and verifies color-contrast output.
- Expected signals: the test file `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures, exit code 0
- Desired user-visible outcome: A green run proves the runtime styling continues to satisfy the contrast contract, so operators can retint the whole app by changing a semantic role without touching a frozen primitive.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any assertion in the file fails, the file errors, or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the token-library contrast regression and confirm the full test file passes with zero failures.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/contrast.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/contrast.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the Vitest summary line for the named file showing 0 failures, and the shell exit code 0 for the command invocation.

### Pass / Fail

- **Pass**: the named contrast test file completes with 0 failures and the run exits 0.
- **Fail**: any assertion in the file fails, the file errors during load/run, or the process exits with a non-zero code.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-web/src/style.css` to confirm the `@theme` design-scale tokens and the semantic role layer are intact. Then re-open the failing assertion in `apps/pi-remote-web/tests/contrast.test.tsx` to check which token/role resolution it exercised and whether the expected contrast value changed.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/design-system/token-library.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/style.css` | Primary implementation anchor |
| `apps/pi-remote-web/tests/contrast.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: design-system
- Playbook ID: PR-043
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `design-system/token-library.md`
