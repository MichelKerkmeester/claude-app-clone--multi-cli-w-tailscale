---
title: "Child 012 implementation summary — naming grammar and shared-tree structure"
description: "Continuity anchor for the naming and structure packet. Nothing is implemented yet: this records what is scoped, what the measured starting state is, and what blocks the first task."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from measured inventory; no code changed."
    next_safe_action: "Operator confirms taxonomy and prefix list, then build the rename manifest."
    blockers: ["taxonomy and kind-prefix list await operator sign-off"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 012 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 3 |
| Status | **Scoped, not started** — awaiting operator sign-off on the tree |
| Requirements shipped | none yet; REQ-001 … REQ-008 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No file has been renamed, moved or edited under `app-mobile/`.

What exists is the scope, derived from a measured inventory of the current tree rather than from
impression:

| Measurement | Value |
|---|---|
| In-scope source files (`.svelte` + `.ts`, excluding tests, stories, `.d.ts`) | 148 |
| PascalCase-named | 92 |
| camelCase-named | 22 |
| Files in `shared/data/` | 28, spanning six responsibilities |
| Files in `shared/primitives/` | 18, flat |
| `$shared/…` import specifiers | 238 |
| Local relative import statements | 296 |
| Deep-relative (`../../`) specifiers remaining | 2 |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Per-folder batches. Each batch is one atomic commit carrying its `git mv` set, its specifier rewrite
generated from the rename manifest, and a green build plus typecheck.

Atomicity is not stylistic here. A live-follow daemon restores the working tree to `HEAD` a minute or
two after an edit lands, so a half-applied batch left uncommitted disappears without a reflog trace.

The executor writes `app-mobile/**`. Claude owns the configs, the conventions authority, and git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

Four, recorded in full in `decision-record.md`: kebab-case for every file and folder including
components, which knowingly leaves Svelte's PascalCase convention; kind-first component names, chosen
over the more readable kind-last because a directory listing sorts alphabetically and kind-first is
what groups a family on screen; `shared/` split by reason-to-change rather than by technical kind; and
`routes/**` excluded because in SvelteKit the route tree is the URL contract.

Two of the four are proposals awaiting the operator, because a folder taxonomy and a prefix list are
design decisions rather than derivations.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Nine program gates | not run — packet not started |
| Rename-completeness scan | not run |
| Case-rename `git log --follow` spot-check | not run |
| `validate.sh --strict` on this packet | run at authoring time; see the packet's own gate evidence |

No completion claim is made or implied by this document.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The taxonomy is a prediction.** Grouping by reason-to-change is a bet about how this code will
change next. It is a better bet than grouping by technical kind, but it is still a bet, and the honest
signal that it was wrong will be a new file with no obvious home.

**Two packets contend for the same files.** This packet and 013 both touch all 148 source files. They
cannot run concurrently, and nothing enforces that except sequencing discipline.

**The conventions authority is in another repository.** Phase 6 lands in the Public monorepo through
an isolated worktree, which means the app tree and its conventions file can be briefly inconsistent —
between the last rename commit and the conventions merge. That window should be short and is the
reason Phase 6 is sequenced immediately before the barrier rather than after it.
<!-- /ANCHOR:limitations -->
