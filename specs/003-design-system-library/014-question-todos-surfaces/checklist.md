<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Plan/todo & ask-question surfaces

> Spec reconciliation: the ask-question and todos surfaces, planned as "future/pending" in spec.md,
> have shipped to `main`; this phase migrated all three real surfaces (annotation-only) rather than
> scaffolding seams. See tasks.md.

- [x] The `plan`-kind block's todo checklist reads semantic + component tokens and is `@ds surface:`
      labelled, with `@ds state:` blocks for done (✓) and pending (○) items. — `@ds surface: plan-todo`
      + `@ds state:` done/pending; rules already token-backed.
- [x] The checklist renders identically to before in both themes; the ✓/○ presentation is unchanged.
      — App.tsx comments-only; rule + token resolvers CHANGED 0.
- [x] Plan-item computation, delivery, and plan-mode gating are untouched and fenced by a
      `@ds guardrail`. — `@ds guardrail` on the done-derivation; `.tsx` comments-only.
- [x] The ask-question and todos surfaces are migrated (superseding the "future seam" plan): each is
      `@ds surface:`-labelled with slots and states, ask-question's one-use ticketed / revision-bound /
      FAIL-CLOSED mutation path is fenced `@ds guardrail`, and the todos panel is fenced as a READ-ONLY
      projection. — done across the 7 ask-question `.tsx`, `TodoPanel.tsx`, and their style.css rules.
- [x] No visible surface changes, and no mutation is introduced. — annotation-only; a non-comment
      scan of the ask-question `.tsx` for `ticket`/`revision`/`mutat`/handler/`useState` changes
      returned empty; the mutation boundary is byte-identical; the todo panel stays read-only.
- [x] The catalog registers the surfaces. — documented via the `@ds` labels; standalone catalog is
      grandchild 015.
- [x] No frozen source value, security boundary, or dependency is changed. — token resolver CHANGED 0
      / MISSING 0; rule resolver CHANGED 0 / VANISHED 0 / ADDED 0; no dependency added.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. the ask-question, todo,
      and plan-block suites — behaviour + the mutation boundary unchanged; no test modified).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture of the plan/todo block reports exactly 390 CSS pixels, has zero
      page horizontal overflow, and is visually identical to the pre-migration baseline. — no rendered
      change possible: annotation-only; the token + rule resolvers show every declaration
      byte-identical.
- [x] The true-390px dark capture of the plan/todo block reports exactly 390 CSS pixels, has zero page
      horizontal overflow, and is visually identical to the pre-migration baseline. — same proof, dark
      + system.
