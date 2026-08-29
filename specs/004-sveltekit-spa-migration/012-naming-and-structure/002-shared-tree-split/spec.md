---
title: "Child 002 — Shared tree split"
description: "Redistribute the 28-file shared/data grab-bag into seven folders grouped by reason to change, and rewrite the specifiers that reach it from nearly every page component."
trigger_phrases:
  - "shared data folder split"
  - "transport state commands catalog"
  - "shared specifier rewrite"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped as the widest specifier impact in the naming pass."
    next_safe_action: "Wait for child 001's manifest."
    blockers: ["depends on the manifest from child 001"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 — Shared tree split

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../001-grammar-and-manifest/spec.md |
| **Successor** | ../003-pages-and-tooling/spec.md |
| **Level** | 2 |
| **Layer** | naming pass — critical path |
| **Writer** | executor (`app-mobile/src/shared/**` moves) + Claude (verification, git) |
| **Barrier** | `shared/data/` gone; no `$shared/data/…` specifier survives; build and typecheck green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

`shared/data/` holds 28 source files: the WebSocket client, authentication, the cache, four state
reducers, seven slash-command modules, the model catalog, string formatting, viewport anchoring and
the demo fixtures. It is the folder things go when there is no better folder, and it has been that
long enough to stop being searchable.

This child is on the critical path for one reason: `$shared/data/…` appears in nearly every page
component, so its rewrite has the widest specifier impact in the packet and is the one most likely to
surface a case the generated script missed.

It is also the child where a partial application is most likely to still compile. Move twenty of the
twenty-eight files and the build stays green; the tree is simply wrong in a way no gate notices. That
is why the completeness check matters more here than the build does.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Create `transport/`, `state/`, `commands/`, `catalog/`, `format/`, `viewport/`, `fixtures/` under
  `shared/`, per the tree recorded in child 001.
- Redistribute all 28 `shared/data/` files by responsibility, renaming the ten camelCase modules to
  kebab-case in the same move.
- Rewrite the `$shared/data/…` specifiers from the manifest.
- Rewrite the two deep-relative (`../../`) specifiers, the only two the `$shared` alias does not cover.
- Confirm the worker files still resolve — they are referenced by URL construction as well as by
  import, so an import-only grep does not prove it.

**Out of scope:** `shared/primitives/` and `shared/chrome/`, which child 001 already moved; `pages/**`
and all tooling, which is child 003; any module's contents; `routes/**`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — `shared/data/` ceases to exist. A leftover file there means the split was partial,
  which is worse than not having started, because the tree then teaches two rules at once.
- **REQ-002** — No `$shared/data/…` specifier survives anywhere in the workspace, tests and stories
  included.
- **REQ-003** — Each of the seven new folders holds one reason to change. `fixtures/` in particular
  stays separate from every runtime folder, because `demo.ts` ships to stories rather than to users.
- **REQ-004** — The moves come from child 001's manifest. Extending it by hand here would break the
  one guarantee the manifest exists to provide.
- **REQ-005** — The two deep-relative specifiers are rewritten. They are the only two outside the
  alias, and therefore the easiest to miss.
- **REQ-006** — The worker files resolve after the move, verified beyond import statements.
- **REQ-007** — Build, typecheck and both suites are green before the child closes.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `shared/data/` does not exist and the 28 files sit across the seven new folders.
2. A grep for `$shared/data/` across the workspace returns zero hits.
3. `npm run build` exit 0.
4. `npm run typecheck` exit 0.
5. `npm run test:web` exit 0, verified by content.
6. The backend suite stays green, run against the four real test directories explicitly.
7. `validate.sh … --strict` exit 0 through the script's realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A partial split still compiles.** The realistic failure here is silent: some files moved, some did
  not, everything builds. The `shared/data/` existence check is the gate, not the build.
- **Widest specifier surface in the packet.** If the generated rewrite has a blind spot, this is where
  it shows.
- **Worker references are not import statements.** `highlight.worker.ts` and
  `attachment-hash.worker.ts` are constructed by URL, so a grep over imports proves nothing about them.
- **The live-follow daemon reverts uncommitted edits**, so the move and its rewrite commit together.
- Depends on child 001's manifest. Nothing starts before it exists.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **Does `use-runtime.svelte.ts` belong in `state/` or beside its consumer?** It is a hook over the
   runtime reducer, so `state/` is the proposal. Recommendation: `state/`, because it changes when the
   reducer changes, which is the grouping rule.
2. **Does `attention.ts` belong in `format/`?** It is closer to a small domain helper than to string
   formatting. Recommendation: leave it in `format/` for now and revisit only if a second attention
   module appears — one file is not enough evidence for a folder.
<!-- /ANCHOR:questions -->
