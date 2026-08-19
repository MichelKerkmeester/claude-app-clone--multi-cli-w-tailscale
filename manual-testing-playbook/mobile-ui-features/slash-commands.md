---
title: "PR-038 -- Slash Commands"
description: "This scenario validates Slash Commands for `PR-038`. It focuses on the nonmodal composer autocomplete that inserts a relay-filtered canonical command, with Send as the only execution path."
stage: routing
version: 1.0.0.0
---

# PR-038 -- Slash Commands

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-038`.

---

## 1. OVERVIEW

This scenario validates Slash Commands for `PR-038`. It focuses on the nonmodal composer autocomplete that inserts a relay-filtered canonical command, with Send as the only execution path.

### Why This Matters

Typing a leading `/` is the operator's discoverable, keyboard-native route into host commands from the remote composer, so a regression here quietly strips users of the primary way to invoke commands. The autocomplete is populated only from the relay-filtered host command catalog, which means a leak or stale entry is a security and correctness risk if it silently regresses. Because it is the only execution path, the Send-triggered revalidation under a one-use ticket is the guard that keeps stale or invalid commands from ever reaching the host.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-038` and confirm the expected signals without contradictory evidence.

- Objective: Verify the slash-command autocomplete inserts only relay-filtered canonical command text and that Send is the sole execution path.
- Real user request: "Make sure typing `/` in the composer still gives me a clean command picker that only inserts the canonical command, and that the command only ever runs when I hit Send."
- Prompt: "Run the slash-command regression and confirm that composer autocomplete only inserts relay-filtered canonical command text with Send as the only submission path."
- Expected execution process: Running the command exercises the composer's slash autocomplete, its relay-filtered candidate loading, the insert-without-submit behavior, and the Send-only execution path that revalidates before submitting under a one-use ticket.
- Expected signals: the named test file passes with 0 failures, exit code 0
- Desired user-visible outcome: A green run proves that `/` anchoring, catalog filtering, canonical insertion, and Send-only execution all behave as specified in the current shipped state.
- Pass/fail: PASS if the named test file passes with 0 failures and exit code 0; FAIL if any test fails or the run exits nonzero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the slash-command regression and confirm that composer autocomplete only inserts relay-filtered canonical command text with Send as the only submission path."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0 from the run.

### Pass / Fail

- **Pass**: the named test file passes with 0 failures and the command exits 0.
- **Fail**: the named test file reports one or more failures, or the command exits nonzero.

### Failure Triage

Re-read `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx` to confirm the anchoring and insert-without-submit behavior match the assertions, and inspect the failing assertion in `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` to identify which behavior drifted.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/slash-commands.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-038
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/slash-commands.md`
