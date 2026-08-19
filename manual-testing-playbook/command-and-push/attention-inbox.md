---
title: "PR-019 -- Attention inbox"
description: "This scenario validates the attention inbox for `PR-019`. It focuses on resolving hints to current relay state through the push service and confirming the protocol-level regression stays green."
stage: routing
version: 1.0.0.0
---

# PR-019 -- Attention inbox

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-019`.

---

## 1. OVERVIEW

This scenario validates the attention inbox for `PR-019`. It focuses on resolving hints to current relay state through the push service and confirming the protocol-level regression stays green.

Attention items persist with class, generation, and nonce metadata only; opening one reauthenticates, resolves the current epoch, and routes to the review or session view. The inbox remains available even when notifications are denied.

### Why This Matters

The attention inbox is the bounded surface through which a user re-enters work left elsewhere, so a silent regression here strands users from their review or session context. Because only class, generation, and nonce metadata is persisted and every open reauthenticates and re-resolves the current epoch, any break in that resolve path corrupts what the user lands on. The inbox also must stay available when notifications are denied, so its availability is not coupled to push permission state — a regression in this toggle would hide an entire surface without any obvious error.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-019` and confirm the expected signals without contradictory evidence.

- Objective: Validate that the attention inbox still resolves hints to current relay state through the push service.
- Real user request: "Make sure opening an attention item still lands me on the right review or session view for the current epoch."
- Prompt: "Run the push regression and confirm the attention inbox still resolves hints to current relay state through the push service."
- Expected execution process: Running the command collects every test in the push test file, exercises the attention inbox resolve path against the push service, and reports per-file totals and an overall exit code.
- Expected signals: the named test file `apps/pi-remote-relay/tests/push.test.ts` passes with 0 failures and exit code 0.
- Desired user-visible outcome: a green run proves the shipped inbox still persists and resolves attention items with only class, generation, and nonce metadata, and stays available when notifications are denied.
- Pass/fail: PASS if `apps/pi-remote-relay/tests/push.test.ts` passes with 0 failures and exit code 0; FAIL if any test in that file fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the push regression and confirm the attention inbox still resolves hints to current relay state through the push service."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/push.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/push.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file showing 0 failed and the summary row's exit code 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-relay/tests/push.test.ts` passes with 0 failures and the run exits 0.
- **Fail**: any test in the file fails or the run exits non-zero.

### Optional Supplemental Checks

- Physical-device leg of the inbox end-to-end open-and-reroute path: **SKIP** — a physical enrolled phone / live Tailscale Serve / APNs is not available in an automated run. The automated test covers the relay/protocol logic only.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/push/push-service.ts` to confirm the attention-item resolve path (reauthenticate, resolve current epoch, route to review or session view) still matches the assertion under test. If the anchor looks intact, inspect the failing assertion in `apps/pi-remote-relay/tests/push.test.ts` to see which metadata contract (class, generation, nonce) or availability-under-denied-notifications branch it exercises, and confirm it reflects current behavior rather than stale expectations.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/command-and-push/attention-inbox.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/push/push-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/push.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: command-and-push
- Playbook ID: PR-019
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `command-and-push/attention-inbox.md`
