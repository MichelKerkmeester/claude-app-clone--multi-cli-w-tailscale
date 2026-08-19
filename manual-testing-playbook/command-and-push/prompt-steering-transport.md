---
title: "PR-020 -- Prompt steering transport"
description: "This scenario validates Prompt steering transport for `PR-020`. It focuses on steering prompt submission through the supervised RPC child with redacted projection."
stage: routing
version: 1.0.0.0
---

# PR-020 -- Prompt steering transport

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-020`.

---

## 1. OVERVIEW

This scenario validates Prompt steering transport for `PR-020`. It focuses on steering prompt submission through the supervised RPC child with redacted projection.

### Why This Matters

The prompt command carries the user's raw instruction across process boundaries, so any leak in the transport path would persist unredacted steering text where it should never live. If the redacted projection silently regressed, secrets and raw prompt content would reach the ledger. Confirming the tested contract here guards the boundary between the transient steering command and its durable redacted record.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-020` and confirm the expected signals without contradictory evidence.

- Objective: Steering prompt submission through the supervised RPC child with redacted projection.
- Real user request: `"Make sure prompt steering still routes through the supervised RPC child and only the redacted projection reaches the ledger."`
- Prompt: `"Run the prompt steering transport regression and confirm the prompt command routes through the RPC child and commits only the redacted transcript projection back toward the ledger."`
- Expected execution process: Running the test exercises the relay forwarding a prompt to the Pi child with the steer streaming behavior and verifies that only the redacted transcript projection is committed while the prompt command itself never persists.
- Expected signals: The named test file passes with 0 failures.
- Desired user-visible outcome: A green run proves the shipped behavior routes steering through the supervised child and persists no raw, unredacted prompt command.
- Pass/fail: PASS if `apps/pi-remote-relay/tests/prompt.test.ts` passes with 0 failures and exit code 0; FAIL if that file reports any failure or a non-zero exit.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `"Run the prompt steering transport regression and confirm the prompt command routes through the RPC child and commits only the redacted transcript projection back toward the ledger."`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/prompt.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/prompt.test.ts` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for `apps/pi-remote-relay/tests/prompt.test.ts` and the exit code 0.

### Pass / Fail

- **Pass**: `apps/pi-remote-relay/tests/prompt.test.ts` passes with 0 failures and exit code 0.
- **Fail**: That file reports any failure or a non-zero exit code.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-relay/src/prompt/prompt-service.ts` to confirm which redaction and steering-projection step the failing assertion targets. Then check the assertion in `apps/pi-remote-relay/tests/prompt.test.ts` to confirm it still matches the current redacted-transcript contract.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/command-and-push/prompt-steering-transport.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/prompt/prompt-service.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/prompt.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: command-and-push
- Playbook ID: PR-020
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `command-and-push/prompt-steering-transport.md`
