---
title: "Phase A plan — batched moves, token identity per batch"
description: "How the 82 single-owner classes move: six disjoint component batches dispatched concurrently to cli-codex, each proven value-identical by the token-identity gate before it lands."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T08:15:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; six disjoint batches."
    next_safe_action: "Dispatch batch 1 (artifacts)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Move the 82 single-owner classes from `app.css` into their components' scoped `<style>` blocks. The
moves are disjoint by component, so they run as six concurrent cli-codex batches. Every move is a pure
relocation proven by token identity holding at zero diffs.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Per batch: `npm run typecheck`, `npm run test:web`, and the token-identity diff against the
`007-verify-and-cutover` baseline resolving `app.css` plus every scoped `<style>`. Whole from the final
state before the phase closes: build, typecheck, `npm test`, `test:web`, token identity, contrast +
fences, CDP 390px, catalog smoke, `validate.sh --strict`.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Token identity is the safety net: the gate resolves `app.css` plus every scoped `<style>` into final
values per theme and diffs against the pre-migration snapshot. A rule that only relocates keeps its
value, so a correct move reads as zero diffs; a dropped declaration, a resurrected dead `@media`, or a
mis-scoped prop-class changes a resolved value or a rendered frame, which token identity or catalog
smoke catches.

A markup-owned class is moved as a normal scoped rule — Svelte hashes it in both the rule and the
markup. A prop-class, passed as a `class` string to a child primitive, is moved as `:global(.name)`,
because Svelte cannot hash a class it does not see literally. Every `@media` and state variant moves
with the base rule it modifies, in source order.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Six disjoint batches, one cli-codex Luna Max Fast agent each, token identity verified after each.

### Phase 1 · artifacts
The ten `pages/chat/artifacts/*` files in the work-list.

### Phase 2 · chrome-a
`button-plan-mode`, `command-option`, `composer-command-autocomplete`, `composer-tools`,
`menu-plan-mode`, `radio-effort`.

### Phase 3 · chrome-b
`session-composer`, `session-header`, `sheet-leave-plan`, `sheet-model-effort` — carries the
prop-classes moved via `:global()`.

### Phase 4 · rich-content
`card-code`, `card-command-output`, `rich-block-frame`, `rich-content-router`, `safe-markdown`,
`ask-question-option-row`.

### Phase 5 · transcript
`block`, `transcript-list`, `screen-chat`.

### Phase 6 · pages and shared
`screen-enrollment`, `push-settings`, `screen-home`, `screen-attention-inbox`, `screen-review`,
`shared/chrome/header`, `session-state-icon`, `status-pill`.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a relocation, and the existing suite plus token identity is the oracle. Each
batch: token identity 0-diff, `test:web` green, catalog smoke unchanged. The phase closes only after
the whole nine gates run green from the final state and the single-owner scan reports zero.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The frozen single-owner work-list and prop-class flags (measured from `app.css` against the
  component tree).
- The `007-verify-and-cutover` token-identity baseline.
- cli-codex at gpt-5.6-luna, max, fast — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Each batch is one commit. A batch that fails token identity is reverted with `git revert` of that one
commit; nothing else is affected, because the batches are disjoint. No migration, no data, no
irreversible step — a pure source relocation.
<!-- /ANCHOR:rollback -->
