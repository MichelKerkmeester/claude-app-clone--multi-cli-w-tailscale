---
title: "Child 012/001 implementation summary — grammar and manifest"
description: "The manifest and its applier exist as tooling, and the grammar is proven on the two smallest folders where every mechanical failure mode is present."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T17:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Manifest, applier and scan built; primitives and chrome moved and green."
    next_safe_action: "Run child 002 against the manifest for the shared data tree."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 012/001 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 2 |
| Status | **Shipped** |
| Requirements shipped | REQ-001 … REQ-008 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

**The grammar as executable rules.** `scripts/naming/naming-rules.mjs` is the single place the
naming grammar exists: kebab-case conversion that keeps a suffix chain intact, the SvelteKit
reserved-name guard, the route-parameter guard, and the whole-path case-change detector. Fourteen
cases were checked against it before anything moved, including `.svelte.ts`, a leading-digit stem and
`+page.svelte`.

**The manifest as data.** 219 rows, one per in-scope file, reconciled against a fresh count of the
tree. 209 move, 14 of them by case alone, and no two rows target the same path.

**The applier, generated from the manifest.** It moves the files and rewrites the specifiers that
point at them from the same source, so the two cannot drift apart. A whole-path case change goes
through a temporary name.

**The completeness scan.** Reports every file whose name does not match the grammar. Both folders in
this child report zero; 162 remain across the tree for the two children that follow.

**Two batches moved.** `shared/primitives/` — 18 files into six folders named for what they control,
66 specifiers rewritten across 39 files. `shared/chrome/` — 10 files kebab-cased in place, 13
specifiers across 11 files, including the two renames that differ only by case.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Tooling first, then one batch per commit, each carrying its moves, its generated rewrite and a green
build together. No specifier was edited by hand at any point.

The first dry run was wrong in two ways, and both were found by reading the diff rather than by the
build: a relative import inside a file that had just moved was being resolved against the folder it
landed in rather than the folder it was written in, and a runes module spelled `foo.svelte.js` in a
specifier did not reduce to the same key as `foo.svelte.ts` on disk. Both are recorded in the rules
with the reason, because both would have reappeared at 148 files.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The manifest is generated, not typed.** A hand-written manifest is a second place the grammar
lives. The builder derives every row from the tree plus the recorded taxonomy, so a file added
tomorrow appears in the manifest without anyone remembering to add it.

**Kind assignment for the feature folders is an overlay, not a manifest edit.** The later child
supplies `scripts/naming/kind-prefixes.json` as data; it never edits manifest rows. That keeps the
rule that children consume the manifest rather than extending it by hand.

**The route tree is excluded twice.** By directory, and by a reserved-name rule applied per file.
The directory exclusion alone would be an accident rather than a guarantee.

**Folder documentation stayed put.** `CODE.md` and `README.md` remain at `shared/primitives/`;
placing them is packet 014's job, and moving them here would pre-empt a decision this child does not
own.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Naming rules | PASS — 14 of 14 cases, including `.svelte.ts`, `F6ViewerAdapter` and `+page.svelte` |
| Manifest reconciled against disk | PASS — 219 rows, 219 files, 0 collisions |
| Dry-run diff read before moving | PASS — the two rewriter defects above were found this way |
| `npm run typecheck` | PASS — exit 0, 0 errors, after each batch |
| `npm run build` | PASS — exit 0, after each batch |
| `npm run test:web` | PASS — exit 0, 66/532 and 16/188, unchanged by the moves |
| Case-only renames recorded by git | PASS — 10 renames staged, 0 adds, 0 deletes |
| `git log --follow` on three renamed files | PASS — each reaches its pre-rename history |
| No file directly under `shared/primitives/` | PASS — six folders and two documentation files |
| Reserved-name guard | PASS — all 5 route files guarded by name, independently of the directory exclusion |
| Scan, this child's scope | PASS — 0 offenders in `primitives/` and `chrome/` |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The kind-prefix overlay is empty.** Every row outside `shared/` currently targets a plain
kebab-case name. The closed kind list is recorded, but assigning a kind to roughly a hundred feature
components is child 003's judgement and cannot be derived from a filename.

**162 files still fail the scan**, which is the correct state: they belong to the two children that
follow, and the scan is what will tell those children when they are done.

**The applier rewrites specifiers, not identifiers.** An import name stays whatever the importing
file chose, which is deliberate — the identifier is picked at the import site — but it means a
component's local name and its filename can disagree, and nothing here detects that.
<!-- /ANCHOR:limitations -->
