---
title: "PR-018 -- Mutation containment"
description: "This scenario validates Mutation containment for `PR-018`. It focuses on the extension boundary that blocks protected tool calls before execution and the loopback authority routes that back it."
stage: routing
version: 1.0.0.0
---

# PR-018 -- Mutation containment

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-018`.

---

## 1. OVERVIEW

This scenario validates Mutation containment for `PR-018`. It focuses on the extension boundary that blocks protected tool calls before execution and the loopback authority routes that back it.

### Why This Matters

The extension hooks the final tool call boundary, so any drift here widens the surface a protected action can reach before authorization. A leaky boundary means a non-matching action, digest, or authority configuration could execute a mutation it was never granted. Containing mutations at this point keeps the authority decision both the last and the binding gate over what actually runs.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-018` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the protected tool call boundary blocks non-matching actions, digests, and authority configurations before execution.
- Real user request: "Make sure nothing mutates unless the final boundary and the relay authority both vouch for it."
- Prompt: "Run the mutation-containment regression and confirm the final boundary blocks protected tool calls before anything executes."
- Expected execution process: The run loads the final tool call boundary, digests every protected action, and exercises the loopback authority routes and shared-secret lease request and consumption against mismatched inputs.
- Expected signals: the named test file passes with 0 failures.
- Desired user-visible outcome: A green run proves protected tool calls are blocked pre-execution when the action, digest, or authority configuration does not match, with none reaching the mutation target.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the mutation-containment regression and confirm the final boundary blocks protected tool calls before anything executes."

### Commands

1. `npx vitest run extensions/pi-remote-approval/tests/final-boundary.test.ts`

### Expected

The test file `extensions/pi-remote-approval/tests/final-boundary.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for `extensions/pi-remote-approval/tests/final-boundary.test.ts` (pass count, 0 failures) and the exit code (0).

### Pass / Fail

- **Pass**: The named test file passes all tests with 0 failures and the command exits 0.
- **Fail**: Any test in the named file fails, or the command exits non-zero.

### Failure Triage

Re-read the implementation anchor `extensions/pi-remote-approval/src/index.ts` to confirm the boundary still hooks the final tool call boundary and that the loopback authority routes and shared-secret lease logic match the test's expectations. Then inspect the specific failing assertion in `extensions/pi-remote-approval/tests/final-boundary.test.ts` to see which mismatch case (action, digest, or authority configuration) no longer blocks.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/approval-and-mutation/mutation-containment.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `extensions/pi-remote-approval/src/index.ts` | Primary implementation anchor |
| `extensions/pi-remote-approval/tests/final-boundary.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: approval-and-mutation
- Playbook ID: PR-018
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `approval-and-mutation/mutation-containment.md`
