---
title: "PR-010 -- One-use tickets"
description: "This scenario validates one-use WebSocket tickets for `PR-010`. It focuses on verifying a ticket is minted and consumed exactly once at the sync or prompt boundary."
stage: routing
version: 1.0.0.0
---

# PR-010 -- One-use tickets

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-010`.

---

## 1. OVERVIEW

This scenario validates one-use WebSocket tickets for `PR-010`. It focuses on verifying that a session mints a short-lived ticket before opening the sync socket or submitting a prompt, and that the ticket is consumed exactly once at that boundary.

### Why This Matters

A session mints a short-lived ticket before opening the sync socket or submitting a prompt, and the ticket is consumed exactly once at that boundary. If the one-use boundary silently regressed, the same ticket could be replayed across multiple connections, breaking the session binding guarantee. This behavior must be validated so the upgrade never reuses a bearer token outside the socket handshake, and so a green run proves the replay risk stays contained.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-010` and confirm the expected signals without contradictory evidence.

- Objective: verify that a one-use ticket is minted and consumed exactly once at the sync or prompt boundary, and that the upgrade never reuses a bearer token outside the socket handshake
- Real user request: `"Make sure a ticket can't be replayed across more than one sync or prompt upgrade."`
- Prompt: `"Run the auth regression and confirm a one-use ticket is minted and consumed exactly once before the socket or prompt boundary."`
- Expected execution process: running the command exercises the auth service's ticket mint-and-consume path against the one-use invariant and drives the regression assertions.
- Expected signals: the named test file passes with 0 failures
- Desired user-visible outcome: a green run proves that one-use tickets bind each session to a single sync or prompt upgrade and that no bearer token is reused outside the socket handshake
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any assertion in the named file fails or the run reports failures

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `"Run the auth regression and confirm a one-use ticket is minted and consumed exactly once before the socket or prompt boundary."`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/auth.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0.

### Pass / Fail

- **Pass**: the named test file passes with 0 failures and the command exits with code 0
- **Fail**: the named test file reports one or more failing assertions or the command exits nonzero

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/auth/auth-service.ts` to confirm the mint-and-consume boundary still enforces single consumption, then check whether the failing assertion in `apps/pi-remote-relay/tests/auth.test.ts` changed its expected one-use contract.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/one-use-tickets.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/auth/auth-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/auth.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-010
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/one-use-tickets.md`
