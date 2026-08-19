---
title: "PR-025 -- Typed-block transcript"
description: "This scenario validates Typed-block transcript for `PR-025`. It focuses on the live transcript view that renders typed, revisable blocks from sync messages."
stage: routing
version: 1.0.0.0
---

# PR-025 -- Typed-block transcript

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-025`.

---

## 1. OVERVIEW

This scenario validates Typed-block transcript for `PR-025`. It focuses on the live transcript view that renders typed, revisable blocks from sync messages.

### Why This Matters

Blocks that fail to normalize by stable id and revision would mis-render or duplicate, so the transcript must stay consistent across message updates. An epoch change must block reconciliation until a fresh snapshot arrives, or viewers could see stale blocks past a barrier. Dedicated renderers, including redacted file diffs and usage rows, collapse these edges silently — a regression here would corrupt the primary reading surface of a long transcript.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-025` and confirm the expected signals without contradictory evidence.

- Objective: Confirm the typed-block transcript still normalizes, guards epoch reconciliation, virtualizes long transcripts, and renders every block kind on its dedicated renderer.
- Real user request: "Make sure the live transcript still renders revisable typed blocks from sync messages without breakage."
- Prompt: "Run the typed-block transcript regression and confirm the transcript state normalizes, reconciles across epoch changes, virtualizes long lists, and renders all block kinds."
- Expected execution process: exercising the transcript state and render dispatch by running the App unit suite, which covers block normalization by id and revision, corroborates the epoch-fence behavior, and exercises the virtualized list plus per-kind renderers including redacted file diffs and usage rows.
- Expected signals: the named test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures, exit code 0.
- Desired user-visible outcome: a green run proves the shipped transcript keeps each unstable sync-derived block stable, holds rendering until a fresh snapshot clears an epoch barrier, and renders long transcripts and every block kind faithfully.
- Pass/fail: PASS if the command exits 0 with 0 failures on `apps/pi-remote-web/tests/App.test.tsx`; FAIL if the suite reports failures or a non-zero exit.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the typed-block transcript regression and confirm the transcript state normalizes, reconciles across epoch changes, virtualizes long lists, and renders all block kinds."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/App.test.tsx`

### Expected

the test file `apps/pi-remote-web/tests/App.test.tsx` passes with 0 failures, exit code 0.

### Evidence

- The vitest summary line for `apps/pi-remote-web/tests/App.test.tsx` reporting the passing test count with 0 failed.
- The shell exit code `0`.

### Pass / Fail

- **Pass**: the command exits `0` and the suite reports 0 failures on `apps/pi-remote-web/tests/App.test.tsx`.
- **Fail**: the command exits non-zero, or the suite reports one or more failed tests for that file.

### Failure Triage

- Re-read `apps/pi-remote-web/src/state.ts` to confirm block normalization by stable id and revision and the epoch-change reconciliation barrier still match the assertions.
- Inspect the failing assertion output to identify which transcript behavior (normalization, epoch fence, virtualization, or a specific block-kind renderer) diverged, then confirm the expectation still matches shipped behavior.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/pwa/typed-block-transcript.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/state.ts` | Primary implementation anchor |
| `apps/pi-remote-web/tests/App.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: pwa
- Playbook ID: PR-025
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `pwa/typed-block-transcript.md`
