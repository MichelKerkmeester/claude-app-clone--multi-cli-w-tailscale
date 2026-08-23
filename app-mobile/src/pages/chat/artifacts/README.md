# Artifacts — the viewer subsystem

Renders the artifacts an agent produces or receives — code, diffs, markdown, PDFs, and images — inside the chat transcript. It's the richest sub-area of the chat screen: a viewer *host* plus a family of per-type *preview* renderers, with secure handling for inbound images.

## What lives here

- **Host + provider:** `artifact-viewer-host.svelte` (the viewer shell) and `artifact-viewer-provider.svelte` (shares viewer state to descendants via context).
- **Card frame:** `ArtifactCard`, `ArtifactHeader`, `ArtifactDetails`, `ArtifactStatus`, `PreviewControls`.
- **Per-type previews:** `CodePreview`, `DiffPreview`, `MarkdownPreview`, `TextPreview`, `PdfPreview` (+ `PdfPage`), `UnsupportedPreview`.
- **Image handling:** `ImagePreview`, `ImagePlaceholder`, `ImageStatus`, `InboundImageCard`, `InboundImageBlockView`, `SecureImagePreview`, `VerifiedImage`.
- **Logic:** `use-artifact-resource.svelte.ts` + `use-artifact-history.svelte.ts` (runes lifecycles), `artifact-share.ts`, `pdf-preview-shared.ts`, `types.ts`.

## Why it's shaped this way

- **One preview per content type.** Adding support for a new artifact type means one new `*Preview.svelte`, not touching the host — the host picks the renderer.
- **Secure inbound images.** Inbound images go through `SecureImagePreview` / `VerifiedImage` rather than a raw `<img src>`; that verification is part of the security posture — don't shortcut it.
- **Viewer state via context.** `ArtifactViewerProvider` sets it once; descendants read it — no prop-drilling through the card tree.

Structure and the do-nots are in `CODE.md`.
