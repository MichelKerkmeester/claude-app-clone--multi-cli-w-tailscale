<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 15 — Live catalog & designer docs

## Summary

This grandchild stands up the live preview/catalog surface — the one net-new surface in Phase 2 —
that enumerates every migrated component from the `@ds` grammar and renders it in each of its states,
in both themes, alongside the designer documentation. It ships last, after every other grandchild
has migrated its surface and declared its `@ds surface:` and `@ds state:` seams, so the catalog is a
faithful index of the whole system. It is read-only demo scaffolding over the real components; it
adds no mutation and no security-boundary change.

## Problem & Goal

The app has no component catalog or storybook today — the only docs are `src/README.md`,
`tests/README.md`, `public/README.md`, and the app `README.md`. A designer editing the system has
nowhere to see every component in every state, compare light and dark, or find the token reference
and the designer guide. The goal is a live catalog that enumerates the `@ds surface:` entries and
their `@ds state:` blocks and renders each migrated component in each state in both themes, plus the
designer documentation surface that links the token reference (grandchild 1) and the designer guide
(Phase 3) — so the system is browsable and self-documenting.

## Scope

### In scope

- A live preview/catalog surface that enumerates every `@ds surface:` and its `@ds state:` blocks and
  renders each migrated component in each state, in light and dark, over the real components.
- A catalog index (all components), a per-component preview (each variant/state), and a per-state
  preview, all reading the token library so the catalog restyles with the tokens.
- The designer documentation surface linking the token reference (from grandchild 1) and the designer
  guide (from Phase 3), plus a short "how to read the `@ds` grammar" primer.
- Registration hooks the other grandchildren use to add themselves to the catalog.

### Out of scope

- Any change to the components being catalogued — the catalog renders them read-only; it does not
  restyle or refactor them.
- Any mutation, host action, network call, or authenticated surface — the catalog is offline,
  read-only demo scaffolding over already-redacted fixture content, in the spirit of `demo.ts`.
- Any change to the frozen source values or the read-only-by-default security posture.
- The choice of catalog delivery (a route in the app vs. a standalone Vite entry vs. a static page)
  is deferred to the Phase 1 architecture decision; this leaf builds whichever that decision fixes.

## User-facing behavior + states

A new, internal catalog surface — reachable only as design-system tooling, not part of the operator
chat flow — that renders every component in every state in both themes. Its own states: the catalog
index; a per-component preview (light + dark); a per-state preview; and an empty/"not yet migrated"
state for any surface that has not registered. The operator-facing app is otherwise unchanged.

## Acceptance criteria

- The catalog enumerates every `@ds surface:` and its `@ds state:` blocks and renders each migrated
  component in each state, in light and dark, over the real components.
- The designer documentation links the token reference and the designer guide and includes a
  `@ds`-grammar primer.
- The catalog reads the token library so it restyles when tokens change, and is offline, read-only,
  and free of any mutation, host action, or authenticated call.
- Every other migrated grandchild is registered in the catalog (or shown in the "not yet migrated"
  state if pending).
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the catalog renders
  at true-390px in light and dark with zero page horizontal overflow. Any dependency the catalog
  needs is justified against the Phase 1 decision, or none is added.

## Security & Redaction

Read-only demo scaffolding. The catalog renders components over deterministic, already-redacted
fixture content (the `demo.ts` approach) and performs no mutation, host action, network call,
ticket, or authenticated request. It exposes no operator data and adds no route into the secured
runtime. Any dependency it requires is scoped, justified against the Phase 1 decision, and must not
weaken the read-only-by-default posture.

## Dependencies & affected areas

- Inbound (registered here): every other Phase 2 grandchild's `@ds surface:` declaration.
- Token reference (linked): `apps/pi-remote-web/src/design-system/tokens.md` (from grandchild 1).
- Designer guide (linked): `apps/pi-remote-web/src/design-system/designer-guide.md` (from Phase 3).
- Fixture approach (reference): `apps/pi-remote-web/src/demo.ts` (deterministic offline fixtures).
- New: the catalog surface and its docs under `apps/pi-remote-web/src/design-system/` (exact
  delivery — app route, standalone Vite entry, or static page — fixed by the Phase 1 decision).
- Baseline evidence: `scripts/design-system-cdp.mjs` capturing the catalog index and a per-component
  preview.
