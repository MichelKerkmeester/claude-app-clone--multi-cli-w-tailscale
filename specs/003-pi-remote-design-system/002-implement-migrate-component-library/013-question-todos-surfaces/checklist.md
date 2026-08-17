# Checklist — Plan/todo & ask-question surfaces

- [ ] The `plan`-kind block's todo checklist reads semantic + component tokens and is `@ds surface:`
      labelled, with `@ds state:` blocks for done (✓) and pending (○) items.
- [ ] The checklist renders identically to before in both themes; the ✓/○ presentation is unchanged.
- [ ] Plan-item computation, delivery, and plan-mode gating are untouched and fenced by a
      `@ds guardrail`.
- [ ] A documented `@ds surface:` seam contract exists for the future ask-question prompt UI and the
      future todos list, each marked pending and gated on the sibling `002` features.
- [ ] No visible ask-question or todos surface is added, and no mutation is introduced.
- [ ] The catalog registers the migrated plan/todo checklist and lists the two future surfaces as
      declared-but-pending.
- [ ] No frozen source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture of the plan/todo block reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture of the plan/todo block reports exactly 390 CSS pixels, has zero page
      horizontal overflow, and is visually identical to the pre-migration baseline.
