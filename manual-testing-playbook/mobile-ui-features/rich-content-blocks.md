---
title: "PR-037 -- Rich Content Blocks"
description: "This scenario validates Rich Content Blocks for `PR-037`. It focuses on the routing of redacted transcript envelopes into three typed read-only card projections."
stage: routing
version: 1.0.0.0
---

# PR-037 -- Rich Content Blocks

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-037`.

---

## 1. OVERVIEW

This scenario validates Rich Content Blocks for `PR-037`. It focuses on the routing of already-redacted transcript envelopes into three typed read-only card projections: paired bash command/output cards, fenced-code cards, and explicit or substantial text-artifact cards.

### Why This Matters

These cards are the primary surface where operators consume redacted transcript output, so a routing regression silently corrupts how content is presented. Each card also owns the unit-level Copy of the exact canonical redacted unit, meaning any misrouting leaks or mislabels content that must stay confined to its typed preview and the F6 viewer. Validating that no download, publishing, editing, execution, or host-file access is introduced preserves the read-only contract of the renderer.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-037` and confirm the expected signals without contradictory evidence.

- Objective: Verify that the router renders the three typed read-only card projections from redacted transcript envelopes, each with a bounded preview, canonical-unit Copy, and Open into the shared F6 viewer.
- Real user request: "Make sure command-pair, code-block, and text artifacts still surface as their own card types after transcripts are read."
- Prompt: "Run the Rich Content Router regression and confirm all three card types render with bounded previews and correct Copy behavior."
- Expected execution process: running the command exercises the router against redacted envelopes and asserts that bash command/output pairs, fenced-code units, and text artifacts each resolve to their intended card projections with the correct actions exposed.
- Expected signals: the named test file passes with 0 failures and exits 0.
- Desired user-visible outcome: a green run proves redacted transcripts are still projected as correct, bounded, read-only card types with no added download, publish, edit, execute, or host-file access.
- Pass/fail: PASS if the test file `apps/pi-remote-web/tests/RichContentRouter.test.tsx` reports 0 failures with exit code 0; FAIL if it reports any failure or a nonzero exit.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the Rich Content Router regression and confirm all three card types render with bounded previews and correct Copy behavior."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/RichContentRouter.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/RichContentRouter.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file showing 0 failures and the process exit code 0.

### Pass / Fail

- **Pass**: The test file `apps/pi-remote-web/tests/RichContentRouter.test.tsx` passes with 0 failures and exit code 0.
- **Fail**: The test file reports any failure or exits nonzero.

### Failure Triage

Re-read the primary implementation anchor `apps/pi-remote-web/src/rich-content/RichContentRouter.tsx` to confirm the routing branches still match the three card types. Inspect the failing assertion to determine which projection diverged, then rerun the exact command to confirm the repair.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/rich-content-blocks.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/rich-content/RichContentRouter.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/RichContentRouter.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-037
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/rich-content-blocks.md`
