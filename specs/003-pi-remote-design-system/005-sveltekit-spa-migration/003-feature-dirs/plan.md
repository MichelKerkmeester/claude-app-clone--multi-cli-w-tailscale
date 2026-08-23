---
title: "Child 003 plan — feature directories"
description: "How four self-contained feature areas were ported in parallel, why CSS decomposition was folded into each dispatch rather than run as its own phase, and what the scope audit had to catch."
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

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 plan — feature directories

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Four feature areas that were already well decomposed in React — rich content, artifacts, attachments
and ask-question — port in parallel, one dispatch per directory, because they share no files.

The novel work is not the runes conversion. It is that **each dispatch also moves its surface's CSS**
out of the 7,932-line stylesheet and into the component's scoped `<style>`. That folding is the
child's defining decision and its largest risk.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| Each of the four directories renders in the catalog, light and dark | pass, no throw |
| `svelte-check` | clean |
| token-identity on the four touched surfaces | 0 diffs |
| Scope audit on every moved CSS block | complete |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Why CSS decomposition is folded in rather than run as its own phase.** A component and its styles
are the same unit of understanding — that is the entire point of the migration. Moving all the CSS in
one later sweep would mean auditing thousands of selectors with no component context to check them
against; moving each block with its component means the person doing it can see what the selector is
supposed to reach.

**The scoping hazard this creates.** Svelte hashes only selectors that match a local element. A moved
rule that styles something a *child component* renders silently stops applying — nothing errors,
nothing warns, the style just vanishes. That is why every moved block is scanned for cross-boundary
reach: child-rendered elements, `[data-theme]` / `[aria-*]` / `[dir]` context selectors, and shared
`@keyframes`. Those get `:global(...)`; 73 such wraps exist across the three chat feature directories
today.

**Context and hooks.** React Context becomes a `setContext` / `getContext` runes store; hooks become
`*.svelte.ts` factories following the pattern 002 established. `ask-question` shows the shape most
clearly, with three factories — state, mutation and keyboard navigation — beside seven components.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Four parallel dispatches — Done

`rich-content/` (21 files), `artifacts/` (46), `attachments/` (13) and `features/ask-question/` (21).
One dispatch per directory, disjoint by construction.

### Phase 2: Per-directory scope audit — Done

Every moved CSS block scanned for cross-boundary selectors before its dispatch is accepted.

### Phase 3: Barrier — Done

Catalog render in both themes, `svelte-check` clean, and an independent token-identity check on the
four touched surfaces.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Rendering is checked in the catalog rather than by unit test, because at this layer the question is
"does this surface still draw", and a story answers that in both themes at once.

Value preservation is checked by the token-identity resolver rather than by screenshot. Screenshots
are not usable here: under CSP the app renders unstyled headless, so a visual diff would compare two
broken pages. The resolver reads the CSS and resolves every custom property, which is both stricter
and immune to that failure.

What this strategy cannot see is a `:global()` that reaches too far. A leak styles something it should
not, and both the catalog and the resolver stay green. The only defence is the per-block audit, which
is why it is a gate rather than a guideline.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 002 for the primitives every component composes and for both already-ported workers.
- 001 for the scaffold and `app.css`.
- Nothing between the four directories — that independence is what makes them parallel.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Still additive: the React app is the shipping runtime at this layer, so these directories are not yet
reachable by users. Reverting a directory removes it without affecting the other three, since they
share no files — the same property that made them parallel makes them independently revertible.
<!-- /ANCHOR:rollback -->
