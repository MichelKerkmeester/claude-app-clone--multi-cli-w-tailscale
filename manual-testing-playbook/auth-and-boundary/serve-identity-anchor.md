---
title: "PR-012 -- Serve-identity anchor"
description: "This scenario validates Serve-identity anchor for `PR-012`. It focuses on the fail-closed loopback ingress trusting only the Serve secret path and Tailscale identity headers."
stage: routing
version: 1.0.0.0
---

# PR-012 -- Serve-identity anchor

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-012`.

---

## 1. OVERVIEW

This scenario validates Serve-identity anchor for `PR-012`. It focuses on the fail-closed loopback ingress that trusts only the Serve secret path and the Tailscale identity headers.

### Why This Matters

A relay that silently trusts arbitrary origin or identity headers would let an unauthenticated client reach the read-only server. The contract also requires that the server never re-reads those identity headers after authentication, so a regression here is an authentication-boundary hole. This must be validated because a green run is the only automated proof that the loopback binding, secret path, public-origin check, and Tailscale user login gate all fail closed.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-012` and confirm the expected signals without contradictory evidence.

- Objective: confirm the relay binds to IPv4 loopback only and rejects any request missing the secret path prefix, the exact public origin, or a Tailscale user login header, and never re-reads identity headers after authentication.
- Real user request: "Make sure the relay only accepts requests that carry the Serve secret path and the real Tailscale identity headers."
- Prompt: "Run the Serve-identity anchor test and confirm the auth boundary fails closed on loopback."
- Expected execution process: the server binds to IPv4 loopback and exercises the request-authorization path; every request is required to carry the secret path prefix, the exact public origin, and a Tailscale user login header.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: a green run proves the read-only HTTP and WebSocket server accepts only authenticated loopback traffic and does not re-read identity headers after authentication.
- Pass/fail: PASS if the file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures and exit code 0; FAIL if it fails, reports non-zero failures, or returns a non-zero exit code.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the Serve-identity anchor test and confirm the auth boundary fails closed on loopback."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/auth.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for `apps/pi-remote-relay/tests/auth.test.ts` (test-file pass, 0 failed) and the exit code 0.

### Pass / Fail

- **Pass**: the file `apps/pi-remote-relay/tests/auth.test.ts` reports 0 failures and the command exits 0.
- **Fail**: any assertion fails, the file reports non-zero failures, or the command exits non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/http/server.ts` to confirm the loopback bind, the secret path prefix check, the exact public-origin check, and the Tailscale user login header gate are all enforced. Then inspect the failing assertion in `apps/pi-remote-relay/tests/auth.test.ts` to see which boundary condition the test expected.

### Optional Supplemental Checks

- **On-device end-to-end leg**: exercise the full identity flow against a physical enrolled phone served through live Tailscale Serve with APNs delivery. Verdict: **SKIP** — a physical enrolled phone / live Tailscale Serve / APNs is not available in an automated run. The automated test covers the relay/protocol logic only.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/serve-identity-anchor.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/http/server.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/auth.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-012
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/serve-identity-anchor.md`
