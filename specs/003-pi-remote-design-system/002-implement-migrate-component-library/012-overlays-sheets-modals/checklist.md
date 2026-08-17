# Checklist — Overlay, sheet & modal primitives

- [ ] One shared `@ds surface: overlay` primitive exists in `src/style.css` with `@ds slot:` seams
      and `@ds state:` blocks for `opening`, `open`, `exiting`, `dragging`, and `snapping`.
- [ ] The primitive reads semantic + component tokens only; no frozen source value is changed and no
      raw colour is hard-coded outside the primitive token layer.
- [ ] Swipe-to-dismiss, drag offset, history integration, focus capture/restore, safe-area,
      scroll-lock, and the `data-exiting` transition are tokenized and comment-fenced.
- [ ] The dismissal-authority and focus-trap logic sit behind a `@ds guardrail: do-not-edit`.
- [ ] Every consuming overlay renders and dismisses identically to its pre-migration behaviour in
      both themes; `LeavePlanSheet` keeps its exact safe-action focus and confirmation.
- [ ] react-aria still owns behaviour and state; no dismissal-security semantic is changed.
- [ ] The overlay primitive and its five states are registered in the catalog.
- [ ] No new dependency is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
