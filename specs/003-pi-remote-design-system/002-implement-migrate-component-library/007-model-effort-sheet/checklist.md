# Checklist — Model & effort sheet

- [ ] The model + effort sheet reads its colours from the semantic and `--model-sheet-*` component
      tokens; no raw source value is hard-coded in its rules.
- [ ] The sheet declares `@ds surface: model-effort-sheet`, its slots, its layout seam, and one
      `@ds state:` block per visual state.
- [ ] The runtime/mutation wiring carries `@ds guardrail: do-not-edit` and is unchanged.
- [ ] The `--model-sheet-*` set is documented in the token reference as the component-token example.
- [ ] Every state (model/effort open, committing, terminal-blocked, pending-effort, dragging,
      snapping, search-shown, effort confirmed/requested, read-only/disabled) is visually identical
      to its pre-migration baseline in light and dark.
- [ ] No model/effort commit path, ticket, revision check, host reconcile, redaction, or plan-mode
      logic is touched; no new dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
