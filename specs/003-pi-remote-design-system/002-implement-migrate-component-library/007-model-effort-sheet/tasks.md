# Tasks — Model & effort sheet

- [ ] Inventory `.model-sheet-overlay` rules and the `--model-sheet-*` token set (light, dark,
      system-dark) and record each visual state's current appearance.
- [ ] Map the sheet's colours onto the semantic role tokens; keep `--model-sheet-*` as the
      documented component layer resolving to the same values, fenced `@ds surface:
      model-effort-sheet` + `@ds edit: tokens`.
- [ ] Label the sheet slots (`@ds slot:` header / search / model-list / effort-group / footer) and
      the layout seam (`@ds edit: layout` for stacking, drag offset, safe-area).
- [ ] Wrap each visual state in a `@ds state:` block: model-open, effort-open, committing,
      terminal-blocked, pending-effort, dragging, snapping, search-shown, effort confirmed, effort
      requested, read-only/disabled.
- [ ] Fence the runtime/mutation/host-reconcile wiring with `@ds guardrail: do-not-edit`.
- [ ] Document the `--model-sheet-*` set in the token reference as the worked component-token example.
- [ ] Capture the sheet at true-390px light/dark across its principal states and diff against the
      pre-migration baseline.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
