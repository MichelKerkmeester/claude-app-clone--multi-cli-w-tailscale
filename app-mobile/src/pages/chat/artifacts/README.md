# Artifacts: the viewer subsystem

> A bounded reader for the code, diff, Markdown, text, PDF and image artifacts that appear in a chat transcript.

---

## 1. OVERVIEW

The `artifacts/` feature opens a preview when a person selects a file card, an inbound image or an in-memory diff in the transcript. It presents the right renderer inside one dialog, reports resource status to assistive technology and returns the reader to the originating transcript control when it closes.

This is the largest chat sub-area because it combines viewer chrome, content renderers, image states, relay reads, history and privacy cleanup. The important boundary is the viewer host. A new content type belongs in its preview component and the host's renderer selection branch. A change to bytes, digest checks or object URL lifetime belongs in the resource hook, not in a preview component.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte viewer subsystem |
| Preview families | Diff, text, code, Markdown, PDF, image and unsupported fallback |
| Resource variants | Full resources and inbound-image thumbnails |
| Image policy | Verify, decode and retain pixels only through the viewer resource path |
| Main audience | People inspecting assistant-produced or inbound files |

---

## 2. FEATURES

### Key Features

| Feature | What it does |
|---|---|
| Viewer shell | [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte) owns the dialog, status, toolbar, focus containment and renderer selection. |
| Context state | [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte) lets transcript cards open, update and close a viewer without prop drilling through every row. |
| Text previews | [`text-preview.svelte`](./text-preview.svelte), [`code-preview.svelte`](./code-preview.svelte), [`diff-preview.svelte`](./diff-preview.svelte) and [`markdown-preview.svelte`](./markdown-preview.svelte) render bounded text with find and wrap controls where supported. |
| PDF previews | [`pdf-preview.svelte`](./pdf-preview.svelte) and [`pdf-page.svelte`](./pdf-page.svelte) render a page-oriented read-only PDF view with shared sizing helpers. |
| Image previews | [`secure-image-preview.svelte`](./secure-image-preview.svelte) displays verified bytes with bounded zoom and pan. |
| Inbound image states | [`card-inbound-image.svelte`](./card-inbound-image.svelte), [`image-status.svelte`](./image-status.svelte) and [`image-placeholder.svelte`](./image-placeholder.svelte) keep processing, unavailable and privacy states explicit. |
| Resource integrity | [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts) checks the exact revision, content type, byte length and digest before exposing content or an object URL. |
| Share and history | [`artifact-share.ts`](./artifact-share.ts) gates copy and share actions. [`use-artifact-history.svelte.ts`](./use-artifact-history.svelte.ts) gives the open viewer a browser back path. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Viewer context | A parent [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte) around the transcript surface | Cards call the context to open a source. |
| Preview source | A file preview descriptor, file diff, inbound image or in-memory artifact document | The host rejects an unverifiable source and renders an unsupported notice. |
| Relay resource | A session id for non-inline content | Inline text can render from the descriptor. Binary and remote content use the resource hook. |
| Security boundary | Verified, bounded bytes before image pixels are retained | Inbound images must continue through the secure image path. |

---

## 4. STRUCTURE

| Path | Role |
|---|---|
| [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte) | Viewer context, open and close phases, browser history and privacy cleanup. |
| [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte) | Dialog shell, resource hooks, toolbar state and preview selection. |
| [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts) | Exact-tuple resource loading, verification, retention and purge. |
| [`types.ts`](./types.ts) | Shared viewer phases, source types, preview snapshots and context contracts. |
| [`artifact-header.svelte`](./artifact-header.svelte) | Title, kind and exact revision line. |
| [`artifact-status.svelte`](./artifact-status.svelte) | Polite status and assertive terminal announcements. |
| [`preview-controls.svelte`](./preview-controls.svelte) | Find, wrap, zoom, pan, details, copy and share controls. |
| [`card-artifact.svelte`](./card-artifact.svelte) | Transcript card for a file diff or preview source. |
| [`card-inbound-image.svelte`](./card-inbound-image.svelte) | Transcript card and lifecycle entry point for inbound images. |

---

## 5. USAGE EXAMPLES

| Person action | Result |
|---|---|
| Open a file card | The viewer captures the trigger and scroll position, then selects a renderer from the source descriptor. |
| Search a code or text preview | The toolbar highlights matching text without changing the underlying artifact. |
| Zoom an image | The viewer clamps zoom and pan. It exposes pixels only after the resource has passed digest and image-decode checks. |
| Open a PDF | The PDF preview reports page and resource state while keeping the content read-only. |
| Close with Escape, Back or a swipe | The provider purges retained image nodes and resources, closes the history entry and restores focus when the trigger still exists. |
| Return from a hidden page | Privacy lifecycle events close the viewer and clear in-memory resources before the page becomes visible again. |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| Preview unavailable | The descriptor is withheld, denied, missing, unsupported or not ready. | Read the status message. Only retry or latest-revision actions exposed by the viewer are safe. |
| Preview says stale | The host revision changed or the response did not match the requested tuple. | Choose View latest to request the same exact revision again, then inspect the new status. |
| Image shows a placeholder | Pixels are still processing, unavailable or intentionally withheld. | Keep the placeholder and lifecycle status. Do not add a raw image path around verification. |
| Full image loading stalls | The thumbnail is available but the bounded full-resource read has not settled. | Use the viewer retry path. The host may show a degraded thumbnail state while it waits. |
| Copy or Share is missing | The browser capability or artifact policy does not allow that action. | Use the available text selection or platform sharing path. |
| Viewer closes when the app hides | Privacy lifecycle cleanup intentionally purges the open viewer. | Reopen the source after the session is visible and current. |

---

## 7. RELATED RESOURCES

### Related Documents

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Renderer topology, verification boundaries and change placement. |
| [`../README.md`](../README.md) | Chat surface navigation and ownership. |
| [`../transcript/README.md`](../transcript/README.md) | File cards and transcript behavior that open this viewer. |
| [`../rich-content/README.md`](../rich-content/README.md) | Inline Markdown, code and command output that stays inside a transcript row. |
