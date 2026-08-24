# Checklist — Model & effort sheet

- [x] The model + effort sheet reads its colours from the semantic and `--model-sheet-*` component
      tokens; no raw source value is hard-coded in its rules. — the `--model-sheet-*` set was rewired
      from raw hex to semantic-role `var()` per theme (light/dark/system-dark blocks); no literal
      remains in the sheet's token definitions or rules.
- [x] The sheet declares `@ds surface: model-effort-sheet`, its slots, its layout seam, and one
      `@ds state:` block per visual state. — `@ds surface: model-effort-sheet` (+ `@ds end surface:`);
      `@ds slot:` drag-handle / header / status-lines / search / model-list / effort-group / footer;
      `@ds edit: layout` on the stacking, drag-offset, and safe-area rules; `@ds edit: tokens` on all
      three theme token blocks; `@ds state:` model-open / effort-open / committing / terminal-blocked
      / pending-effort / dragging / snapping / search-shown / effort-confirmed / effort-requested /
      group-aria-busy / read-only·disabled.
- [x] The runtime/mutation wiring carries `@ds guardrail: do-not-edit` and is unchanged. — both
      `.tsx` files are comments-only (`ModelEffortSheet.tsx` 28/0, `EffortRadioGroup.tsx` 11/0); the
      commit path / ticket / revision check / host reconcile and the react-aria wiring are fenced and
      byte-identical.
- [x] The `--model-sheet-*` set is documented in the token reference as the component-token example. —
      `tokens.md` documents each token's resolved-to semantic role, the per-theme `ui-accent`
      divergence (light `--accent-strong` / dark `--accent-ink`), and the primitive → semantic →
      component chain.
- [x] Every state (model/effort open, committing, terminal-blocked, pending-effort, dragging,
      snapping, search-shown, effort confirmed/requested, read-only/disabled) is visually identical
      to its pre-migration baseline in light and dark. — token resolver CHANGED 0 / MISSING 0; rule
      resolver CHANGED 0 / VANISHED 0 / ADDED 0 across light/dark/system; `.tsx` comments-only.
- [x] No model/effort commit path, ticket, revision check, host reconcile, redaction, or plan-mode
      logic is touched; no new dependency is added. — annotation + token-alias rewire only; no
      handler/prop/state change; no dependency added.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. `ModelEffortSheet.test.tsx`
      and `effort-sheet-a11y.test.tsx` — the a11y test's source-form regex was updated from the
      literal hex to the now-real `var()` form; every behavioural / reflow / 44px / non-colour
      assertion is unchanged).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible: `.tsx`
      comments-only; the token + rule resolvers show every resolved declaration byte-identical; the
      reflow test asserts 320px/200%-zoom containment and ≥44px rows unchanged.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
