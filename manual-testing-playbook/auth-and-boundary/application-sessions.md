---
title: "PR-007 -- Application sessions"
description: "This scenario validates Application sessions for `PR-007`. It focuses on short-lived application sessions established by a device proof challenge exchange."
stage: routing
version: 1.0.0.0
---

# PR-007 -- Application sessions

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-007`.

---

## 1. OVERVIEW

This scenario validates Application sessions for `PR-007`. It focuses on short-lived application sessions established by a device proof challenge exchange.

### Why This Matters

An enrolled device exchanges a signed session challenge for an opaque session token with a bounded TTL. Every request that carries the token is revalidated against origin, principal, device liveness, and expiry before it is accepted. Silently regressing any of these checks would let a stale or forged token cross the boundary, so this contract must stay verified.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-007` and confirm the expected signals without contradictory evidence.

- Objective: short-lived application sessions established by a device proof challenge exchange
- Real user request: `"Make sure a signed session challenge still exchanges for a short-lived session token and that no stale token is accepted."`
- Prompt: `"Run the relay auth regression and confirm the session-token exchange still issues bounded-TTL tokens and revalidates origin, principal, device liveness, and expiry on every request."`
- Expected execution process: the relay auth test file exercises the session challenge exchange, token issuance with a bounded TTL, and the per-request revalidation of origin, principal, device liveness, and expiry.
- Expected signals: the named test file passes with 0 failures
- Desired user-visible outcome: a green run proves that short-lived application sessions are exchanged and enforced exactly as shipped.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test errors or the exit code is non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `"Run the relay auth regression and confirm the session-token exchange still issues bounded-TTL tokens and revalidates origin, principal, device liveness, and expiry on every request."`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/auth.test.ts`

### Expected

The named test file passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0.

### Pass / Fail

- **Pass**: the named test file passes with 0 failures and exit code 0
- **Fail**: the named test file errors, reports failures, or exits with a non-zero code

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/auth/auth-service.ts` to confirm the session challenge exchange and revalidation checks, then re-run the single file to isolate the failing assertion.

### Optional Supplemental Checks

The full end-to-end path for this capability needs a physical enrolled phone, a live Tailscale Serve, and APNs. **SKIP** in this scenario: a physical enrolled phone / live Tailscale Serve / APNs is not available in an automated run. The automated test covers the relay/protocol logic only.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/application-sessions.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/auth/auth-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/auth.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-007
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/application-sessions.md`
