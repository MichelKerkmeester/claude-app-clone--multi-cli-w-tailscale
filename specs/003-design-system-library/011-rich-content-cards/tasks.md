<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Rich content cards

- [x] Confirm feature `006-rich-content-blocks` has merged its cards into `main`; block this
      grandchild until it does, and record the merge commit as the as-merged baseline. — merged:
      `5925ff7 Merge branch 'worktrees/007-pi-remote-006-rich-content'` (feature commits a2488fc /
      b5bffee / 9ec55fd). The cards exist at `apps/pi-remote-web/src/rich-content/`; the migration
      baseline is `82fef7c` (current `main`, cards present).
- [x] Inventory the merged rich-content card rules and record each card's lifecycle and copy state
      appearance. — the `.rich-block-*` rules (~L3124 onward) were already fully tokenized (no raw
      hex/rgba); no component-token set exists.
- [x] Map each card's colours onto the semantic role tokens (and a per-card component-token set where
      warranted), resolving to the same values. — no rewire needed: the rules already read semantic
      tokens; no component-token set was warranted.
- [x] Add `@ds surface:` per card, label slots (`@ds slot:` command / output / code / label /
      preview / actions), and the layout seam (`@ds edit: layout`). — done across `style.css` and the
      six card `.tsx` files.
- [x] Wrap each visual state in a `@ds state:` block: command running-tail / completed-top /
      malformed-fallback; code plaintext-first / highlighted; copy success / failure / unavailable;
      Open. — all present.
- [x] Fence the safe-Markdown renderer, clipboard boundary, and no-fetch/no-ticket wiring with
      `@ds guardrail: do-not-edit`. — `SafeMarkdown.tsx` is fenced with `@ds guardrail: do-not-edit`
      on the allowlist, URL/scheme filtering, escaping, the fail-closed AST boundary, control/bidi
      handling, and the language allowlist; the copy/no-fetch wiring in the cards is fenced too. All
      `.tsx` are comments-only (0 deletions).
- [x] Register the cards in the catalog and capture them at true-390px light/dark across their
      principal states, diffing against the as-merged baseline. — the transcript already carries the
      `@ds slot: rich-content-cards` seam (grandchild 005); catalog docs land in grandchild 015. Token
      + rule resolvers CHANGED 0 across light/dark/system; `.tsx` comments-only, so no rendered change
      is possible.
- [x] Run the full verification gate and record evidence in `checklist.md`. — typecheck 0, build 0,
      test:web 0 (670), validated.
