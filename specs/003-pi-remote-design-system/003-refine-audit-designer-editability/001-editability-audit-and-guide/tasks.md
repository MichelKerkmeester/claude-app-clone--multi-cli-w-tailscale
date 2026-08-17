# Tasks — Refine & audit for designer-editability

- [ ] Define the representative designer edit-task set (retint a role token; retint one component;
      change a card radius; relabel a `@ds state:` block; reorder a `@ds slot:`; change a
      `@ds edit: layout` block) and bind each to a real migrated surface.
- [ ] Run each edit task through the seams alone; record before/after captures and a pass/fail on
      "could a low-code designer do this safely without touching logic?"
- [ ] Run the guardrail audit: from within the seams, attempt to reach state computation, the
      mutation/ticket path, redaction, and plan-mode enforcement; confirm each is fenced off.
- [ ] Refine the gaps found — add/relabel seams, tighten leaky guardrails, clarify "edit here"
      comments, correct mislabelled state blocks — changing no resolved value.
- [ ] Re-run every failed edit task and the guardrail audit until all pass.
- [ ] Repeat the a11y/contrast pass over the token layer in both themes.
- [ ] Write `apps/pi-remote-web/src/design-system/designer-guide.md` covering the four edit classes,
      the seams, worked examples, and the guardrails.
- [ ] Capture true-390px before/after evidence proving each refined surface is visually identical to
      its Phase-2 baseline, and record results in `checklist.md`.
