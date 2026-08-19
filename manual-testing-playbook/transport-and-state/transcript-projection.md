---
title: "PR-006 -- Transcript projection"
description: "This scenario validates Transcript projection for `PR-006`. It focuses on the projector converting Pi RPC events into typed blocks that the ledger can store and the web client can render, without persisting command authority for submitted phone prompts."
stage: routing
version: 1.0.0.0
---

# PR-006 -- Transcript projection

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-006`.

---

## 1. OVERVIEW

This scenario validates transcript projection for `PR-006`. It focuses on the projector converting every Pi RPC event into one or more typed, revisable blocks that the ledger can store and the web client can render, and projecting submitted phone prompts as user text blocks without persisting any command authority.

### Why This Matters

The projector is the boundary that turns the raw Pi RPC event stream into the typed, revisable transcript the ledger persists and the web client renders. If it silently regressed, events could reach storage as ill-typed or unrevisable fragments, or phone prompts could leak command authority into the transcript. Validating this regression keeps the projection layer honest and preserves the separation between displayable user text and executable authority.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-006` and confirm the expected signals without contradictory evidence.

- Objective: verify the projector turns Pi RPC events into typed blocks and phone prompts into user text blocks without persisting command authority
- Real user request: `Make sure the transcript projection still turns Pi events into typed blocks and books submitted phone prompts as user text, not as command authority.`
- Prompt: `Run the transcript projection regression and confirm Pi RPC events and submitted phone prompts project into the typed, revisable blocks without persisting command authority.`
- Expected execution process: Running the command executes the transcript-projector regression suite, which exercises event-to-block projection and the phone-prompt-as-user-text projection path.
- Expected signals: the named test file passes with 0 failures, exit code 0
- Desired user-visible outcome: a green run proves the projector still yields ledger-storable, web-renderable typed blocks and never persists command authority for phone prompts
- Pass/fail: PASS if the test file `apps/pi-remote-relay/tests/transcript-projector.test.ts` passes with 0 failures and exit code 0; FAIL if any test in that file fails or the run exits non-zero

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the transcript projection regression and confirm Pi RPC events and submitted phone prompts project into the typed, revisable blocks without persisting command authority.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/transcript-projector.test.ts`

### Expected

The test file `apps/pi-remote-relay/tests/transcript-projector.test.ts` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file showing the passing test count, and the process exit code 0.

### Pass / Fail

- **Pass**: the named test file completes with 0 failures and the command exits with code 0
- **Fail**: any test in the named file fails or the command exits with a non-zero code

### Failure Triage

Re-read `apps/pi-remote-relay/src/store/transcript-projector.ts` to confirm the projection logic still matches the expected typed-block and user-text-block behavior, then check the failing assertion in `apps/pi-remote-relay/tests/transcript-projector.test.ts` to see which projection contract the event no longer satisfies.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/transcript-projection.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/store/transcript-projector.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/transcript-projector.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-006
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/transcript-projection.md`
