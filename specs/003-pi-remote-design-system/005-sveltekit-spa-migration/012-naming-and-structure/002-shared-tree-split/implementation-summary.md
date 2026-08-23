---
title: "Child 002 implementation summary — shared tree split"
description: "Continuity anchor. Nothing is implemented yet: this records the measured contents of shared/data and why the build is the wrong gate for this child."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from the shared/data inventory; no files moved."
    next_safe_action: "Wait for child 001's manifest."
    blockers: ["depends on the manifest from child 001"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 2 |
| Status | **Scoped, not started** — blocked on child 001's manifest |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing has moved. The measured starting state:

| Measurement | Count |
|---|---|
| Source files in `app-mobile/src/shared/data/` | 28 |
| Responsibilities they span | 6, plus fixtures |
| camelCase modules among them, renaming in the same move | 10 |
| Target folders | 7 — `transport/`, `state/`, `commands/`, `catalog/`, `format/`, `viewport/`, `fixtures/` |
| Deep-relative (`../../`) specifiers outside the alias | 2 |
| Worker files referenced by URL construction, not only by import | 2 — `highlight.worker.ts`, `attachment-hash.worker.ts` |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

One commit: the moves, the ten renames, the generated specifier rewrite and a green build. The
executor performs the moves; Claude owns verification and git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**One commit, not seven.** A half-emptied `shared/data/` compiles, runs and passes every suite, while
teaching two naming rules at once. Putting the whole split in a single commit removes that state from
the space of possible outcomes.

**The camelCase renames ride along.** Ten of the twenty-eight are camelCase today. Renaming them in
the same move halves the specifier churn on the most-imported folder in the app.

**`fixtures/` is its own folder** even though it holds one file, because `demo.ts` ships to stories
rather than to users, and that boundary should be visible without opening anything.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `shared/data/` removed | not done |
| Workspace grep for `$shared/data/` | not run |
| `npm run build` | not run |
| `npm run typecheck` | not run |
| `npm run test:web` | not run |
| Backend suite against the four real test dirs | not run |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The build cannot detect this child's failure mode.** A partial split type-checks and passes the
suites. Only the existence check and the specifier grep tell a finished split from an abandoned one.

**A grep over imports says nothing about the workers.** They are constructed by URL, so their
resolution has to be confirmed a different way.

**The taxonomy is a prediction.** `state/` and `transport/` change together often enough that one
`session/` folder was genuinely arguable. It was put to the operator and rejected: the wire contract
and the reducers change for different reasons, and merging them would hide two triggers behind one
name. That is a judgement about the future, and judgements about the future age.
<!-- /ANCHOR:limitations -->
