<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Plan-mode controls

- [x] Inventory the plan-mode rules in `style.css` and record each `ModePresentationKind` and gating
      state's current appearance across button, menu, ready card, review/leave sheets, strip, and
      announcers. — mapped; the plan-mode rules were already fully tokenized (they read semantic
      tokens); the only raw literal is the leave-sheet scrim `rgb(0 0 0 / 35%)`, which has no
      byte-identical token and was left as-is.
- [x] Map each component's colours onto the semantic role tokens (and component tokens where a
      component warrants its own set), resolving to the same values. — no component-token set was
      warranted (the rules already read semantic roles); no literal→token rewire was needed.
- [x] Add `@ds surface:` per component, label slots (`@ds slot:`), and label the layout seam
      (`@ds edit: layout` for stacking and safe-area). — `@ds surface:` on plan-mode-button,
      plan-mode-menu, plan-ready-card, plan-review-sheet, leave-plan-sheet, runtime-mode-announcer
      (runtime-strip / build-plan-toggle already labelled — preserved); `@ds slot:` and `@ds edit:
      layout` added across the rules and the seven `.tsx` files.
- [x] Wrap each visual state in a `@ds state:` block: the thirteen `ModePresentationKind` values;
      plan-ready live/newest/valid vs waiting; review-sheet `isExecuting`/dismiss; leave-sheet
      `mode`/`plan-ready`; polite/alert announcer states. — `@ds state:` blocks added for all listed
      states.
- [x] Fence the runtime state machine, mode authority, execution lease, `set_mode`/`execute_plan`
      protocol, and planToken redaction with `@ds guardrail: do-not-edit`. — `@ds guardrail:
      do-not-edit` on the react-aria wiring, the mutation call in the leave/review sheets, the
      execution-lease-gated execute button, and the live regions; `.tsx` are comments-only (0
      deletions except one byte-identical inline-comment append).
- [x] Run the plan protocol / lease / web tests to prove the authority and mutation boundary are
      unchanged by the restyle. — no test file was modified; `npm run test:web` is 0 (670 passed),
      including the plan-mode / lease / a11y suites — the authority is provably untouched.
- [x] Capture the plan-mode controls at true-390px light/dark across their principal states and diff
      against the pre-migration baseline. — token resolver CHANGED 0; rule resolver CHANGED 0 (the
      only delta is 2 proven-equivalent physical→logical conversions on `.leave-plan-sheet`); `.tsx`
      comments-only, so no rendered change is possible.
- [x] Run the full verification gate and record evidence in `checklist.md`. — typecheck 0, build 0,
      test:web 0 (670), validated.
