# Checklist — Control primitives

- [ ] Each shared control primitive declares a `@ds surface:` and one `@ds state:` block per visual
      state (default, hover, pressed, disabled, focus-visible, busy), reading from tokens only.
- [ ] The per-state seam set is canonical and reusable by the surfaces.
- [ ] react-aria keeps ownership of behaviour, focus order, and a11y semantics; only presentation
      moved, fenced with a `@ds guardrail`.
- [ ] StatusPill, Freshness, EmptyState, SessionStateIcon, and the glyphs render identically to today
      in every state and both themes.
- [ ] No raw colour appears outside the primitive layer.
- [ ] No behaviour, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
