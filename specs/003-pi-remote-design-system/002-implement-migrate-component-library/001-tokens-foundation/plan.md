# Plan — Token library foundation

## Approach

Refactor in place, value-preserving. Read the existing token blocks in `src/style.css`, group them
into three labelled layers without changing a single resolved value, apply the `@ds` grammar and a
guardrail on the primitive source, and generalize the component-token pattern into a documented
convention. Prove pixel-identity with the light/dark baseline capture and the existing contrast and
web tests. Write the token reference last, derived from the final layered stylesheet.

## Steps

1. Inventory every token in `src/style.css` today (the `@theme` tokens; the `:root` light set; the
   `:root[data-theme='dark']` and `@media (prefers-color-scheme: dark) :root[data-theme='system']`
   dark sets; the `--model-sheet-*` and `--slash-*` component sets) and record each token's current
   resolved value in light and dark.
2. Introduce a **primitive layer**: one comment-fenced block holding the raw frozen palette and raw
   scales as the source values, verbatim, with a `@ds guardrail: do-not-edit — frozen source` note.
3. Rewrite the **semantic role tokens** to reference the primitives, keeping each role's resolved
   value identical in light and dark. Label the block `@ds edit: tokens — semantic roles`.
4. Generalize the **component layer**: document the `--model-sheet-*` / `--slash-*` convention as
   the per-component token pattern and fence each set with `@ds surface:` + `@ds edit: tokens`.
5. Confirm the theming selectors still remap the semantic layer correctly in all three theme states
   (explicit light, explicit dark, system) without changing the mechanism (that is grandchild 002).
6. Write the token reference doc: every token, its layer, its resolved light/dark value, and what a
   designer changes by editing it.
7. Capture the true-390px light/dark baseline of the app's default surface and diff it against the
   pre-migration baseline to prove pixel-identity.

## Files to change

- `apps/pi-remote-web/src/style.css` (token blocks only; layer, comment, and reorganize — no value
  changes)
- `apps/pi-remote-web/src/design-system/tokens.md` (new token reference; exact path per the Phase 1
  decision)
- `scripts/design-system-cdp.mjs` (baseline capture support for the default surface, if not already
  present)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface app-default --viewport-width 390 --theme light --output <temporary-directory>/tokens-foundation-light.png
node scripts/design-system-cdp.mjs --surface app-default --viewport-width 390 --theme dark --output <temporary-directory>/tokens-foundation-dark.png
```

The gate passes only when all suites and the build pass, the contrast test stays green, the CDP
runner reports exactly 390 CSS pixels with zero page horizontal overflow, both captures are
visually identical to the pre-migration baseline in each theme, and every frozen source value is
present verbatim in the primitive layer and unchanged.
