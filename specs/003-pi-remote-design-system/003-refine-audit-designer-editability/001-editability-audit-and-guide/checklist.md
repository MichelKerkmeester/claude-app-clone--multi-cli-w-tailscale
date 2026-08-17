# Checklist — Refine & audit for designer-editability

- [ ] The representative designer edit-task set is defined and each task is bound to a real migrated
      surface.
- [ ] Each edit task is documented with a before/after and a pass on "a low-code designer could do
      this safely through the seams alone."
- [ ] The guardrail audit confirms no in-seam edit can reach state computation, the mutation/ticket
      path, redaction, or plan-mode enforcement.
- [ ] Every gap found by the audit is fixed and the failed task re-run to a pass.
- [ ] The a11y/contrast checks pass in both themes over the token layer.
- [ ] A designer guide covers token, slot, layout, and per-state edits and the guardrails.
- [ ] No source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light captures show every refined surface visually identical to its Phase-2
      baseline with zero page horizontal overflow.
- [ ] The true-390px dark captures show every refined surface visually identical to its Phase-2
      baseline with zero page horizontal overflow.
