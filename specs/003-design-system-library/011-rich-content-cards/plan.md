<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Rich content cards

## Approach

Gate on the merge, then restyle in place, value-preserving. Wait for feature
`006-rich-content-blocks` to merge its cards into `main`, then read the merged card rules, map each
colour onto the semantic role tokens, wrap every editable region and lifecycle/copy state in the
`@ds` grammar, and leave the safe-Markdown renderer, the clipboard boundary, and the no-fetch wiring
untouched behind guardrail comments. Prove pixel-identity against the as-merged baseline.

## Steps

1. Confirm `006-rich-content-blocks` has merged into `main`; if not, block this grandchild until it
   does. Record the merge commit as the as-merged baseline.
2. Inventory the merged rich-content card rules and record each card's lifecycle and copy state
   appearance.
3. Map each card's colours onto the semantic role tokens (and a component-token set per card family
   where warranted), resolving to the same values.
4. Add `@ds surface:` per card, label slots (`@ds slot:` command / output / code / label / preview /
   actions), and the layout seam (`@ds edit: layout` for card and preview layout).
5. Wrap each visual state in a `@ds state:` block: command running-tail / completed-top /
   malformed-fallback; code plaintext-first / highlighted; copy success / failure / unavailable; Open.
6. Fence the safe-Markdown renderer, clipboard boundary, and no-fetch/no-ticket wiring with
   `@ds guardrail: do-not-edit`.
7. Register the cards in the catalog and capture them at true-390px light/dark across their principal
   states, diffing against the as-merged baseline.

## Files to change

- `apps/pi-remote-web/src/rich-content/CommandOutputCard.tsx`, `CodeCard.tsx`,
  `TextArtifactCard.tsx`, `RichContentRouter.tsx`, `RichBlockFrame.tsx`, `SafeMarkdown.tsx`
  (class/slot/state labels; sanitization and behaviour unchanged) — all as merged from feature 006
- `apps/pi-remote-web/src/style.css` (rich-content card rules onto tokens)
- `apps/pi-remote-web/src/design-system/tokens.md` (document any card component-token set)
- `scripts/design-system-cdp.mjs` (rich-content capture support, if needed)

## Verification gate

Run from the repository root (only after `006-rich-content-blocks` has merged):

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface rich-content-cards --viewport-width 390 --theme light --output <temporary-directory>/rich-content-cards-light.png
node scripts/design-system-cdp.mjs --surface rich-content-cards --viewport-width 390 --theme dark --output <temporary-directory>/rich-content-cards-dark.png
```

The gate passes only when the merge dependency is satisfied, all suites and the build pass, the
rich-content and safe-Markdown tests stay green, the CDP runner reports exactly 390 CSS pixels with
zero page horizontal overflow, and every card state is visually identical to its as-merged baseline
in both themes with no source value changed and no mutation/host-file/sanitization behaviour touched.
