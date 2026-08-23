---
title: "Child 003 implementation summary — feature directories"
description: "What the four parallel feature ports delivered, why folding CSS decomposition into each dispatch was the right call, and the failure mode neither gate can see."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/003-feature-dirs"
    last_updated_at: "2026-08-23T10:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-003; REQ-004 superseded by the 007 census |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

Four feature areas, ported in parallel because they share no files: `rich-content/` (21 files),
`artifacts/` (46 — the largest), `attachments/` (13) and `features/ask-question/` (21).

Each dispatch did two jobs at once. It converted React Context to `setContext` / `getContext` runes
stores and hooks to `*.svelte.ts` factories — `ask-question` shows the shape most clearly, with three
factories for state, mutation and keyboard navigation sitting beside its seven components. And it
moved that surface's CSS out of the 7,932-line stylesheet into the component's own scoped `<style>`,
values preserved byte-for-byte, with 73 `:global(...)` wraps where a rule genuinely has to reach past
the component boundary.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Four parallel executor dispatches, one per directory, with Claude verifying each independently before
the barrier. Disjointness was the safety property that permitted the concurrency, not merely an
optimisation — parallel dispatches on one worktree are only safe when no two can touch the same file.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**CSS decomposition folded into each component dispatch, not run as its own phase.** A component and
its styles are the same unit of understanding — that is the whole point of the migration. Deferring
the CSS to one later sweep would have meant auditing thousands of selectors with no component context
to check them against. Moving each block alongside its component means whoever moves it can see what
the selector is supposed to reach.

**Value preservation verified by CSS resolution, never by screenshot.** Under the app's CSP a headless
render comes out unstyled, so a visual diff would be comparing two broken pages. The token-identity
resolver reads the stylesheet and resolves every custom property instead — stricter, and immune to
that failure mode.

**`:global()` used deliberately and audited, not sprinkled.** Svelte hashes only selectors that match
a local element, so a moved rule targeting a child-rendered element silently stops applying. Nothing
errors and nothing warns. Every moved block was therefore scanned against a fixed checklist —
child-rendered elements, `[data-theme]` / `[aria-*]` / `[dir]` context selectors, shared `@keyframes` —
before its dispatch was accepted.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| Catalog render, all four directories, light and dark | pass, no throw |
| `svelte-check` | clean |
| token-identity on the touched surfaces | 0 diffs |
| Scope audit per moved block | complete |
| `:global(...)` wraps across the chat feature directories | 73 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**Neither gate can see an over-reaching `:global()`.** A wrap that is too broad styles something it
should not, and the catalog still renders while the resolver still reports zero diffs. The failure is
real and both instruments are blind to it. The per-block audit is the only defence, which is why it
was made a gate rather than left as a practice — but an audit is a human check, and it carries human
error in a way the resolver does not.

**REQ-004 was wrong as written and is superseded.** It asked for the `@ds surface:` marker to collapse
to once-per-file. The 007 census showed that erases genuinely distinct surfaces in multi-surface files
— `RuntimeStrip` alone holds three. The rule became once-per-*surface*-per-file, and `artifacts/`
carries 37 markers under it.

**Design-preserving was verified at the value level, not the perceptual level.** REQ-002 says rendered
output is visually identical. What was actually proven is that no resolved token value changed and
every surface still draws. Those are strong proxies and they are not the same claim.
<!-- /ANCHOR:limitations -->
