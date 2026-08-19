---
title: "File Preview"
description: "A compact in-thread file card that opens a history-backed full-screen read-only viewer for the exact immutable relay-issued snapshot."
trigger_phrases:
  - "preview the file"
  - "open the file card"
  - "view the changed file"
version: 1.0.0.0
---

# File Preview (file-preview)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

A compact in-thread file card that opens a history-backed full-screen read-only viewer for the exact immutable relay-issued snapshot.

The in-thread card shows only relay-authored safe metadata and, when pressed, opens a full-screen read-only viewer mounted outside the virtualized transcript. The viewer freezes the document's {artifactId, revision, digest, payload} and routes to typed image, PDF, text, code, and diff renderers sharing one shell. Missing, withheld, stale, oversized, or corrupt conditions are explicit UI states, never a path-based fallback.

Current status: shipped.

---

## 2. HOW IT WORKS

### In-thread card and activation

The file card renders only relay-authored safe metadata — nothing derived from a host path. Pressing the card opens the full-screen viewer; the component never turns a displayed filename or path into a live host-filesystem read. Opening and closing the viewer leaves the transcript untouched, since the viewer mounts outside the virtualized list.

### History-backed read-only shell

The full-screen shell owns a React Aria modal, a focus trap, and history-based dismissal via Close, Escape, or edge-back. It honors VoiceOver dismissal paths and the ≥44px control and safe-area constraints. When the viewer opens, it freezes the document identity {artifactId, revision, digest, payload} as a single, stable state for the open session.

### Typed renderers and explicit failure states

Renderer routing selects a typed renderer — image, PDF, text, code, or diff — within the shared shell based on the artifact type. The artifact route is network-only and SW-bypassed, never cached. Missing, withheld, stale, oversized, or corrupt artifacts each surface as an explicit UI state rather than a path-based fallback, honoring the immutable artifact identity invariant.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/artifacts/ArtifactViewerHost.tsx` | Component | Shared full-screen viewer shell with focus trap and history dismissal |
| `apps/pi-remote-web/src/artifacts/ArtifactCard.tsx` | Component | In-thread metadata-only file card that opens the viewer |
| `apps/pi-remote-web/src/artifacts/useArtifactResource.ts` | Handler | Fetches the exact-revision sanitized artifact snapshot |
| `apps/pi-remote-web/src/artifacts/ArtifactViewerProvider.tsx` | Shared | Viewer host state, history, and renderer routing context |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/ArtifactViewer.test.tsx` | component | Viewer shell open/close, focus, and dismissal paths |
| `apps/pi-remote-web/tests/ArtifactCard.test.tsx` | component | File card metadata rendering and activation |
| `apps/pi-remote-web/tests/useArtifactResource.test.ts` | unit | Exact-revision fetch, digest, and error states |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/file-preview.md`
- Current status: shipped

Related references:

- none — first feature catalog entry for the mobile UI features surface.
