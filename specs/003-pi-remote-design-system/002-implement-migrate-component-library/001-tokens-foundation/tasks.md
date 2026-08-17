# Tasks — Token library foundation

- [ ] Inventory every token in `apps/pi-remote-web/src/style.css` and record its resolved light and
      dark value (the `@theme` set, the `:root` light set, the `[data-theme='dark']` and system-dark
      sets, and the `--model-sheet-*` / `--slash-*` component sets).
- [ ] Add a primitive token layer holding the frozen ink-on-parchment palette and raw scales as
      verbatim source values, fenced with `@ds guardrail: do-not-edit — frozen source`.
- [ ] Rewrite the semantic role tokens to reference the primitives while keeping each role's
      resolved value identical in light and dark; label the block `@ds edit: tokens — semantic roles`.
- [ ] Document the component-token convention by fencing the `--model-sheet-*` and `--slash-*` sets
      with `@ds surface:` + `@ds edit: tokens` and describing how to add a new component's set.
- [ ] Confirm the three theme states (explicit light, explicit dark, system) still resolve every
      semantic token to its pre-migration value without changing the theming mechanism.
- [ ] Write `apps/pi-remote-web/src/design-system/tokens.md` documenting every token, its layer, its
      resolved light/dark value, and the effect of editing it.
- [ ] Add or extend `scripts/design-system-cdp.mjs` to capture the app's default surface at true
      390px in light and dark, and diff against the pre-migration baseline to prove pixel-identity.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
