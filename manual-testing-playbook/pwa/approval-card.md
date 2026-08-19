---
title: "PR-022 -- Approval card"
description: "This scenario validates the Approval card for `PR-022`. It focuses on the review view presenting exact-action approvals with decision and grant actions."
stage: routing
version: 1.0.0.0
---

# PR-022 -- Approval card

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-022`.

---

## 1. OVERVIEW

This scenario validates the Approval card for `PR-022`. It focuses on the review view presenting exact-action approvals with decision and grant actions.

### Why This Matters

The Approval card is the operator-facing gate for every edit and write tool action, so a regression here jumps straight past human review into an unapproved execution. The card must surface the relay-redacted canonical input, the digest, and a live countdown so a reviewer can distinguish one exact action from another before granting it. If the card silently lost the redaction, the digest, the countdown, or the approve/deny/accept-next-edits actions, review would become guesswork and actions could proceed without a verified intent.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-022` and confirm the expected signals without contradictory evidence.

- Objective: The review view presents exact-action approvals with decision and grant actions, submitting decisions through the relay with results refreshing every second.
- Real user request: `Make sure the approval card still shows the redacted input, the digest, and a live countdown, and that approve, deny, and accept-next-edits are all present for edit and write tools.`
- Prompt: `Run the approval-card regression and confirm the review view renders each exact-action approval with redacted input, digest, countdown, and all decision and grant actions.`
- Expected execution process: running the command exercises the review view's rendering of the relay-redacted canonical input, the digest, the live countdown, and the approve, deny, and accept-next-edits actions for edit and write tools, plus the relay decision submission and per-second refresh.
- Expected signals: the named test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures.
- Desired user-visible outcome: a green run proves the shipped review view still presents complete, exact-action approval cards whose decisions submit through the relay and whose results refresh every second.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test in the named file fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the approval-card regression and confirm the review view renders each exact-action approval with redacted input, digest, countdown, and all decision and grant actions.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/App.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures, exit code 0.

### Evidence

What to capture: the vitest summary line for the named file showing all tests passing, and the exit code 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures and the command exits 0.
- **Fail**: any test in `apps/pi-remote-web/tests/App.test.tsx` fails, or the command exits non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-web/src/App.tsx` to confirm the approval card still renders redacted input, digest, countdown, and all decision and grant actions for edit and write tools. Then check the matching assertions in `apps/pi-remote-web/tests/App.test.tsx` to see which rendered element or submitted-relay behavior drifted from the assertion, and fix that specific mismatch before re-running the exact command.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/pwa/approval-card.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/App.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/App.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: pwa
- Playbook ID: PR-022
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `pwa/approval-card.md`
