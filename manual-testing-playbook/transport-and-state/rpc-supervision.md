---
title: "PR-004 -- RPC supervision"
description: "This scenario validates RPC supervision for `PR-004`. It focuses on persistent supervision of one Pi RPC child with bounded restart and recorded fixture fallback."
stage: routing
version: 1.0.0.0
---

# PR-004 -- RPC supervision

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-004`.

---

## 1. OVERVIEW

This scenario validates RPC supervision for `PR-004`. It focuses on persistent supervision of one Pi RPC child with bounded restart and recorded fixture fallback.

### Why This Matters

The relay depends on a single `pi --mode rpc` child for every prompt-steering operation, so an unmonitored or unbounded child failure would silently strand all steering traffic. Because the supervisor is also the fallback source of recorded Pi RPC events when the live child is unavailable, a regression here would break both live steering and the recorded-event fallback at once. Validating the bounded restart and fallback behavior before shipping guards the relay's one command path from silent outages.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-004` and confirm the expected signals without contradictory evidence.

- Objective: persistent supervision of one Pi RPC child with bounded restart and recorded fixture fallback
- Real user request: "Make sure the relay keeps its single RPC child supervised and falls back to recorded events when the live child is down."
- Prompt: "Run the RPC supervision regression and confirm the supervisor owns exactly one Pi RPC child with bounded restart and recorded fixture fallback."
- Expected execution process: the named regression exercises the relay's supervision path, confirming the supervisor owns exactly one `pi --mode rpc` child, restarts it within a bounded policy, and falls back to recorded Pi RPC events when the live child is unavailable, across the send, event, error, health, start, and stop operations.
- Expected signals: the test file `apps/pi-remote-relay/tests/rpc.test.ts` passes with 0 failures, exit code 0
- Desired user-visible outcome: a green run proves the shipped relay supervises its single RPC child under a bounded restart policy and serves recorded events as a fallback whenever the live child is unavailable.
- Pass/fail: PASS if `apps/pi-remote-relay/tests/rpc.test.ts` passes with 0 failures and exit code 0; FAIL if the file reports any failure or a non-zero exit code.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the RPC supervision regression and confirm the supervisor owns exactly one Pi RPC child with bounded restart and recorded fixture fallback."

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/rpc.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/rpc.test.ts` passes with 0 failures, exit code 0.

### Evidence

- The vitest summary line for `apps/pi-remote-relay/tests/rpc.test.ts` reporting 0 passed and 0 failed.
- Exit code 0.

### Pass / Fail

- **Pass**: `npx vitest run apps/pi-remote-relay/tests/rpc.test.ts` exits 0 with 0 failures.
- **Fail**: the run reports any failed test or a non-zero exit code.

### Failure Triage

- Re-read the primary implementation anchor `apps/pi-remote-relay/src/rpc/supervisor.ts` to confirm the single-child ownership, the bounded restart policy, and the recorded-event fallback path are intact.
- Check the failing assertion in `apps/pi-remote-relay/tests/rpc.test.ts` against the supervisor contract to see whether the behavior or the expectation drifted.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/rpc-supervision.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/rpc/supervisor.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/rpc.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-004
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/rpc-supervision.md`
