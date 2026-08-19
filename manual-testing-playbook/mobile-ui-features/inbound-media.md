---
title: "PR-034 -- Inbound Media"
description: "This scenario validates Inbound Media for `PR-034`. It focuses on promoted, metadata-only inbound_image transcript blocks backed by the shared F6 artifact store."
stage: routing
version: 1.0.0.0
---

# PR-034 -- Inbound Media

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-034`.

---

## 1. OVERVIEW

This scenario validates Inbound Media for `PR-034`. It focuses on promoted, metadata-only inbound_image transcript blocks backed by the shared F6 artifact store.

### Why This Matters

Inbound media is the primary way a user sees imagery surfaced into their session, and this promotion path must render it as a large, contained inline preview outside collapsible tool details. If the block silently lost its preview, broke the authenticated read-only no-store view, or shifted away from metadata-only semantics, users would see broken or leaked artifact references. Because V1 deliberately omits Share, Save, Copy Image, galleries, and any auto re-submission to Pi, confirming the current surface is exactly this minimal contract prevents scope drift from being mistaken for shipped behavior.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-034` and confirm the expected signals without contradictory evidence.

- Objective: Verify that the inbound_image transcript block renders a large, contained inline preview and opens the exact immutable revision in the shared viewer over authenticated read-only, no-store reads, with no media actions exposed in V1.
- Real user request: "Make sure an image surfaced into my session renders as a proper inline preview and opens the exact same revision, without me being able to save or re-submit it."
- Prompt: "Run the Inbound Media validation and confirm the promoted inbound_image card renders its inline preview, opens the exact immutable revision over read-only no-store reads, and exposes no media actions."
- Expected execution process: Running the named InboundImageCard test exercises the promoted metadata-only inbound_image block: the large contained inline preview, the opening of the exact immutable revision in the shared viewer via authenticated read-only no-store reads, and the absence of any V1 media actions (Share, Save, Copy Image, gallery, or auto re-submission).
- Expected signals: the named test file passes with 0 failures, observed on the vitest summary line for `apps/pi-remote-web/tests/InboundImageCard.test.tsx`.
- Desired user-visible outcome: a green run proves the shipped inbound media behavior — a promoted transcript block with a large contained preview that opens the exact immutable revision read-only with no-store, and no media actions or re-submission.
- Pass/fail: PASS if the test file passes with 0 failures and exit code 0; FAIL if any test in the file fails or the run exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: "Run the Inbound Media validation and confirm the promoted inbound_image card renders its inline preview, opens the exact immutable revision over read-only no-store reads, and exposes no media actions."

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/InboundImageCard.test.tsx`

### Expected

The target file `apps/pi-remote-web/tests/InboundImageCard.test.tsx` reports 0 failures with exit code 0.

### Evidence

- The vitest summary line for `apps/pi-remote-web/tests/InboundImageCard.test.tsx` showing all tests passed.
- Exit code 0 from the command run.

### Pass / Fail

- **Pass**: the file `apps/pi-remote-web/tests/InboundImageCard.test.tsx` passes with 0 failures and the command exits 0.
- **Fail**: any test in that file fails, or the command exits non-zero.

### Failure Triage

Re-read the implementation anchor `apps/pi-remote-web/src/artifacts/InboundImageCard.tsx` to confirm the promoted inline-preview structure and the read-only no-store viewer wiring, then inspect the failing assertion in the test file to see which behavior (preview containment, immutable revision resolution, read-only/no-store read, or absence of media actions) drifted from the contract.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/inbound-media.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/artifacts/InboundImageCard.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/InboundImageCard.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-034
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/inbound-media.md`
