# `rich-content/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`rich-content-router.svelte`** — routes a `DisplayTranscriptBlock` to a renderer; its block-type guards are **pure, exported** functions (consumed by transcript projection + security tests).
- **`rich-block-frame.svelte`** — shared wrapper.
- **Renderers** — `safe-markdown.svelte`, `card-code.svelte`, `card-command-output.svelte`, `card-text-artifact.svelte`, `redaction-badge.svelte`.
- **Logic** — `normalize-transcript-blocks.ts` (pure), `f6-viewer-adapter.ts`, `highlight.worker.ts` (Web Worker), `use-copy-feedback.svelte.ts` + `use-highlighted-code.svelte.ts` (runes lifecycles, driven in tests via DOM-projection probe harnesses).

## Do-not (security-weighted)

- **Never render agent text through anything but `SafeMarkdown`.** No raw-HTML markdown path — that's an injection surface.
- **Don't weaken redaction.** `RedactionBadge` + the redaction handling reflect a frozen security invariant.
- **Keep the router's guards pure and exported** — security tests import them; inlining the logic into the component breaks that contract.
- **`highlight.worker.ts` is a worker** — import it via `new URL(..., import.meta.url)`; don't move highlighting onto the main thread.
- Reactivity gotcha applies to the two `*.svelte.ts` lifecycles — `untrack` any self-reading dispatch.
