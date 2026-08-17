# Tasks — Plan-mode controls

- [ ] Inventory the plan-mode rules in `style.css` and record each `ModePresentationKind` and gating
      state's current appearance across button, menu, ready card, review/leave sheets, strip, and
      announcers.
- [ ] Map each component's colours onto the semantic role tokens (and component tokens where a
      component warrants its own set), resolving to the same values.
- [ ] Add `@ds surface:` per component, label slots (`@ds slot:`), and label the layout seam
      (`@ds edit: layout` for stacking and safe-area).
- [ ] Wrap each visual state in a `@ds state:` block: the thirteen `ModePresentationKind` values;
      plan-ready live/newest/valid vs waiting; review-sheet `isExecuting`/dismiss; leave-sheet
      `mode`/`plan-ready`; polite/alert announcer states.
- [ ] Fence the runtime state machine, mode authority, execution lease, `set_mode`/`execute_plan`
      protocol, and planToken redaction with `@ds guardrail: do-not-edit`.
- [ ] Run the plan protocol / lease / web tests to prove the authority and mutation boundary are
      unchanged by the restyle.
- [ ] Capture the plan-mode controls at true-390px light/dark across their principal states and diff
      against the pre-migration baseline.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
