# Rich content

Renders the rich payload *inside* a transcript block — markdown, code, and command output — and routes each block to the right renderer. This is where **redaction and safe-markdown** live, so it carries real security weight.

## What lives here

- **`rich-content-router.svelte`** — the entry point: inspects a block and picks the renderer. Exports pure guards used by transcript projection **and security tests**.
- **`rich-block-frame.svelte`** — the shared frame around a rich block.
- **`safe-markdown.svelte`** — markdown rendering with the safety constraints (no arbitrary HTML/script). Security-relevant.
- **`redaction-badge.svelte`** — marks redacted content. Redaction is a frozen security invariant.
- **`CodeCard` / `CommandOutputCard` / `TextArtifactCard`** — the concrete rich renderers.
- **Logic:** `normalize-transcript-blocks.ts`, `f6-viewer-adapter.ts`, `highlight.worker.ts` (syntax highlighting, off-main-thread), `use-copy-feedback.svelte.ts` + `use-highlighted-code.svelte.ts` (runes lifecycles).

## Why it's shaped this way

- **One router, provable guards.** The router's block-type guards are pure and exported so tests (including security tests) can assert them directly — the routing decision is verifiable, not buried.
- **Markdown is rendered safely, always.** `SafeMarkdown` is the only sanctioned markdown path; don't render agent text through anything that allows raw HTML.
- **Highlighting is off-thread.** `highlight.worker.ts` keeps syntax highlighting from blocking scroll.

Structure and do-nots are in `CODE.md`.
