---
title: "Child 001 implementation summary — naming grammar and rename manifest"
description: "Continuity anchor. Nothing is implemented yet: this records the measured starting state and the two decisions still waiting on the operator."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from the measured naming inventory; no files moved."
    next_safe_action: "Operator confirms the taxonomy and prefix list."
    blockers: ["taxonomy and kind-prefix list await operator sign-off"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 001 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 3 |
| Status | **Scoped, not started** — blocked on operator sign-off |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing has moved. The measured starting state this child acts on:

| Measurement | Count |
|---|---|
| In-scope source files under `app-mobile/src/` | 148 — 96 `.svelte`, 54 `.ts` |
| PascalCase source files | 92 |
| camelCase source files | 22 |
| Files in `shared/primitives/` today, one flat list | 18 |
| Files in `shared/chrome/` today | 5 |
| Files in `shared/data/` today, deferred to child 002 | 28 |
| `$shared/…` specifiers across the app | 238 |
| Local relative specifiers | 296 |
| Deep-relative (`../../`) specifiers the alias does not cover | 2 |

The two artefacts this child produces — the rename manifest and the generated rewrite script — do not
exist yet.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Decide, build the manifest, then run it over `shared/primitives/` and `shared/chrome/`. The executor
performs the moves one folder per dispatch; Claude owns the manifest, the verification and git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The manifest comes before any move.** A manifest built after the first batch describes a tree that
is half old and half new, and everything generated from it inherits that.

**The proving ground is deliberately small.** Twenty-three files exercise every mechanical trap in the
packet — case-only renames, folder creation, the kind-prefix grammar — and the diff is still short
enough to read line by line. Finding the case-rename trap on 148 files instead would be expensive.

**The `shared/data/` taxonomy is decided here and executed in child 002.** The tree is one design
decision, so the operator approves the whole shape once rather than twice.

**The full conventions refresh is not in this packet.** It belongs to 019, after every convention has
shipped. Child 003 lands only the minimal naming correction that covers the window.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Operator sign-off on taxonomy and prefix list | not obtained |
| Rename manifest exists | no |
| Rewrite dry-run diff read | no |
| `npm run build` | not run |
| `npm run typecheck` | not run |
| `git log --follow` case-rename spot-check | not run |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**A rename cannot be proven correct by the build alone.** A partial rename that still compiles is the
realistic failure, and the type checker is blind to it. The completeness scan is what catches it, and
a scan is only as good as its exclusion list.

**Git's rename detection is heuristic.** `git log --follow` on three files is a sample, not a proof
that all twenty-three were recorded as renames.

**The taxonomy is a prediction about future change**, and predictions age. The mitigation is the
grouping rule itself: when a new file has no obvious home, that is evidence the taxonomy needs a
folder, not evidence it needs a `misc/`.
<!-- /ANCHOR:limitations -->
