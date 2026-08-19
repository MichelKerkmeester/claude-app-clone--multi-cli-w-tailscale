---
title: "Media Upload"
description: "Stage up to four photo previews plus a caption locally, then send them to Pi Remote as validated, sanitized images via revision-bound upload tickets."
trigger_phrases:
  - "upload a photo"
  - "attach an image to the chat"
  - "add a picture from my library"
version: 1.0.0.0
---

# Media Upload (mobile-ui-features/media-upload)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Stage up to four photo previews plus an optional caption locally, then send them to Pi Remote as validated, sanitized images.

When the host has media enabled and the model advertises image input, the composer and menu expose Photo Library and Take Photo actions. Selection stays a local draft of up to four removable previews plus a caption until the operator presses Send; only then does the app obtain dedicated upload tickets and push bounded binary data. The relay quarantines bytes outside the webroot, validates and normalizes each image, and hands sanitized JPEG/PNG bytes to Pi through its images RPC field. Pixels never travel through transcript JSON or a workspace path, and the durable transcript keeps only metadata-minimal redacted attachment cards.

Current status: shipped.

---

## 2. HOW IT WORKS

### Capability-gated entry point

Photo Library and Take Photo actions appear in the composer and menu only when two conditions both hold: the host has media enabled, and the active model advertises image input. Without both gates satisfied, the actions stay hidden and no photos can be staged.

### Local draft staging

While the operator composes, selected photos live only in local draft state. The rail shows up to four removable previews, and a single optional caption accompanies them. Nothing leaves the device until the operator presses Send — draft selection, preview removal, and caption editing all happen without any upload.

### Ticketed, bounded upload

On Send, Pi Remote requests dedicated upload tickets and performs bounded binary PUTs. Each upload ticket is one-use and revision-bound, so a ticket cannot be reused and is valid only for its bound revision. Uploads fail closed: any mutation attempt without a valid ticket is denied. Pixels travel as bounded binary payloads only through the upload transport — never through transcript JSON and never through a workspace path.

### Quarantine, validation, and delivery

The relay stores incoming bytes only in a quarantine located outside the document webroot, keeping them out of any exposed static tree. It validates and normalizes each image before delivery, and hands only sanitized JPEG/PNG bytes to Pi through its images RPC field. The images RPC accepts this sanitized binary directly, so the durable transcript never receives pixels. Instead, the transcript records only metadata-minimal redacted attachment cards — no pixel data, filenames, hashes, or paths leak into it. Uploads also honor the coverage/token allowlist for its data, stripping any tokens; the one-use ticket revokes on use, and one-time-use pre-signed URLs expire after a single use. Delivery is bounded with a size cap, and retries carry the original ticket only while it remains valid; once a revision moves on, stale retries fail closed instead of landing in an old revision.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/attachments/AttachmentDraftProvider.tsx` | Component | Local draft state for staged photos and caption |
| `apps/pi-remote-web/src/attachments/AttachmentRail.tsx` | Component | Composer attachment lane with removable previews |
| `apps/pi-remote-web/src/attachments/useAttachmentSubmission.ts` | Handler | Ticketed bounded upload PUT and submission lifecycle |
| `apps/pi-remote-web/src/attachments/attachment-client.ts` | Shared | Upload transport, hashing, and stale/retry handling |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/AttachmentSubmission.test.tsx` | component | Send, upload, normalization, retry, delivery-unknown states |
| `apps/pi-remote-web/tests/AttachmentRail.test.tsx` | component | Draft preview rail and removal |
| `apps/pi-remote-relay/tests/attachments.test.ts` | integration | Relay quarantine ingest, validation, and Pi delivery |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/media-upload.md`
- Current status: shipped

Related references:

- [inbound-media.md](inbound-media.md) - The inbound counterpart: Pi-originated media delivered back to the transcript.
