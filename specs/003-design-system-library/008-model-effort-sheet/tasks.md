<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Model & effort sheet

- [x] Inventory `.model-sheet-overlay` rules and the `--model-sheet-*` token set (light, dark,
      system-dark) and record each visual state's current appearance. — mapped; the token set was
      raw hex duplicating the frozen palette; the rule bodies already read `var(--model-sheet-*)`.
- [x] Map the sheet's colours onto the semantic role tokens; keep `--model-sheet-*` as the
      documented component layer resolving to the same values, fenced `@ds surface:
      model-effort-sheet` + `@ds edit: tokens`. — each component token re-pointed to its semantic
      role per theme (`--surface` / `--ink` / `--ink-muted` / `--accent-ink` / `--accent-strong` /
      `--accent-soft`); the dark `ui-accent` maps to `--accent-ink` (not `--accent-strong`, which has
      no dark override). Resolvers prove every value byte-identical.
- [x] Label the sheet slots (`@ds slot:` header / search / model-list / effort-group / footer) and
      the layout seam (`@ds edit: layout` for stacking, drag offset, safe-area). — all present, plus
      `@ds slot: drag-handle` and `@ds slot: status-lines`.
- [x] Wrap each visual state in a `@ds state:` block: model-open, effort-open, committing,
      terminal-blocked, pending-effort, dragging, snapping, search-shown, effort confirmed, effort
      requested, read-only/disabled. — all present (plus `group aria-busy`).
- [x] Fence the runtime/mutation/host-reconcile wiring with `@ds guardrail: do-not-edit`. — the
      commit path, one-use ticket, revision check, host-snapshot reconcile, and the react-aria /
      radiogroup wiring are fenced in `ModelEffortSheet.tsx` / `EffortRadioGroup.tsx`; both `.tsx`
      files are comments-only (0 deletions).
- [x] Document the `--model-sheet-*` set in the token reference as the worked component-token example.
      — `tokens.md` now records each token's resolved-to role and the per-theme `ui-accent`
      divergence, documenting the real primitive → semantic → component chain.
- [x] Capture the sheet at true-390px light/dark across its principal states and diff against the
      pre-migration baseline. — token + rule resolvers CHANGED 0 across light/dark/system; `.tsx`
      comments-only, so no rendered change is possible; the sheet a11y/reflow tests stay green.
- [x] Run the full verification gate and record evidence in `checklist.md`. — typecheck 0, build 0,
      test:web 0 (670), validated.
