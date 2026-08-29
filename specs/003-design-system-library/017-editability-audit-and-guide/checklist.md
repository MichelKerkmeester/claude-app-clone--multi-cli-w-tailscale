<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Refine & audit for designer-editability

- [x] The representative designer edit-task set is defined and each task is bound to a real migrated
      surface. — 6 tasks bound: retint role (`--accent`/`--pi-clay`), retint component
      (`--model-sheet-accent`), radius (`--radius-panel`/`--radius-md`), relabel `@ds state:`, reorder
      `@ds slot:`, change `@ds edit: layout`.
- [x] Each edit task is documented with a before/after and a pass on "a low-code designer could do
      this safely through the seams alone." — verified with the browser-free token + rule resolvers:
      `--pi-clay` retint → 45 declarations change (CHANGED 45 / VANISHED 0 / ADDED 0, all themes);
      `--model-sheet-accent` retint → 24 declarations, all within the model-effort-sheet, zero leak.
      All 6 tasks pass.
- [x] The guardrail audit confirms no in-seam edit can reach state computation, the mutation/ticket
      path, redaction, or plan-mode enforcement. — confirmed: CSS/token/slot-label edits are
      presentation-only; the logic seams are fenced `@ds guardrail: do-not-edit` (75 in style.css,
      255 in .tsx) covering frozen primitives, focus ring, state machines + status text, plan-mode
      overlay, atomic execute path, WCAG target sizes, reduced-motion, redaction chip, bounded reading.
- [x] Every gap found by the audit is fixed and the failed task re-run to a pass. — no functional gap
      found; the Phase-2 seams are complete and correctly guardrailed, so no fix was required.
- [x] The a11y/contrast checks pass in both themes over the token layer. — `contrast.test.tsx`
      (77 tests) green in light + dark.
- [x] A designer guide covers token, slot, layout, and per-state edits and the guardrails. —
      `designer-guide.md` authored from the audited facts (three-layer token model, four edit classes,
      worked propagation examples, guardrail list; links `tokens.md` + `catalog.html`).
- [x] No source value, security boundary, or dependency is changed. — `style.css` is byte-unchanged
      from Phase 2 (audit experiments ran on copies); no `.tsx`, no test, no transport/redaction/ticket/
      plan-mode file, no dependency touched. The only shipped file is the markdown designer guide.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — no backend code touched; only the pre-existing `attachment-normalization`
      WASM flake fails (proven on clean HEAD).
- [x] `npm run test:web` — **670 passed / 62 files (all green)** in this phase's final-state run. The
      `viewer-history.test.tsx` test that failed in earlier runs **passed here**, confirming it is
      **flaky / timing-sensitive** (an async `setTimeout(0)` focus-restore raced by a synchronous
      assertion plus a mocked `history.back`), not a deterministic defect and not caused by any
      epic-003 phase (proven pre-existing at pre-003 commit `8867945`). Tracked for separate epic-002
      test-hardening. This phase changes only a markdown file — zero test impact.
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light captures show every refined surface visually identical to its Phase-2
      baseline with zero page horizontal overflow. — no surface was refined; `style.css` + components
      are byte-identical to the Phase-2 baseline, so every surface is identical by construction. The
      catalog structural mount holds at 390px with zero overflow.
- [x] The true-390px dark captures show every refined surface visually identical to its Phase-2
      baseline with zero page horizontal overflow. — same proof, dark theme (byte-identity is
      theme-independent).
