---
title: "PR-001 -- Canonical redaction"
description: "This scenario validates Canonical redaction for `PR-001`. It focuses on the single redaction policy applied to every envelope before persistence or broadcast."
stage: routing
version: 1.0.0.0
---

# PR-001 -- Canonical redaction

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-001`.

---

## 1. OVERVIEW

This scenario validates Canonical redaction for `PR-001`. It focuses on the single redaction policy applied to every envelope before persistence or broadcast.

### Why This Matters

Every envelope that enters the relay store is redacted first, so the ledger, sync messages, approval cards, and transcripts never carry raw path, secret, or private-text material. The same policy redacts approval arguments before they are shown to an operator. If this behavior silently regressed, sensitive material could leak into persisted state or an operator-facing surface, which defeats the entire point of the relay.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-001` and confirm the expected signals without contradictory evidence.

- Objective: Verify that every envelope is run through the single canonical redaction policy before it is persisted or broadcast, so no raw path, secret, or private-text material survives.
- Real user request: "Make sure no raw path, secret, or private text ever reaches the ledger, sync messages, approval cards, or transcripts."
- Prompt: "Run the canonical redaction regression and confirm the policy strips raw path, secret, and private-text material from every envelope before persistence or broadcast."
- Expected execution process: The regression runs the redaction test file against the relay store, exercising the single redaction policy applied to every envelope and to approval arguments before they reach any operator-visible output.
- Expected signals: the named test file passes with 0 failures.
- Desired user-visible outcome: A green run confirms the shipped behavior that no raw path, secret, or private-text material reaches persistence or any operator-facing surface.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if the named test file reports any failure or a nonzero exit.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the canonical redaction regression and confirm the policy strips raw path, secret, and private-text material from every envelope before persistence or broadcast.`

### Commands

1. `npx vitest run apps/pi-remote-relay/tests/redaction.test.ts`

### Expected

the test file 'apps/pi-remote-relay/tests/redaction.test.ts' passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file showing 0 failures, plus exit code 0.

### Pass / Fail

- **Pass**: The command exits 0 and the named test file passes with 0 failures.
- **Fail**: The command reports one or more failures in the named test file or exits nonzero.

### Failure Triage

Re-read the redaction policy at `apps/pi-remote-relay/src/store/redaction.ts` to confirm no path, secret, or private-text branch regressed, then inspect the failing assertion in `apps/pi-remote-relay/tests/redaction.test.ts` for the specific case that no longer holds.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/transport-and-state/canonical-redaction.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-relay/src/store/redaction.ts` | Primary implementation anchor |
| `apps/pi-remote-relay/tests/redaction.test.ts` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: transport-and-state
- Playbook ID: PR-001
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `transport-and-state/canonical-redaction.md`
