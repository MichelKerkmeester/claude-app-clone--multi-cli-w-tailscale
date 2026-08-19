---
title: "Inbound Media"
description: "Pi or an approved host extension surfaces a screenshot or raster image as a promoted, metadata-only inbound_image transcript block backed by the shared F6 artifact store."
trigger_phrases:
  - "show the inbound image"
  - "display a screenshot from pi"
  - "view media sent by the agent"
version: 1.0.0.0
---

# Inbound Media (inbound-media)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Pi or an approved host extension surfaces a screenshot or raster image as a promoted, metadata-only inbound_image transcript block backed by the shared F6 artifact store.

Inbound media arrives as a promoted transcript block that renders a large, contained inline preview outside collapsible tool details. The image opens the exact immutable revision in the shared viewer over authenticated read-only, no-store reads. V1 ships without Share, Save, Copy Image, galleries, or any auto re-submission to Pi.

Current status: shipped.

---

## 2. HOW IT WORKS

### Publication and transcription

Inbound media is surfaced as a promoted `inbound_image` transcript block whose durable content is metadata-only: no Pi path, no URL, and no base64 payload is rendered. The block itself carries only the reference needed to locate the artifact, honoring the metadata-only durable transcript invariant. A contained inline preview renders at a meaningful size outside the collapsible tool details and opens the exact immutable revision in the shared viewer.

### The binary publication lane

Publishing media travels a separate lane from transcription. Publication is one-use-ticketed and capability-bound, and it is revision-checked at every step. The relay fully decodes the inbound raster, structurally redacts it, re-encodes it, hashes it, and stores bounded JPEG/PNG variants before the PWA may fetch any of them. No bytes reach the client until the relay has completed decode, redact, re-encode, and hash, then stored the exact revision. All payloads honor the same sanitize-before-delivery invariant the rest of the platform is built on.

### Verified render and state surface

The preview renders through a digest-verified bounded image path: a variant is shown only when its stored digest matches the fetched bytes, so a tampered or truncated payload fails closed rather than rendering. A distinct state surface covers loading, withheld, and error conditions so the operator always has an unambiguous signal. Because clay is never the sole state signal, these states are communicated independently of color, honoring the design invariant.

### Read-back and privacy cleanup

Fetches to the shared viewer are authenticated, read-only, and no-store: the caller gets the exact immutable revision and nothing is retained across reads. Content follows the immediate privacy cleanup invariant — the fetched bytes are not cached or persisted by the client. V1 deliberately excludes Share, Save, Copy Image, galleries, and any automatic re-submission of the media to Pi, keeping the surface read-only by default.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/artifacts/InboundImageCard.tsx` | Component | Promoted inbound image transcript card |
| `apps/pi-remote-web/src/artifacts/InboundImageBlockView.tsx` | Component | Contained inline preview and viewer entry |
| `apps/pi-remote-web/src/artifacts/VerifiedImage.tsx` | Shared | Digest-verified bounded image render |
| `apps/pi-remote-web/src/artifacts/ImageStatus.tsx` | Shared | Inbound image loading/withheld/error state surface |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/InboundImageCard.test.tsx` | component | Inbound card rendering and viewer activation |
| `apps/pi-remote-web/tests/inbound-image-states.test.tsx` | component | Loading, withheld, stale, and error states |
| `apps/pi-remote-relay/tests/inbound-media-publish.test.ts` | integration | Ticketed publication, sanitize/re-encode, exact-revision store |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/inbound-media.md`
- Current status: shipped

Related references:

- [media-upload.md](media-upload.md) - outgoing artifact publication and rendering
- [file-preview.md](file-preview.md) - the immutable revision viewer used on open
