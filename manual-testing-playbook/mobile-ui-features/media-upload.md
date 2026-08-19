---
title: "PR-035 -- Media Upload"
description: "This scenario validates Media Upload for `PR-035`. It focuses on proving the attachment submission path which pushes validated, sanitized bytes through revision-bound upload tickets."
stage: routing
version: 1.0.0.0
---

# PR-035 -- Media Upload

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-035`.

---

## 1. OVERVIEW

This scenario validates Media Upload for `PR-035`. It focuses on proving the attachment submission path: draft selection stays local, and pressing Send pushes bounded binary data through dedicated upload tickets.

### Why This Matters

Pixels must never travel through transcript JSON or a workspace path, so any regression that leaks image bytes into transcript data or bypasses the relay's quarantine and sanitization is a real privacy and correctness hazard. If the upload flow silently regressed, attachments could be mishandled or sanitization skipped. This must be validated so the durable transcript keeps only metadata-minimal redacted attachment cards.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-035` and confirm the expected signals without contradictory evidence.

- Objective: Prove the attachment submission path pushes validated, sanitized bytes through revision-bound upload tickets.
- Real user request: `Ensure media attachments are uploaded safely and sanitized before anything reaches Pi Remote or the transcript.`
- Prompt: `Run the attachment submission test and confirm the named test file passes with 0 failures.`
- Expected execution process: Running the command exercises the attachment draft and submission flow, confirming the composer's Send action obtains upload tickets and pushes bounded binary data that the relay quarantines, validates, and sanitizes.
- Expected signals: The named test file passes with 0 failures.
- Desired user-visible outcome: A green run proves that local draft selection with up to four removable previews plus a caption converts into validated, sanitized JPEG/PNG bytes on Send, keeping pixels out of transcript JSON and workspace paths.
- Pass/fail: PASS if the test file `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` passes with 0 failures and exit code 0; FAIL if any test in the file fails or the exit code is non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the attachment submission test and confirm the named test file passes with 0 failures.`

### Commands

1. `npx vitest run --config vitest.web.config.ts apps/pi-remote-web/tests/AttachmentSubmission.test.tsx`

### Expected

The test file `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` passes with 0 failures, exit code 0.

### Evidence

Capture the vitest summary line for the named file and the exit code 0.

### Pass / Fail

- **Pass**: The named test file passes with 0 failures and exit code 0.
- **Fail**: Any test in the file fails, or the command exits with a non-zero code.

### Failure Triage

1. Re-read the implementation anchor `apps/pi-remote-web/src/attachments/AttachmentDraftProvider.tsx` to confirm the draft-to-upload-ticket flow matches the assertions.
2. Inspect the failing assertion in `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` to see whether the failure is in draft selection, ticket acquisition, or sanitized byte handling.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/mobile-ui-features/media-upload.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `apps/pi-remote-web/src/attachments/AttachmentDraftProvider.tsx` | Primary implementation anchor |
| `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: mobile-ui-features
- Playbook ID: PR-035
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `mobile-ui-features/media-upload.md`
