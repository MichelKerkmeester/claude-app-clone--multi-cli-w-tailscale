---
title: "PR-021 -- VAPID content-free push"
description: "This scenario validates VAPID content-free push for `PR-021`. It focuses on Web Push delivery of content-free attention hints with encrypted stored subscriptions."
stage: routing
version: 1.0.0.0
---

# PR-021 -- VAPID content-free push

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-021`.

---

## 1. OVERVIEW

This scenario validates VAPID content-free push for `PR-021`. It focuses on Web Push delivery of content-free attention hints with encrypted stored subscriptions.

### Why This Matters

Push delivery is the only path that turns a background inbox into an attention surface, so silent regression here means hints simply stop arriving without any local error surfacing. Because stored subscriptions are encrypted at rest and hints carry only a lookup id and attention class, any leak or delivery mistake breaks either the privacy contract or the foreground/disabled-suppression behavior. The client can disable push at any time and still use the inbox, so this dual-path behavior must stay green.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-021` and confirm the expected signals without contradictory evidence.

- Objective: Web Push delivery of content-free attention hints with encrypted stored subscriptions.
- Real user request: "Make sure notifications still arrive as attention hints, stay content-free, and respect foreground/disabled suppression."
- Prompt: "Run the VAPID content-free push regression and confirm the relay sends only a lookup id and attention class, with subscriptions stored encrypted and delivery suppressed for foreground devices and toggled-off classes."
- Expected execution process: running the push regression exercises subscription storage, hint assembly, and the suppression logic in behavior terms.
- Expected signals: the named test file passes with 0 failures, exit code 0.
- Desired user-visible outcome: a green run proves the shipped relay stores subscriptions encrypted at rest, emits content-free attention hints, and suppresses delivery for foreground devices and toggled-off classes while the client retains inbox access with push disabled.
- Pass/fail: PASS if the named test file passes with 0 failures, exit code 0; FAIL if any test errors or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the VAPID content-free push regression and confirm the relay sends only a lookup id and attention class, with subscriptions stored encrypted and delivery suppressed for foreground devices and toggled-off classes."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/push.test.ts`

### Expected

the test file 'apps/pi-remote-relay/tests/push.test.ts' passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for `push.test.ts` (pass / fail count per file) and the command exit code, which must be 0. No contradictory output (unexpected failures, skipped-critical cases) may appear.

### Pass / Fail

- **Pass**: the test file `apps/pi-remote-relay/tests/push.test.ts` passes with 0 failures and the run exits 0.
- **Fail**: any test in the file fails or the run exits nonzero.

### Failure Triage

- Re-read the implementation anchor `apps/pi-remote-relay/src/push/push-service.ts` to confirm hint fields and encryption/suppression branches are still as authored before trusting the failure.
- Confirm the failing assertion is the intended eligibility (encryption, lookup id, attention class, foreground/disabled suppression) and not a stale fixture or environment issue, then rerun the exact command.

### Optional Supplemental Checks

- Physical-device push delivery end to end (hint actually rendered on a real enrolled phone via Tailscale and APNs): **SKIP** — a physical enrolled phone / live Tailscale Serve / APNs is not available in an automated run. The automated test covers the relay/protocol logic only.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/command-and-push/vapid-content-free-push.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/push/push-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/push.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: command-and-push
- Playbook ID: PR-021
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `command-and-push/vapid-content-free-push.md`
