# Checklist — State vocabulary, interaction & motion

- [ ] A unified `@ds surface: status` vocabulary exists with `@ds state:` blocks for the shared status
      families, mapped over the existing enums.
- [ ] Each mapped surface renders its status badges identically to before in both themes.
- [ ] The motion tokens are formalized as the design-system motion scale with an `@ds edit: tokens`
      label, and the surfaces that read them are documented.
- [ ] The `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`
      behaviours are fenced and documented as primitives, unchanged in effect.
- [ ] No surface's state machine, status text, or transition timing is changed; the per-surface
      state logic sits behind a `@ds guardrail`.
- [ ] The catalog registers the status vocabulary and the motion/focus/reduced-motion primitives.
- [ ] No frozen source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture of representative states reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture of representative states reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline.
