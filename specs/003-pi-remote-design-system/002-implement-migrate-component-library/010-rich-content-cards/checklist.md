# Checklist — Rich content cards

- [ ] Feature `006-rich-content-blocks` is merged into `main` and its merge commit is recorded as the
      as-merged baseline before this grandchild starts.
- [ ] The command/output, code, and text-artifact cards read their colours from the semantic and
      component tokens; no raw source value is hard-coded in their rules.
- [ ] Each card declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block per
      lifecycle and copy state.
- [ ] The safe-Markdown renderer, clipboard boundary, and no-fetch/no-ticket wiring carry
      `@ds guardrail: do-not-edit` and are unchanged.
- [ ] The cards render identically to their as-merged baseline in light and dark across every state.
- [ ] No mutation, host-file read, artifact endpoint, download, or file share is added; the exact-copy
      clipboard behaviour is preserved; no new dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the as-merged baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the as-merged baseline.
