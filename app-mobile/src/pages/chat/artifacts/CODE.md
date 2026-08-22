# `artifacts/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`ArtifactViewerProvider.svelte`** — `setContext`s the viewer state; descendants `getContext` it. The provider owns nothing visual.
- **`ArtifactViewerHost.svelte`** — the viewer shell; selects which `*Preview` renders for the artifact's type.
- **`ArtifactCard` / `ArtifactHeader` / `ArtifactDetails` / `ArtifactStatus` / `PreviewControls`** — the frame + chrome around a preview.
- **`*Preview.svelte`** — one renderer per content type (code, diff, markdown, text, pdf, image, unsupported fallback).
- **Image path** — `InboundImageCard` / `InboundImageBlockView` wrap inbound images; `SecureImagePreview` / `VerifiedImage` gate the actual bytes; `ImagePlaceholder` / `ImageStatus` cover loading/error.
- **Logic** — `useArtifactResource.svelte.ts` (resource fetch/lifecycle, runes), `useArtifactHistory.svelte.ts` (navigation history, runes), `artifact-share.ts`, `pdf-preview-shared.ts` (shared PDF glue), `types.ts`.

## Do-not

- **Don't bypass the secure image path.** Inbound images must stay behind `SecureImagePreview` / `VerifiedImage`; a raw `<img>` on untrusted bytes is a security regression.
- **Add a type, don't edit the host.** New artifact type → new `*Preview.svelte` + a branch, not surgery across the card frame.
- **Reactivity gotcha applies** to `useArtifactResource`/`useArtifactHistory` — a runes `$effect` that dispatches into the state it reads self-invalidates; `untrack` the dispatch (see `shared/data/CODE.md`).
- `PdfPage` / `PdfPreview` load `pdfjs-dist`, which is deliberately excluded from Vite pre-bundling — don't add it to `optimizeDeps`.
