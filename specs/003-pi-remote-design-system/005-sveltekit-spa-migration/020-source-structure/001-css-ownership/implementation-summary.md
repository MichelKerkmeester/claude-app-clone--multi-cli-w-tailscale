---
title: "Phase A implementation summary — CSS ownership"
description: "What moved and what stayed: 47 single-owner classes relocated into their components, 35 retained as shared a11y guardrails, proven value-identical and gate-green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T08:49:19Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "48 relocated; app.css 3,197->2,895; remainder shared guardrails; gates green."
    next_safe_action: "Proceed to Phase B (comment structure)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

48 of `app.css`'s 82 single-owner classes moved into the scoped `<style>` of the component that uses
them. `app.css` fell from 3,197 to 2,895 lines and now holds tokens, theme remaps, resets, the 44
genuinely shared classes, and the shared accessibility guardrail blocks.

The other 34 single-owner-looking classes stayed in `app.css` on purpose. Measured against the code,
they are woven into shared a11y guardrail rules — `.composer-plus, .composer-primary, … { min-inline-size:
44px }`, `@media (prefers-reduced-motion) { .effort-spinner, .model-sheet-skeleton, … { animation:
none } }`, contrast and forced-colors blocks — that group several components and are asserted there by
`contrast.test.tsx` and `effort-sheet-a11y.svelte.test.ts`. Those are shared design-system rules, not
single-component bloat, and are more auditable kept as a central set.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Executors (cli-codex, gpt-5.6-luna, max, fast) added each missing rule into its component, carrying the
declarations and any `@ds` comment. Claude owned the `app.css` removal, the guardrail-fence carrying,
and every gate.

The removal was gated on context coverage: a class left `app.css` only when its owning component held a
rule for it in every `@media` context `app.css` used — so an app.css-only reduced-motion variant (which
token identity cannot see) was never silently dropped. Four `@ds guardrail: do-not-edit` fences that
moved with their rules — including the privacy-curtain `z-index: 10000` invariant — were carried into
their components by hand so the fence count stayed at 277.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Single-owner by markup is not single-owner by styling.** A class used in one component's markup can
still have its 44px-target or reduced-motion rule grouped with other components' classes in a shared
guardrail block. Those are shared and stay in `app.css`; only classes whose whole rule set is
component-local moved.

**Token identity is necessary but not sufficient.** It resolves values, so it is blind to `@media`
blocks, `animation: none`, selector reach, and comments. The a11y tests, the fence count, and catalog
smoke are what actually protect a11y through a CSS relocation, and each was run.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Token identity | 0 changed / 0 vanished / 0 added across light, dark, system |
| `npm run test:web` | 68 files / 545 passed and 17 files / 189 passed, RC 0 |
| Build | RC 0 |
| Typecheck | 1124 files, 0 errors |
| Catalog smoke | 267 stories × 2 themes = 534 frames, 0 throws |
| Runtime smoke | 4 of 4 surfaces, 0 errors |
| `@ds guardrail` fences | 277, preserved |
| `validate.sh --strict` | exit 0 through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The slim is ~9%, not the ~50% first estimated.** `app.css` is not mostly single-component bloat: ~262
lines are tokens/theme/resets that must be global, 44 classes are genuinely shared, and a large slice
is cross-component a11y guardrails. Moving the remaining guardrail-entangled classes would require splitting
shared guardrail blocks and repointing the a11y tests, scattering rules that are safer audited as a set
— which is why they were retained rather than moved.

**The strip is at its measured ceiling under single-owner-only.** A follow-up pass re-checked every
class still in `app.css`: of the 31 single-owner-by-markup classes that remain, each shares a selector
group with a class owned by a different component (the 44px touch-target block, the reduced-motion
block, the artifact/rich-content shared blocks), so none is cleanly movable. The one exception — the
`.ask-question-option-row` system-theme override, an orphaned sibling of a variant already in the
component — was relocated, completing its three-theme set in one file. Nothing single-owner-and-standalone
is left; stripping further means decomposing shared guardrails and rewriting their a11y oracles.
<!-- /ANCHOR:limitations -->
