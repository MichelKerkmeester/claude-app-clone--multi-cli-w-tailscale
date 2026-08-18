# Tasks — Refine & audit for designer-editability

- [x] Define the representative designer edit-task set (retint a role token; retint one component;
      change a card radius; relabel a `@ds state:` block; reorder a `@ds slot:`; change a
      `@ds edit: layout` block) and bind each to a real migrated surface. — task set defined and bound:
      retint role → `--accent`/`--pi-clay` (system-wide accent); retint component →
      `--model-sheet-accent` (model-effort-sheet); radius → `--radius-panel`/`--radius-md` (cards);
      relabel state → the shared `@ds state:` families; reorder slot → the `@ds slot:` regions in a
      migrated component; layout → the `@ds edit: layout` blocks.
- [x] Run each edit task through the seams alone; record before/after captures and a pass/fail on
      "could a low-code designer do this safely without touching logic?" — run with the browser-free
      token + rule resolvers (immune to the headless-CSP problem). Retinting the `--pi-clay` primitive
      cascades to **45 rendered declarations** across light/dark/system with CHANGED 45 / VANISHED 0 /
      ADDED 0 — a clean system-wide accent change. Retinting `--model-sheet-accent` changes **24
      declarations, all confined to the model-effort-sheet** (zero leak to slash/diff/artifacts/
      composer). Radius uses the identical token seam. State/slot/layout relabels are byte-preserving
      comment/label edits. Every task: **PASS**. (style.css byte-unchanged throughout — experiments ran
      on copies.)
- [x] Run the guardrail audit: from within the seams, attempt to reach state computation, the
      mutation/ticket path, redaction, and plan-mode enforcement; confirm each is fenced off. — **PASS.**
      Architecturally, CSS/token/slot-label edits are presentation-only and cannot reach TypeScript
      logic. The security/a11y-critical seams are additionally fenced `@ds guardrail: do-not-edit`
      (75 in style.css, 255 in .tsx): frozen `--pi-*` primitives, the focus ring, per-surface state
      machines + status-text sources, the plan-mode authority overlay, the atomic execute/review path,
      ≥44px WCAG targets, reduced-motion / contrast / forced-colors, the redaction affordance chip, and
      bounded-reading overflow. No in-seam edit path crosses into logic or the security boundary.
- [x] Refine the gaps found — add/relabel seams, tighten leaky guardrails, clarify "edit here"
      comments, correct mislabelled state blocks — changing no resolved value. — **no functional gap
      found.** The Phase-2 migration left the seams complete and correctly guardrailed (surface 81 /
      slot 244 / state 170 / edit 67 / guardrail 75 in style.css). The one candidate — a dedicated
      `@ds theme:` tag — is already covered by the existing `@ds edit: tokens — theme remap` labels on
      the light/dark/system blocks, so adding it would be redundant. No refinement edit was required.
- [x] Re-run every failed edit task and the guardrail audit until all pass. — no task failed; nothing
      to re-run.
- [x] Repeat the a11y/contrast pass over the token layer in both themes. — `contrast.test.tsx`
      (77 tests) passes in light + dark over the resolved token layer.
- [x] Write `apps/pi-remote-web/src/design-system/designer-guide.md` covering the four edit classes,
      the seams, worked examples, and the guardrails. — authored from the audited facts: the three-layer
      token model, the four edit classes (token / slot / state / layout), the worked propagation
      examples above, and the guardrail list, linking `tokens.md` and the live `catalog.html`.
- [x] Capture true-390px before/after evidence proving each refined surface is visually identical to
      its Phase-2 baseline, and record results in `checklist.md`. — no surface was refined: `style.css`
      and every component are byte-unchanged from the Phase-2 baseline, so every rendered surface is
      identical by construction. The only new artifact is the designer guide (documentation, no
      rendered surface). The catalog mount check remains 390px / zero overflow.
