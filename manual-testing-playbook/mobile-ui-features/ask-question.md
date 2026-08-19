---
title: "PR-030 -- Ask Question"
description: "This scenario validates Ask Question for `PR-030`. It focuses on the redacted inline AskQuestionCard rendering agent prompts in the transcript's chronological flow with full-row option buttons and optional free text, submitting only via a one-use ticketed mutation."
stage: routing
version: 1.0.0.0
---

# PR-030 -- Ask Question

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-030`.

---

## 1. OVERVIEW

This scenario validates Ask Question for `PR-030`. It focuses on the redacted inline AskQuestionCard rendering agent prompts in the transcript's chronological flow with full-row option buttons and optional free text, submitting only via a one-use ticketed mutation.

### Why This Matters

The AskQuestionCard renders directly inside the conversation timeline, so any regression in positioning, option handling, or free-text input degrades the core question-asking surface a user sees in place. Card-local interaction must stay confined to the card: no modal, scrim, or page-level focus trap should leak into the rest of the transcript. A silent regression that lets an option tap or key press submit prematurely, or that marks the card answered before the host and extension both accept the submission, risks sending or duplicating a user's question outside the guarded one-use ticket flow.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-030` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the redacted inline AskQuestionCard renders in the transcript flow, keeps interaction card-local, and only transitions to answered after a one-use ticketed submission is accepted.
- Real user request: "Make sure the question card still renders inline in the transcript and never submits just from tapping or typing an option."
- Prompt: "Run the ask-question regression and confirm the card renders full-row options, keeps interaction card-local, and only submits through the one-use ticketed mutation."
- Expected execution process: Running the command exercises the AskQuestionCard render path, the full-row option and free-text interactions, the no-submit-on-volatile-form-change guarantee, and the one-use ticketed submission guard.
- Expected signals: the named test file passes with 0 failures and the command exits 0.
- Desired user-visible outcome: A green run proves the shipped card draws agent prompts in the timeline with full-row options and optional free text, never submits on a plain option tap or key press, and resolves to the confirmed answered state only after both host and extension accept the one-use ticketed submission.
- Pass/fail: PASS if `apps/pi-remote-web/tests/ask-question-card.test.tsx` passes with 0 failures and exit code 0; FAIL if the file reports any failure or the command exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the ask-question regression and confirm the card renders full-row options, keeps interaction card-local, and only submits through the one-use ticketed mutation.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/ask-question-card.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/ask-question-card.test.tsx` passes with 0 failures and exits 0.

### Evidence

Capture the vitest summary line for `apps/pi-remote-web/tests/ask-question-card.test.tsx`, confirming pass count and 0 failures, and the command's exit code 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-web/tests/ask-question-card.test.tsx` reports 0 failures and the run exits 0.
- **Fail**: Any test in the file fails, so an option tap or key press submits, or the card marks answered before the one-use ticketed submission is accepted.

### Failure Triage

1. Re-read the primary implementation anchor `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` to confirm the card-local interaction scope and the submit/answered guards are intact.
2. Inspect the failing assertion in `apps/pi-remote-web/tests/ask-question-card.test.tsx` to see whether the failure is in rendering, in the no-submit-on-volatile-change guarantee, or in the one-use ticketed submission state transition.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/ask-question.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/ask-question-card.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-030
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/ask-question.md`
