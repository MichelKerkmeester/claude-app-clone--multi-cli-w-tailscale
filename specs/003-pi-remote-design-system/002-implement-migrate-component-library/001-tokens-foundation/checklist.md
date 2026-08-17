# Checklist — Token library foundation

- [ ] `src/style.css` carries three labelled token layers — primitive (source), semantic (roles),
      and component (per-component) — each fenced with the `@ds` grammar.
- [ ] Every frozen source value (light and dark palettes, Inter + Source Serif 4) appears verbatim
      in the primitive layer and is unchanged.
- [ ] Semantic tokens resolve to the same light and dark values as before; no rendered pixel changes.
- [ ] The primitive source layer carries a `@ds guardrail: do-not-edit — frozen source` comment.
- [ ] The component-token convention is documented and applied to the existing `--model-sheet-*` and
      `--slash-*` sets.
- [ ] A token reference documents every token, its layer, its resolved light/dark value, and the
      effect of editing it.
- [ ] No logic, transport, redaction, ticket, plan-mode, or host-file path is touched; no new
      dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The contrast test (`tests/contrast.test.tsx`) stays green.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal
      overflow, and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
