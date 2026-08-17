<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 1 — Token library foundation

## Summary

This grandchild stands up the dedicated token library — the primitive → semantic → component
layers — as the single source of truth for colour, type, spacing, radius, and motion, with the
frozen ink-on-parchment palette as the primitive source. It is a pure refactor of the existing
`src/style.css` token blocks into a documented, layered, designer-editable structure. It changes
no rendered pixel: it reorganizes and comments the tokens the app already reads.

## Problem & Goal

The app's tokens exist but are flat: light values live on `:root`, dark values on
`:root[data-theme='dark']` and the `@media (prefers-color-scheme: dark) :root[data-theme='system']`
block, and per-component sets (`--model-sheet-*`, `--slash-*`) are ad hoc. There is no declared
primitive/semantic/component boundary, so a designer cannot tell which token is raw, which is a
role, and which retints one component. The goal is a three-layer token library, labelled with the
inline-comment grammar, that a designer can edit safely — retint the whole system, one role, or
one component — with the frozen values as the immutable primitive source.

## Scope

### In scope

- A **primitive layer**: the raw ink-on-parchment palette and raw scales as the source values,
  in one comment-fenced block, marked as the rarely-edited source.
- A **semantic layer**: the role tokens the app reads (`--surface`, `--surface-raised`, `--ink`,
  `--ink-muted`, `--accent`, `--accent-strong`, `--accent-ink`, `--accent-soft`, `--line`,
  `--danger`, `--success`, `--focus`, plus spacing/radius/motion roles) mapped onto primitives.
- A **component layer** convention: the existing `--model-sheet-*` / `--slash-*` pattern
  generalized to a documented per-component token convention.
- The `@ds` inline-comment grammar applied to every token block (`@ds edit: tokens`, layer labels,
  and a `@ds guardrail` on the primitive source).
- A token inventory/reference documenting every token, its layer, and what editing it changes.

### Out of scope

- Any change to a source value: the frozen light and dark palettes and Inter + Source Serif 4 are
  reproduced verbatim as primitives, never altered.
- Migrating any component's rules onto the semantic tokens beyond what is already wired — later
  per-surface grandchildren do that. This grandchild only establishes and documents the layers.
- The light/dark theming mechanism itself and contrast guarantees — grandchild `002` owns those.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

None. This is an internal token refactor. The rendered app is pixel-identical before and after:
every surface reads the same resolved values in light and dark. The only observable change is to
the authoring surface (the stylesheet's token section) and the token reference doc.

## Acceptance criteria

- `src/style.css` carries three clearly labelled token layers — primitive (source), semantic
  (roles), and component (per-component) — each fenced with the `@ds` grammar.
- Every frozen source value (light: bone `#f8f8f6`, raised `#ffffff`, carbon `#24221f`, muted
  `#6c6a65`, clay `#d97757`, AA text accent `#8a452f`, AA UI accent `#b85f42`, soft selection
  `#f3e4de`; dark: page `#24221f`, raised `#2d2a26`, text `#f8f8f6`, muted `#9f998f`, clay
  `#d97757`, accent text `#f0b19a`, soft selection `#3a2720`) appears verbatim in the primitive
  layer and is unchanged.
- Semantic tokens resolve to the same values they resolve to today in light and dark; no rendered
  pixel changes.
- A token reference documents every token, its layer, and the effect of editing it.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark baseline capture is byte-for-byte visually unchanged from the pre-migration baseline.

## Security & Redaction

Styling-only. This grandchild touches no logic, transport, redaction, ticket, plan-mode, or
host-file path. The primitive source layer carries a `@ds guardrail` comment noting the values are
the frozen contract and must not be changed. No new dependency is added.

## Dependencies & affected areas

- Token source: `apps/pi-remote-web/src/style.css` (the `@theme` block and the `:root`,
  `:root[data-theme='dark']`, and `@media (prefers-color-scheme: dark) :root[data-theme='system']`
  token blocks, plus the component-scoped `--model-sheet-*` / `--slash-*` sets).
- Theme bootstrap (read-only reference, not changed here): `apps/pi-remote-web/index.html`
  (`data-theme`) and `apps/pi-remote-web/src/App.tsx` (theme application).
- Contrast reference (verified, not changed here): `apps/pi-remote-web/tests/contrast.test.tsx`.
- New: a token reference doc under the app (e.g. `apps/pi-remote-web/src/design-system/tokens.md`
  or the catalog surface) — exact location fixed by the Phase 1 decision.
- Baseline evidence: `scripts/design-system-cdp.mjs` with the app's default surface fixture.
