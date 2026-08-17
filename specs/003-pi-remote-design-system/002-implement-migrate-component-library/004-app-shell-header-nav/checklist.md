# Checklist — App shell, header & navigation

- [ ] The shell, headers, and routed surfaces declare `@ds surface:`, `@ds slot:`, `@ds edit: layout`,
      and per-state `@ds state:` blocks reading from tokens only.
- [ ] Every connection phase (`unenrolled` … `error`) renders identically to today in both themes.
- [ ] `Home` (loading / empty / error / stale-cache), `Review` (empty / pending / expired /
      submitted / error), `AttentionInbox` (empty / error), and `Enrollment` (idle / busy / error)
      render identically to today.
- [ ] Routing, connection, enrollment, and push logic are unchanged and fenced with `@ds guardrail`.
- [ ] Safe areas and page gutters are expressed with tokens and logical properties.
- [ ] No source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
