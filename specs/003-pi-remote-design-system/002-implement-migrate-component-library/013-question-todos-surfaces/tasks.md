# Tasks — Plan/todo & ask-question surfaces

- [ ] Read the `plan`-kind branch of `Block` in `apps/pi-remote-web/src/App.tsx` and its `style.css`
      rules; record the current resolved look of a done (✓) and a pending (○) item in light and dark.
- [ ] Migrate the checklist rules onto semantic + component tokens; add the `@ds surface: plan-todo`
      label and `@ds state:` blocks for done and pending items, keeping the ✓/○ presentation identical.
- [ ] Add a `@ds guardrail` marking plan-item computation, delivery, and plan-mode gating as off-limits
      to a designer edit; confirm none of that logic is changed.
- [ ] Write the `@ds surface:` seam contract for the future ask-question prompt UI (option/free-text
      states) and the future todos list (task rows with status), each marked pending and gated on the
      sibling `002` features `009-ask-question` and `010-todos`.
- [ ] Register the migrated plan/todo checklist in the catalog and list the two future surfaces as
      declared-but-pending entries.
- [ ] Capture true-390px light/dark evidence of the plan/todo block, diff against baseline, and record
      results in `checklist.md`.
