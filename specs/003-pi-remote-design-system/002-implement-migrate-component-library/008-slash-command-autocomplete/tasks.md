# Tasks — Slash command autocomplete

- [x] Inventory the `.slash-panel` rules and the `--slash-*` token set (light, dark, system-dark) and
      record each panel state and option-row state's current appearance. — mapped; the `--slash-*` set
      was raw hex duplicating the frozen palette (identical to `--model-sheet-*`); the rule bodies
      already read `var(--slash-*)`.
- [x] Map the surface's colours onto the semantic role tokens; keep `--slash-*` as the documented
      component layer resolving to the same values, fenced `@ds surface: slash-autocomplete` +
      `@ds edit: tokens`. — each token re-pointed per theme to `--surface` / `--ink` / `--ink-muted` /
      `--accent-ink` / `--accent-strong` / `--accent-soft`; dark `ui-accent` → `--accent-ink` (not
      `--accent-strong`). Resolvers prove every value byte-identical.
- [x] Label the panel slots (`@ds slot:` header / option-list / footer-hint), the option-row slots
      (label / binding / disabled-reason), and the layout seam (`@ds edit: layout` for anchoring). —
      all present across `style.css`, `CommandOption.tsx`, `CommandPalette.tsx`.
- [x] Wrap each panel state in a `@ds state:` block (the thirteen `SlashPanelOpenState` values plus
      `closed` / `drafted`) and each option-row state (`active` / `enabled` / `disabled-with-reason`).
      — `@ds state:` blocks added for the panel states and the option-row states.
- [x] Fence the ranker, catalog lifecycle, trigger predicate, and fail-closed submission with
      `@ds guardrail: do-not-edit`; preserve the unsafe-character escaping verbatim. — `@ds guardrail`
      on the ranker (`CommandPalette.tsx`), the fail-closed press/selection paths, and the
      `UNSAFE_NAME_CHARACTERS` escaping (`CommandOption.tsx`); the escaping regex is byte-identical.
- [x] Document the `--slash-*` set in the token reference as a component-token example. — `tokens.md`
      now carries the Slash-panel block with a "Resolved to" column and the per-theme `ui-accent`
      divergence, matching the model-sheet example.
- [x] Capture the panel and palette at true-390px light/dark across their principal states and diff
      against the pre-migration baseline. — token + rule resolvers CHANGED 0 across light/dark/system;
      `.tsx` restyled by annotation only (no render change); the command-surface tests stay green.
- [x] Run the full verification gate and record evidence in `checklist.md`. — typecheck 0, build 0,
      test:web 0 (670), validated.
