# Tasks — Control primitives

- [ ] Inventory the shared controls and their current react-aria state styling in `style.css`
      (`[aria-pressed]`, `[aria-busy]`, `:focus-visible`, `data-*`) across `App.tsx` and
      `RuntimeStrip.tsx`.
- [ ] Define the canonical per-state seam set: one `@ds state:` block each for default, hover,
      pressed, disabled, focus-visible, and busy, reading from tokens only.
- [ ] Migrate Button, ToggleButton, ToggleButtonGroup, and Disclosure / DisclosurePanel onto the
      seam set, fenced with `@ds surface:` and a `@ds guardrail` on the react-aria wiring.
- [ ] Migrate StatusPill, Freshness, EmptyState, SessionStateIcon, and the inline glyphs onto tokens,
      preserving each state variant.
- [ ] Confirm behaviour, focus order, and a11y semantics are unchanged (react-aria still owns them).
- [ ] Capture true-390px light/dark of a primitives fixture and prove pixel-identity against the
      pre-migration baseline; record evidence in `checklist.md`.
