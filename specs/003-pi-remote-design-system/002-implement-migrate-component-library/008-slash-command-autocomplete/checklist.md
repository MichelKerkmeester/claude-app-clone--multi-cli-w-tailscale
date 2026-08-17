# Checklist — Slash command autocomplete

- [ ] The autocomplete card and palette read their colours from the semantic and `--slash-*`
      component tokens; no raw source value is hard-coded in their rules.
- [ ] The surface declares `@ds surface: slash-autocomplete`, its slots, its layout seam, and one
      `@ds state:` block per `SlashPanelOpenState` and per option-row state.
- [ ] The ranker, catalog lifecycle, trigger predicate, and fail-closed submission carry
      `@ds guardrail: do-not-edit` and are unchanged; unsafe-character escaping is preserved.
- [ ] The `--slash-*` set is documented in the token reference as a component-token example.
- [ ] Every panel and option-row state renders identically to its pre-migration baseline in light
      and dark, including the escaped unsafe-character rendering.
- [ ] No catalog authority, ranking, or submission path is touched; no new dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
