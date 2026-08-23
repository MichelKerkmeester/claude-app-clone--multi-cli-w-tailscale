---
title: "Child 012 — Naming grammar and shared-tree structure"
description: "Phase parent for the naming pass: one kebab-case grammar for every file and folder, kind-first component names, and a shared/ tree split by responsibility to replace the 28-file grab-bag. Pure rename and move — no rendered value, behaviour, route or a11y contract changes."
trigger_phrases:
  - "kebab case file naming svelte"
  - "shared folder structure taxonomy"
  - "rename components kind prefix"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Converted to a phase parent with three children."
    next_safe_action: "Operator confirms the taxonomy, then start child 001."
    blockers: ["taxonomy and kind-prefix list await operator sign-off"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 012 — Naming grammar and shared-tree structure

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../011-ux-affordances/spec.md |
| **Successor** | ../013-comment-grammar/spec.md |
| **Level** | phase parent |
| **Layer** | post-cutover editability — structural pass |
| **Phase score** | 40/50 — architectural, 148 files, LOC > 800, extreme scale |
| **Barrier** | all three children green; nine program gates from the final state |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

A designer opening this tree cannot answer two basic questions from the filesystem alone: *what kind
of thing is this file*, and *where does this responsibility live*.

Three naming grammars run at once — 92 PascalCase source files, 22 camelCase, roughly 34 kebab-case.
The mix is an artefact of the port: React components arrived PascalCase, hook modules arrived
camelCase, plain modules were written kebab-case, and nothing ever chose. Nothing in a filename says
what kind of thing it is either. `Sheet.svelte`, `SheetContent.svelte` and `LeavePlanSheet.svelte` are
one modal family, but you only learn that by opening them.

`shared/` compounds it. It is three flat buckets, and one of them — `shared/data/` — holds 28 source
files spanning transport, state reducers, slash-command handling, model catalogs, formatting helpers,
viewport anchoring and demo fixtures. A folder that holds everything says nothing.

The purpose is legibility, not behaviour. Every rendered pixel stays identical, and the token-identity
gate is what proves it.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope**, distributed across three children:

- **Grammar and manifest** — settle the taxonomy and the closed kind-prefix list, build the rename
  manifest as data, generate the specifier rewrite from it, and prove the mechanics on the two
  smallest folders before the wide batches begin.
- **Shared tree split** — `shared/data/` (28 files) becomes seven folders grouped by reason to change,
  which is the largest single specifier impact in the packet.
- **Pages and tooling** — the kind-first rename across every feature folder, then the configs, globs,
  story ids and coverage allowlist that make the renamed tree testable at all.

**Out of scope:** any token value; any behaviour, routing or a11y change; splitting or merging module
*contents*; `routes/**` filenames, because in SvelteKit the route tree is the URL contract;
`app-relay/`, `packages/`, `extensions/`; and the full conventions-authority refresh, which belongs to
019 — this packet lands only the minimal naming correction that covers the window between the rename
and that refresh.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every file and folder under `app-mobile/src/`, excluding `routes/**`, is kebab-case.
  A completeness scan for a capital letter in any in-scope path returns zero.
- **REQ-002** — A component that is an instance of a UI kind carries that kind first in its name.
  Feature and screen components carry no prefix, because their name already is the thing.
- **REQ-003** — `shared/` is split by responsibility. No folder under `shared/` holds more than one
  reason to change, and `shared/data/` ceases to exist.
- **REQ-004** — Nothing rendered moves. The token-identity gate stays at 0 CHANGED / 0 VANISHED /
  0 ADDED across all three theme states, which is the only proof that a pure rename stayed pure.
- **REQ-005** — `routes/**` filenames are untouched, and the completeness scan excludes SvelteKit
  reserved names by name rather than by a pattern that happens not to match them.
- **REQ-006** — Case-only renames are performed so git records them. On this case-insensitive
  filesystem a direct `Button.svelte` → `button.svelte` rename is a silent no-op.
- **REQ-007** — The backend suite stays green throughout, as the leak detector it has been all
  migration: a rename that reaches outside the web workspace shows up there first.
- **REQ-008** — A minimal naming correction lands in the conventions authority alongside the rename,
  so the window before 019 does not teach the opposite of the tree.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All three children pass `validate.sh --strict` through the script's realpath.
2. `npm run build` and `npm run typecheck` exit 0 at each child's barrier.
3. Token-identity 0 diffs across all three theme states from the final state.
4. Rename-completeness scan returns zero non-kebab in-scope paths.
5. A `git log --follow` spot-check confirms case-only renames were recorded as renames.
6. `shared/data/` no longer exists and no `$shared/data/…` specifier survives.
7. Catalog smoke green in both themes after story ids shift.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Partial application is the real failure mode.** Nothing here is intellectually hard, and a
  half-applied rename that still compiles is the outcome to guard against. The completeness scan, not
  the build, is what catches it.
- **Case-insensitive filesystem.** The highest-frequency trap, and the reason child 001 proves the
  mechanics on five files before 148 are in flight.
- **Collision with 013.** Both packets touch all 148 source files, so they must not run concurrently.
- **The live-follow daemon reverts uncommitted edits**, so every batch commits atomically.
- **Story identity churn.** Storybook titles derive from paths, so every story id changes at once and
  the coverage allowlist re-baselines in the same commit.
- Depends on 011 landing first only to avoid a merge conflict, not for correctness.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:phase-map -->
## 7. PHASE DOCUMENTATION MAP

| Child | Level | Carries | Runs |
|---|---|---|---|
| `001-grammar-and-manifest` | 3 | The four naming decisions, the rename manifest, the generated rewrite, and the two smallest folders as proving ground | First — every later batch depends on the manifest |
| `002-shared-tree-split` | 2 | `shared/data/` into seven folders, the deep-relative specifiers, the worker URL references | Second — widest specifier impact, on the critical path |
| `003-pages-and-tooling` | 2 | Kind-first renames per feature folder, configs, globs, story ids, coverage allowlist, the naming stop-gap, the nine-gate barrier | Last — the tooling is what makes the renamed tree testable |

Heavy documentation lives in the children. This parent documents root purpose only.
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:questions -->
## 8. OPEN QUESTIONS

Both are blocking, both are the operator's call, and both are settled inside child 001 — the tree is a
design decision, not a derivation.

1. **Confirm the `shared/` taxonomy.** The proposed split is in `001-grammar-and-manifest/plan.md`.
   The judgement call is whether `state/` and `transport/` are genuinely separate or one `session/`
   folder.
2. **Confirm the kind-prefix list.** `sheet-`, `menu-`, `dialog-`, `card-`, `button-`, `toggle-`,
   `radio-` is proposed. The open part is whether screen-level components stay bare, as proposed, or
   take a `screen-` prefix.
<!-- /ANCHOR:questions -->
