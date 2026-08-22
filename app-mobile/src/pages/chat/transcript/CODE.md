# `transcript/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`TranscriptList.svelte`** — owns the `@tanstack/svelte-virtual` virtualizer. The virtualizer is a **store** (not a rune): reactive count is set via `$effect(() => $virtualizer.setOptions({ count, … }))` (setOptions merges, keeping injected observers), and elements measure via `{@attach}` + `data-index`.
- **`Block.svelte`** — per-block layout; hands rich payloads to `../rich-content/RichContentRouter.svelte`.
- **`NormalizedActivityGroup` / `NormalizedTranscriptBlockView`** — normalized-activity grouping + view.
- **`AssistantActions` / `CollapsedEvidence` / `FilePreviewCard` / `RuntimeStatusRegion` / `TodoProjectionBlock`** — the block sub-parts.
- **`transcript-helpers.ts`** — pure helpers.

## Do-not

- **Don't de-virtualize `TranscriptList`.** Full render of a long transcript janks on a phone; keep the windowed render + dynamic measurement.
- **Don't merge the virtualizer store into a rune.** `createVirtualizer` returns a store; re-run `setOptions` in an effect rather than reconstructing it, or you drop the injected measurement observers.
- Block layout stays here; rich payload rendering stays in `rich-content/`. Don't inline markdown/code rendering into `Block`.
