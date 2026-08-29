<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — State vocabulary, interaction & motion

## Approach

Consolidate presentation, not logic. Map the scattered status enumerations onto one `@ds`-labelled
status/badge vocabulary, formalize the motion tokens as the design-system motion scale, and document
the focus-visible and reduced-motion/contrast/forced-colors behaviours as primitives — all
value-preserving. Leave every surface's state machine, status text, and timing untouched; only the
shared presentation moves into one editable place. Prove representative states are unchanged.

## Steps

1. Inventory the status families across `state.ts` (connection phases, file-preview availability),
   `PlanModeButton.tsx` (`ModePresentationKind`), `useArtifactResource.ts` / `ArtifactStatus.tsx`
   (`ArtifactResourceStatus`), and `ComposerCommandAutocomplete.tsx` (`SlashPanelOpenState`);
   collapse them into shared families (idle, loading, stalled, ready, empty, offline, stale, denied,
   expired, missing, error) with their current resolved look.
2. Define one `@ds surface: status` vocabulary in `src/style.css` with `@ds state:` blocks per shared
   family, reading semantic + component tokens; map each surface's badges onto it without changing
   text or logic.
3. Formalize the motion tokens (`--duration-fast`, `--duration-state`, `--ease-out`,
   `--ease-out-interface`) as the design-system motion scale under an `@ds edit: tokens` label, and
   document which surfaces read them.
4. Fence and document the `:focus-visible` treatment and the `prefers-reduced-motion`,
   `prefers-contrast`, and `forced-colors` behaviours as system-wide primitives, unchanged in effect.
5. Add a `@ds guardrail` marking the per-surface state machines and status-text sources as off-limits
   to a designer edit.
6. Register the status vocabulary and the motion/focus/reduced-motion primitives in the catalog.
7. Capture true-390px light/dark evidence of representative status badges and a reduced-motion state,
   and diff against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/style.css` (define the status vocabulary; formalize motion/focus/reduced-
  motion primitives; add `@ds` labels — no value or timing change)
- `apps/pi-remote-web/src/PlanModeButton.tsx`, `artifacts/ArtifactStatus.tsx`,
  `ComposerCommandAutocomplete.tsx` (map badge classes onto the shared vocabulary; no logic/text change)
- the catalog surface (register the vocabulary + primitives) — from grandchild 15
- `scripts/design-system-cdp.mjs` (status + reduced-motion capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface status-vocabulary --viewport-width 390 --theme light --output <temporary-directory>/status-vocabulary-light.png
node scripts/design-system-cdp.mjs --surface status-vocabulary --viewport-width 390 --theme dark --output <temporary-directory>/status-vocabulary-dark.png
```

The gate passes only when all suites and the build pass, every mapped surface renders its status
badges and transitions identically to before (including under reduced-motion, increased-contrast, and
forced-colors), the CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, both
captures are visually identical to the pre-migration baseline in each theme, and no state machine,
status text, transition timing, or frozen source value is changed.
