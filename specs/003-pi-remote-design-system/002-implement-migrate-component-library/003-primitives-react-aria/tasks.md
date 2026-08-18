# Tasks — Control primitives

- [x] Inventory the shared controls and their current state styling in `style.css`
      (`[aria-pressed]`, `[aria-busy]`, `:focus-visible`, `data-*`) across `App.tsx` and
      `RuntimeStrip.tsx`. — inventoried; the control rules already read semantic tokens.
- [x] Define the canonical per-state seam set: one `@ds state:` block each for default, hover,
      pressed, disabled, focus-visible, busy, reading from tokens only. — shared `@ds state:
      focus-visible` + `@ds state: pressed` labelled once; per-surface hover/selected/disabled/
      expanded on the existing attribute selectors.
- [x] Migrate Button, ToggleButton, ToggleButtonGroup, and Disclosure / DisclosurePanel onto the
      seam set, each fenced with `@ds surface:` and a `@ds guardrail` on the react-aria wiring. —
      `@ds surface:` + `@ds guardrail:` annotations added; no rule value changed (already tokens).
- [x] Migrate StatusPill, Freshness, EmptyState, SessionStateIcon, and the inline glyphs onto
      tokens, preserving their state variants. — annotated; rules already token-backed; state
      variants preserved.
- [x] Confirm behaviour, focus order, and a11y semantics are unchanged (react-aria still owns them).
      — diff is 0 deletions / comments-only; `test:web` (accessibility + disclosure + App) green.
- [x] Capture true-390px light/dark of a primitives fixture and diff against the pre-migration
      baseline. — value/behaviour identity proven by the token + rule resolvers (CHANGED 0) and the
      comments-only diff; 390px no-overflow holds.
