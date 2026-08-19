---
title: "PR-008 -- Default-deny authorization"
description: "This scenario validates Default-deny authorization for `PR-008`. It focuses on ensuring an explicit action allowlist rejects every unknown action and tool mutation."
stage: routing
version: 1.0.0.0
---

# PR-008 -- Default-deny authorization

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-008`.

---

## 1. OVERVIEW

This scenario validates Default-deny authorization for `PR-008`. It focuses on ensuring an explicit action allowlist rejects every unknown action and tool mutation before it reaches a handler.

### Why This Matters

Every relay request maps to a named action string, and the auth service rejects the session when the action is not in the allowlist. If this guard silently regressed, unknown paths and tool mutations would reach a handler and allow actions that were never authorized. This scenario is the regression boundary that keeps the deny-everything-else posture intact.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-008` and confirm the expected signals without contradictory evidence.

- Objective: Confirm that actions outside the allowlist are denied at the auth boundary and never reach a handler.
- Real user request: `Make sure anything that isn't on the action allowlist is rejected before it can mutate the relay.`
- Prompt: `Run the negative-controls security tests and confirm no unknown action or tool mutation passes the auth boundary.`
- Expected execution process: The test suite feeds the auth service action strings that are not in the allowlist, along with tool-mutation paths, and asserts the session is rejected for each unknown case.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: A green run proves that every request maps to a named action and only allowlisted actions are admitted; unknown actions and tool mutations are denied.
- Pass/fail: PASS if `apps/pi-remote-relay/tests/security/negative-controls.test.ts` passes with 0 failures and exit code 0; FAIL if any test in the file fails or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the negative-controls security tests and confirm no unknown action or tool mutation passes the auth boundary.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/security/negative-controls.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/security/negative-controls.test.ts` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for the named file showing the test count and 0 failures, along with the exit code 0.

### Pass / Fail

- **Pass**: The named test file passes with 0 failures and the run exits with code 0.
- **Fail**: The named test file reports failures, or the run exits nonzero.

### Failure Triage

Re-read `apps/pi-remote-relay/src/auth/policy.ts` to confirm the allowlist logic still denies anything not explicitly listed, then inspect the failing assertion to see whether a previously-unknown action is now being admitted or a mutation path reaches a handler.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/default-deny-authorization.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/auth/policy.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/security/negative-controls.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-008
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/default-deny-authorization.md`
