---
title: "PR-009 -- Device enrollment"
description: "This scenario validates Device enrollment for `PR-009`. It focuses on the relay minting a one-time QR pairing challenge and a phone proving possession of a fresh P-256 key before registration."
stage: routing
version: 1.0.0.0
---

# PR-009 -- Device enrollment

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-009`.

---

## 1. OVERVIEW

This scenario validates Device enrollment for `PR-009`. It focuses on the relay minting a one-time QR pairing challenge and a phone proving possession of a fresh P-256 key before registration.

### Why This Matters

Enrollment is the boundary where an untrusted phone becomes a trusted, registered device, so a regression here can silently open the door to forged or reused pairing payloads. If the one-time QR challenge stops being single-use, or the ECDSA proof stops verifying the byte-stable enrollment statement, a device could be registered without ever proving key possession. Guarding this flow keeps the relay's binding guarantee honest.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-009` and confirm the expected signals without contradictory evidence.

- Objective: Verify that a one-time pairing challenge gates registration behind a P-256 possession proof.
- Real user request: "Make sure a phone can't get registered unless it signs the enrollment statement with a fresh P-256 key it actually holds."
- Prompt: "Run the enrollment regression and confirm the relay still registers a device only after it mints a one-time QR challenge and the phone proves possession of a fresh P-256 key."
- Expected execution process: Running the command exercises the relay's auth module — the one-time pairing challenge minting and the ECDSA/statement-verification registration path.
- Expected signals: the test file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures, exit code 0.
- Desired user-visible outcome: A green run proves that registration on the relay still requires a valid key-possession proof and that no device is bound without it.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test fails or the exit code is non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the enrollment regression and confirm the relay still registers a device only after it mints a one-time QR challenge and the phone proves possession of a fresh P-256 key."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/auth.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/auth.test.ts` passes with 0 failures and exits with code 0.

### Evidence

Capture the vitest summary line for `apps/pi-remote-relay/tests/auth.test.ts` showing 0 failures, and confirm the process exit code is 0.

### Pass / Fail

- **Pass**: the test file passes with 0 failures and exit code 0.
- **Fail**: any assertion in the file fails, or the command exits with a non-zero code.

### Failure Triage

Re-read `apps/pi-remote-relay/src/auth/enrollment.ts` to confirm the one-time challenge and statement-verification logic still match what the test asserts. Then inspect the failing assertion in `apps/pi-remote-relay/tests/auth.test.ts` to see whether the failure is a behavior break or a stale expectation.

### Optional Supplemental Checks

- **Physical device enrollment end-to-end**: enroll a physical phone via the live QR challenge, confirm the device is registered only after it signs the enrollment statement, and confirm the pairing payload is single-use (a second scan is rejected).
- Mark: **SKIP** — full end-to-end validation requires a physical enrolled phone / live Tailscale Serve / APNs, which is not available in an automated run. The automated test covers the relay/protocol logic only.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/auth-and-boundary/device-enrollment.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/auth/enrollment.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/auth.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: auth-and-boundary
- Playbook ID: PR-009
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `auth-and-boundary/device-enrollment.md`
