---
title: "Child 019 implementation summary — surface skill refresh"
description: "Continuity anchor. Nothing is implemented yet: this records why the authority is wrong, why the branch is stranded, and why the packet is deliberately last."
trigger_phrases:
  - "surface skill refresh implementation summary"
  - "surface skill refresh packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-24T17:58:13.902Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Merged into the live skill line and verified by a dispatch."
    next_safe_action: "None — the packet is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 019 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `004-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Complete** — merged into the live skill line and verified by a dispatch |
| Requirements shipped | REQ-001 … REQ-007 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The surface now teaches the shipped tree. Two commits sit on
`worktrees/026-019-surface-skill-refresh`: the rewrite at `3e615efedd` and, separately, the
frontmatter six reference documents had been missing since an earlier reorganisation, at `73c7cbc31b`.

| Change | What it now teaches |
|---|---|
| Paths | `app-mobile` and `app-relay`; the design-system documents at `feature-catalog/design-system/`; the catalog at `app-mobile/catalog.html`; and that `src/style.css` is gone, replaced by scoped component blocks over a shared `app.css` |
| Module and comment grammar | the `MODULE:` banner and numbered box-drawing dividers the tree actually uses |
| Naming | kebab-case, the closed kind-first prefix list, and the `routes/**` exemption with its reason |
| Shared ownership | the nine shared folders against what makes each one change |
| Folder documentation | the README and CODE pair per source folder, and which template answers which question |
| Runes | the self-invalidation doctrine, stated as the failure it prevents |
| Routing keywords | Svelte, runes and scoped styles in place of `.tsx` and `style.css` |

The state this packet inherited:

| Fact | State |
|---|---|
| Conventions authority loaded by every code dispatch on this app | `sk-code-mobile-cli`, in the Public monorepo |
| Divider grammar it teaches | the compact form, superseded during the editability pass |
| Files and dividers the codebase actually converted | 45 files, 213 dividers |
| Branch carrying the framework refactor | allocated, three commits, **never merged** |
| Consequence of the strand | no workflow loads the refactor at all |
| Conventions about to become stale | naming, comments, folder documentation — one per editability packet |
| Runes self-invalidation incidents in this programme | 7, with 19 hand-placed suppressions across 11 files |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Audit, rewrite, land through an isolated worktree, merge. Claude owns the whole packet — it is
cross-repository work with landing discipline rather than app code.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Deliberately last.** A conventions authority documents what shipped. Every earlier attempt to write
this mid-flight would have described a tree that was still moving, and would have been rewritten.

**The naming packet keeps a minimal stop-gap.** Without it, the window between the rename and this
refresh would have the authority teaching the opposite of the tree. The full refresh lives here; the
one-paragraph correction lives there.

**The runes doctrine goes here because the lint rule was declined.** Standing up a Svelte lint lane —
installing a parser, triaging a first pass, authoring a custom rule no upstream plugin expresses, then
keeping a tenth gate green forever — was judged too expensive for a one-person project. That decision
is only defensible if the knowledge is written down somewhere a dispatch reads.

**The merge is inside this packet.** Leaving it stranded a second time would mean two packets have
produced work that nothing loads.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Audit against the shipped tree | eight stale path claims found and corrected |
| Reference-integrity scan | `scan-skill-references.mjs` — 18 path claims, 6 filename references, broken 0 |
| Divider grammar replaced | the `MODULE:` banner and numbered dividers, read back against `turns.ts` |
| Runes doctrine written | four-step audit stated as the failure it prevents |
| Skill package validation | `package_skill.py --check --strict` — `Result: PASS` |
| Skill root metadata | `ci-skill-root-metadata.cjs --fix` — checked=13 passed=13 failed=0 |
| Commit-message gate | flagged an 82-character subject; amended to 75 |
| Branch merged | `3f53552ed2..73c7cbc31b` onto `skilled/v4.0.0.0` |
| Dispatch against the merged surface | answered four convention questions correctly from the merged text |
| `validate.sh --strict` via realpath | exit 0 |

The dispatch is a sample rather than a proof — one loading agent answering four questions is evidence that the surface reads correctly, not that every claim in it is right.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Correctness here is not mechanically checkable.** A scan proves every path resolves and a grep proves
the old grammar is gone. Neither proves the new prose is right about Svelte. Only a dispatch loading
the merged surface tests meaning, and a single dispatch is a sample rather than a proof.

**Failure is silent and delayed.** A wrong conventions document does not break a build; it misdirects
future work, and the cost appears later as code in the wrong shape. There is no gate that turns red.

**This packet depends on three others and is depended on by none.** That makes it the easiest to
postpone indefinitely — and postponing it is how the previous refactor ended up stranded in the first
place.
<!-- /ANCHOR:limitations -->
