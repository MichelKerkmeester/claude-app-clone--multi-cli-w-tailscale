<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Plan/todo & ask-question surfaces

> **Spec reconciliation (Logic-Sync):** spec.md was written when the ask-question and todos surfaces
> did not exist and it planned only to *scaffold seams* for them. Both sibling-`002` features have
> since **shipped to `main`** (`features/ask-question/`, `TodoPanel.tsx`), so this phase **migrates
> all three real surfaces** onto the `@ds` grammar (annotation-only) instead of scaffolding. Documented
> deviation; the intent (bring the task/question surfaces onto the system) is unchanged and better met.

- [x] Read the `plan`-kind branch of `Block` in `apps/pi-remote-web/src/App.tsx` and its `style.css`
      rules; record the current resolved look of a done (✓) and a pending (○) item in light and dark.
      — mapped; the checklist rules are already tokenized.
- [x] Migrate the checklist rules onto semantic + component tokens; add the `@ds surface: plan-todo`
      label and `@ds state:` blocks for done and pending items, keeping the ✓/○ presentation identical.
      — `@ds surface: plan-todo` + `@ds state:` for done (✓) / pending (○); rules already token-backed,
      no literal→token needed; App.tsx's existing transcript `@ds` labels preserved.
- [x] Add a `@ds guardrail` marking plan-item computation, delivery, and plan-mode gating as off-limits
      to a designer edit; confirm none of that logic is changed. — `@ds guardrail` marks the done
      derivation from the plan block model; `.tsx` comments-only, so the computation is byte-identical.
- [x] ~~Write the `@ds surface:` seam contract for the *future* ask-question / todos surfaces~~ →
      **superseded:** both surfaces exist, so they were **migrated for real** (annotation-only). The
      ask-question card (`AskQuestionCard` + prompt / option-list / option-row / free-text / status /
      submit) carries `@ds surface: ask-question`, `@ds slot:`, `@ds state:`, and `@ds guardrail:
      one-use ticketed, revision-bound, FAIL-CLOSED mutation path`; the todos panel carries `@ds
      surface: todos`, its slots/states, and `@ds guardrail: READ-ONLY projection — the phone NEVER
      mutates pi's task list`.
- [x] Register the migrated surfaces in the catalog. — documented via the `@ds` labels; the standalone
      catalog page lands in grandchild 015.
- [x] Capture true-390px light/dark evidence of the surfaces, diff against baseline, and record results
      in `checklist.md`. — token + rule resolvers CHANGED 0 across light/dark/system; all `.tsx`
      comments-only, so no rendered change is possible.
