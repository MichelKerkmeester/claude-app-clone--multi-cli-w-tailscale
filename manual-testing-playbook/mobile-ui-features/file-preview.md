---
title: "PR-033 -- File Preview"
description: "This scenario validates File Preview for `PR-033`. It focuses on the in-thread file card that opens a history-backed full-screen read-only viewer for the exact immutable relay-issued snapshot."
stage: routing
version: 1.0.0.0
---

# PR-033 -- File Preview

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-033`.

---

## 1. OVERVIEW

This scenario validates File Preview for `PR-033`. It focuses on the in-thread file card that opens a full-screen read-only viewer for the exact immutable relay-issued snapshot. The viewer freezes the document's {artifactId, revision, digest, payload} and routes to typed image, PDF, text, code, and diff renderers sharing one shell.

### Why This Matters

Attachments are the point of trust in a relay thread: the preview must show the exact file the relay sealed, never a re-read or path-based fallback. Missing, withheld, stale, oversized, or corrupt conditions must surface as explicit UI states. If a regression broke the freeze of {artifactId, revision, digest, payload} or reintroduced a path-backed render, a user would silently view the wrong bytes.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-033` and confirm the expected signals without contradictory evidence.

- Objective: Verify the history-backed full-screen read-only viewer opens from the in-thread file card against the immutable relay-issued snapshot.
- Real user request: `Make sure tapping a file in the thread opens the exact relay-sealed read-only preview, never a path-based fallback.`
- Prompt: `Run the ArtifactViewer regression and confirm the viewer freezes the immutable relay-issued snapshot with typed renderers and explicit missing/concealed/stale/oversized/corrupt states.`
- Expected execution process: Running the command mounts the viewer outside the virtualized transcript, exercises the shared shell and the typed image/PDF/text/code/diff renderer routing, and asserts the freeze of the document's {artifactId, revision, digest, payload}.
- Expected signals: the named test file passes with 0 failures and exit code 0.
- Desired user-visible outcome: A green run proves a tapped file card opens the exact relay-issued read-only snapshot with correct typed rendering and no path-based fallback.
- Pass/fail: PASS if `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` passes with 0 failures and exit code 0; FAIL if any assertion in that file fails or the command exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the ArtifactViewer regression and confirm the viewer freezes the immutable relay-issued snapshot with typed renderers and explicit missing/concealed/stale/oversized/corrupt states.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/ArtifactViewer.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` passes with 0 failures and exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0. Confirm the run reports 0 failed tests for `apps/pi-remote-web/tests/ArtifactViewer.test.tsx`.

### Pass / Fail

- **Pass**: `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` passes with 0 failures and the command exits 0.
- **Fail**: Only if the command exits non-zero or the file reports 1 or more failures.

### Failure Triage

Re-read the primary implementation anchor `apps/pi-remote-web/src/artifacts/ArtifactViewerHost.tsx` to confirm the viewer mounts outside the virtualized transcript and freezes the {artifactId, revision, digest, payload}. Then inspect the failing assertion in `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` to trace which renderer or explicit state branch diverged.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/file-preview.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/artifacts/ArtifactViewerHost.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-033
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/file-preview.md`
