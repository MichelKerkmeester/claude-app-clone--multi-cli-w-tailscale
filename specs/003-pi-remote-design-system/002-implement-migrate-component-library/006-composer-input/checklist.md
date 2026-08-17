# Checklist — Composer input

- [ ] `SessionComposer` declares `@ds surface:`, `@ds slot:` (tray, tools trigger, input, primary
      action), `@ds edit: layout`, and one `@ds state:` block per button form and composer status,
      reading from tokens only.
- [ ] The single circular primary button renders identically across send / steer / stop / sending in
      both themes.
- [ ] Composer status `idle` / `running` / `interrupted` / `unknown`, plus `awaitingSnapshot`,
      `sendingPrompt`, `stopping`, `promptError`, and `slashSubmitting`, render identically to today.
- [ ] The keyboard-safe anchoring drives layout unchanged; `--visual-viewport-height` and
      `--trigger-width` remain the layout inputs, fenced with `@ds guardrail`.
- [ ] Send / steer / stop, snapshot, and prompt-submission logic are unchanged; the mutation path
      stays behind its one-use ticketed boundary.
- [ ] No source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
