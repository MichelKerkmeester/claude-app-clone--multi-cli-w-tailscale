# Tasks — Rich content cards

- [ ] Confirm feature `006-rich-content-blocks` has merged its cards into `main`; block this
      grandchild until it does, and record the merge commit as the as-merged baseline.
- [ ] Inventory the merged rich-content card rules and record each card's lifecycle and copy state
      appearance.
- [ ] Map each card's colours onto the semantic role tokens (and a per-card component-token set where
      warranted), resolving to the same values.
- [ ] Add `@ds surface:` per card, label slots (`@ds slot:` command / output / code / label /
      preview / actions), and the layout seam (`@ds edit: layout`).
- [ ] Wrap each visual state in a `@ds state:` block: command running-tail / completed-top /
      malformed-fallback; code plaintext-first / highlighted; copy success / failure / unavailable; Open.
- [ ] Fence the safe-Markdown renderer, clipboard boundary, and no-fetch/no-ticket wiring with
      `@ds guardrail: do-not-edit`.
- [ ] Register the cards in the catalog and capture them at true-390px light/dark across their
      principal states, diffing against the as-merged baseline.
- [ ] Run the full verification gate and record evidence in `checklist.md`.
