---
title: "PR-002 -- LF JSONL framing and demux"
description: "This scenario validates LF JSONL framing and demux for `PR-002`. It focuses on strict LF-delimited JSONL framing and request id demultiplexing for the Pi RPC stream."
stage: routing
version: 1.0.0.0
---

# PR-002 -- LF JSONL framing and demux

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-002`.

---

## 1. OVERVIEW

This scenario validates LF JSONL framing and demux for `PR-002`. It focuses on strict LF-delimited JSONL framing and request id demultiplexing for the Pi RPC stream.

### Why This Matters

The two modules sit between the supervised child and the rest of the relay, so they are the first line of defense for the wire shape. The decoder turns raw stdout chunks into records, and the demultiplexer routes each record to a pending response or an event listener. If either silently regressed, malformed frames or mistrouted records would leak into every higher layer that consumes the stream — violating framing invariants and breaking request/response correlation without an obvious symptom.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-002` and confirm the expected signals without contradictory evidence.

- Objective: strict LF-delimited JSONL framing and request id demultiplexing for the Pi RPC stream.
- Real user request: `Make sure the RPC stream still enforces LF-delimited framing and routes each record to the right pending response or event listener.`
- Prompt: `Run the framing and demux regression and confirm raw stdout chunks are framed into records and each record is demultiplexed by request id before any higher layer sees a value.`
- Expected execution process: the command runs the RPC test file, exercising the decoder's newline-delimited framing and the demultiplexer's request-id routing against the Pi RPC stream.
- Expected signals: the test file `apps/pi-remote-relay/tests/rpc.test.ts` passes with 0 failures, exit code 0.
- Desired user-visible outcome: a green run proves the shipped behavior — the wire shape is enforced before any pending response or event listener consumes a record.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test in it fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the framing and demux regression and confirm raw stdout chunks are framed into records and each record is demultiplexed by request id before any higher layer sees a value.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/rpc.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/rpc.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file, exit code 0.

### Pass / Fail

- **Pass**: the named test file passes with 0 failures and the command exits 0.
- **Fail**: any test in the file fails or the command exits non-zero.

### Failure Triage

Re-read the impl anchor `apps/pi-remote-relay/src/rpc/framing.ts` to check the framing and demux logic against the failing assertion, then confirm the assertion in `apps/pi-remote-relay/tests/rpc.test.ts` reflects the intended wire shape rather than a stale expectation.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/lf-jsonl-framing-and-demux.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/rpc/framing.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/rpc.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-002
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/lf-jsonl-framing-and-demux.md`
