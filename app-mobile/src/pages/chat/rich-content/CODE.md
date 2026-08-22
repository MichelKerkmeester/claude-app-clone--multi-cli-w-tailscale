# `rich-content/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`RichContentRouter.svelte`** — routes a `DisplayTranscriptBlock` to a renderer; its block-type guards are **pure, exported** functions (consumed by transcript projection + security tests).
- **`RichBlockFrame.svelte`** — shared wrapper.
- **Renderers** — `SafeMarkdown.svelte`, `CodeCard.svelte`, `CommandOutputCard.svelte`, `TextArtifactCard.svelte`, `RedactionBadge.svelte`.
- **Logic** — `normalizeTranscriptBlocks.ts` (pure), `F6ViewerAdapter.ts`, `highlight.worker.ts` (Web Worker), `useCopyFeedback.svelte.ts` + `useHighlightedCode.svelte.ts` (runes lifecycles, driven in tests via DOM-projection probe harnesses).

## Do-not (security-weighted)

- **Never render agent text through anything but `SafeMarkdown`.** No raw-HTML markdown path — that's an injection surface.
- **Don't weaken redaction.** `RedactionBadge` + the redaction handling reflect a frozen security invariant.
- **Keep the router's guards pure and exported** — security tests import them; inlining the logic into the component breaks that contract.
- **`highlight.worker.ts` is a worker** — import it via `new URL(..., import.meta.url)`; don't move highlighting onto the main thread.
- Reactivity gotcha applies to the two `*.svelte.ts` lifecycles — `untrack` any self-reading dispatch.
