---
title: "PR-039 -- Todos"
description: "This scenario validates Todos for `PR-039`. It focuses on a read-only panel that projects the host's redacted Pi todo plan inline as an always-visible parchment block."
stage: routing
version: 1.0.0.0
---

# PR-039 -- Todos

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-039`.

---

## 1. OVERVIEW

This scenario validates Todos for `PR-039`. It focuses on a read-only panel that projects the host's redacted Pi todo plan inline as an always-visible parchment block.

### Why This Matters

The TodoPanel is the only surface that shows the operator's todo plan on the phone, so a silent break hides the plan entirely from the operator. It is also the primary place redaction must hold, because a regression could surface what should stay secret. The panel must stay read-only and always visible even when surrounding activity collapses, so both visibility and the no-mutation guard need to be locked down.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-039` and confirm the expected signals without contradictory evidence.

- Objective: A read-only TodoPanel that renders the host's redacted Pi todo plan inline as an always-visible parchment block.
- Real user request: "Make sure the todos on my phone still show the plan and stay read-only."
- Prompt: "Run the TodoPanel regression and confirm the panel renders the redacted todo plan inline, stays visible when surrounding activity collapses, and exposes no checkpoint or mutation controls."
- Expected execution process: Running the test mounts the TodoPanel and asserts its static, grouped rendering of provenance and progress, its always-visible persistence, and the absence of checkboxes and mutation controls.
- Expected signals: the named test file passes with 0 failures, exit code 0.
- Desired user-visible outcome: A green run proves the shipped panel projects the operator's todo plan inline as a read-only, always-visible list.
- Pass/fail: PASS if the named test file passes with 0 failures and exits 0; FAIL if any test fails or the process exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the TodoPanel regression and confirm the panel renders the redacted todo plan inline, stays visible when surrounding activity collapses, and exposes no checkpoint or mutation controls."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/TodoPanel.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/TodoPanel.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for `TodoPanel.test.tsx` showing 0 failures, and the exit code 0.

### Pass / Fail

- **Pass**: the named test file passes with 0 failures and the process exits 0.
- **Fail**: the named test file reports any failure, or the process exits non-zero.

### Failure Triage

Read `apps/pi-remote-web/src/TodoPanel.tsx` for the grouped/provenance/progress rendering contract and verify no mutation controls are rendered. If an assertion around always-visible persistence fails, re-check the collapse behavior the test drives against the styles in the same implementation anchor.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/todos.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/TodoPanel.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/TodoPanel.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-039
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/todos.md`
