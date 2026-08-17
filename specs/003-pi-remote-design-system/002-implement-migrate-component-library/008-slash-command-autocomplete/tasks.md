# Tasks — Slash command autocomplete

- [ ] Inventory the `.slash-panel` rules and the `--slash-*` token set (light, dark, system-dark) and
      record each panel state and option-row state's current appearance.
- [ ] Map the surface's colours onto the semantic role tokens; keep `--slash-*` as the documented
      component layer resolving to the same values, fenced `@ds surface: slash-autocomplete` +
      `@ds edit: tokens`.
- [ ] Label the panel slots (`@ds slot:` header / option-list / footer-hint), the option-row slots
      (label / binding / disabled-reason), and the layout seam (`@ds edit: layout` for anchoring).
- [ ] Wrap each panel state in a `@ds state:` block (the thirteen `SlashPanelOpenState` values plus
      `closed` / `drafted`) and each option-row state (`active` / `enabled` / `disabled-with-reason`).
- [ ] Fence the ranker, catalog lifecycle, trigger predicate, and fail-closed submission with
      `@ds guardrail: do-not-edit`; preserve the unsafe-character escaping verbatim.
- [ ] Document the `--slash-*` set in the token reference as a component-token example.
- [ ] Capture the panel and palette at true-390px light/dark across their principal states and diff
      against the pre-migration baseline.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
