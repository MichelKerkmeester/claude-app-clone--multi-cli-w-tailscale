---
title: "PR-011 -- Revocation"
description: "This scenario validates Revocation for `PR-011`. It focuses on session, device, and grant revocation with active connection teardown."
stage: routing
version: 1.0.0.0
---

# PR-011 -- Revocation

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-011`.

---

## 1. OVERVIEW

This scenario validates Revocation for `PR-011`. It focuses on session, device, and grant revocation with active connection teardown.

### Why This Matters

Revocation is the enforcement point that removes access once a session, device, or grant is no longer trusted. If it silently regressed, a revoked session or device would keep exercising authority, matching WebSocket connections would stay open, and in-flight approvals could complete after the underlying grant was already invalidated.

A green run proves that terminating a record is not cosmetic: every related record goes terminal, in-flight approval authority aborts, and live connections close with a revocation code.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-011` and confirm the expected signals without contradictory evidence.

- Objective: confirm that revoking a session or device marks every related record terminal, aborts in-flight approval authority, and tears down matching WebSocket connections with a revocation code.
- Real user request: "Make sure that when we revoke a session or device, it truly kills its access, aborts any pending approval, and drops the open connection."
- Prompt: `Run the revocation regression and confirm that revoking a session or device marks every related record terminal, aborts in-flight approval authority, and closes matching WebSocket connections with a revocation code.`
- Expected execution process: the command runs the auth test suite and exercises the revocation paths for sessions, devices, and grants, including the terminal-state marking, the in-flight approval abort, and the WebSocket teardown carrying the revocation code.
- Expected signals: the named test file passes with 0 failures.
- Desired user-visible outcome: a green run proves that revocation is enforced at every boundary, leaving no dangling record, approval, or live connection behind.
- Pass/fail: PASS if `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures and exit code 0; FAIL if any test in the file fails or the command exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the revocation regression and confirm that revoking a session or device marks every related record terminal, aborts in-flight approval authority, and closes matching WebSocket connections with a revocation code.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/auth.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures and exits 0, covering terminal-state marking, in-flight approval aborts, and WebSocket teardown with a revocation code.

### Evidence

The vitest summary line for the named file showing 0 failing tests, plus a shell exit code of 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-relay/tests/auth.test.ts` runs to completion with 0 failures and exit code 0.
- **Fail**: any test in the file fails or the command exits non-zero.

### Failure Triage

Re-read the revocation flow in `apps/pi-remote-relay/src/auth/auth-service.ts` and check whether terminal marking, the in-flight approval abort, or the WebSocket revocation-code handoff regressed; then confirm the failing assertion actually reflects the shipped contract rather than a stale test expectation.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/revocation.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/auth/auth-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/auth.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-011
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/revocation.md`
