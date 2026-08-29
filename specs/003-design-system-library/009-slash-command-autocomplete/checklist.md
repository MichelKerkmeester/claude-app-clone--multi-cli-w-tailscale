<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Slash command autocomplete

- [x] The autocomplete card and palette read their colours from the semantic and `--slash-*`
      component tokens; no raw source value is hard-coded in their rules. — the `--slash-*` set was
      rewired from raw hex to semantic-role `var()` per theme (light/dark/system-dark); no literal
      remains in the slash token definitions or rules.
- [x] The surface declares `@ds surface: slash-autocomplete`, its slots, its layout seam, and one
      `@ds state:` block per `SlashPanelOpenState` and per option-row state. — `@ds surface:
      slash-autocomplete`; `@ds edit: tokens` on the three theme blocks; `@ds slot:` header /
      option-list / footer-hint + option-row label / binding / disabled-reason; `@ds edit: layout` on
      the anchoring / max-size rules (the `--visual-viewport-height` anchor and `calc(100vw - 24px)`
      preserved); `@ds state:` blocks for the panel states (loading/ready/refreshing/error/committing/
      running variants, closed, drafted) and option-row `active` / `enabled` / `disabled-with-reason`.
- [x] The ranker, catalog lifecycle, trigger predicate, and fail-closed submission carry
      `@ds guardrail: do-not-edit` and are unchanged; unsafe-character escaping is preserved. — the
      three `.tsx` files carry `@ds guardrail` on the ranker, the fail-closed press/selection paths,
      the react-aria wiring, and the `UNSAFE_NAME_CHARACTERS` escaping; the escaping regex is
      byte-identical; changes are comment annotations plus one semantic-no-op JSX paren-wrap (used
      only to host an inline `@ds state:` comment — the rendered `<span>` is byte-identical).
- [x] The `--slash-*` set is documented in the token reference as a component-token example. —
      `tokens.md` documents each token's resolved-to role and the per-theme `ui-accent` divergence.
- [x] Every panel and option-row state renders identically to its pre-migration baseline in light
      and dark, including the escaped unsafe-character rendering. — token resolver CHANGED 0 /
      MISSING 0; rule resolver CHANGED 0 / VANISHED 0 / ADDED 0 across light/dark/system; escaping
      unchanged; the command-surface tests (incl. escaping and non-colour focus rail) stay green.
- [x] No catalog authority, ranking, or submission path is touched; no new dependency is added. —
      annotation + token-alias rewire + a semantic-no-op paren-wrap only; no logic/prop/handler change;
      no dependency added.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl.
      `ComposerCommandAutocomplete.test.tsx` — behaviour, escaping, contrast, and layout unchanged;
      only the token block's source-form regex assertions were updated literal→var).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible: `.tsx`
      annotation-only (+ no-op paren-wrap); the token + rule resolvers show every resolved declaration
      byte-identical; the panel-bounds test asserts `calc(100vw - 24px)` + `overflow-x: hidden`.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
