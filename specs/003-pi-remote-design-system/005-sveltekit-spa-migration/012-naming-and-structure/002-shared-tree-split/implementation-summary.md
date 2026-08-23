---
title: "Child 012/002 implementation summary — shared tree split"
description: "Twenty-eight modules redistributed into seven folders from the manifest, and the four ways a specifier rewrite can be silently partial, each found by grep rather than by the build."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T17:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "shared/data dissolved into seven folders; 287 specifiers rewritten."
    next_safe_action: "Run child 003 for the feature folders and the tooling catch-up."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 012/002 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 2 |
| Status | **Shipped** |
| Requirements shipped | REQ-001 … REQ-007 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

`shared/data/` no longer exists. Its twenty-eight modules sit in seven folders named for what makes
them change: `transport/` for the wire contract, `state/` for the reducers, `commands/` for slash
handling, `catalog/` for the model catalog, `format/` for presentation helpers, `viewport/`, and
`fixtures/` for the demo data that ships to stories rather than to users.

Two hundred and eighty-seven specifiers across a hundred and sixty-one files were rewritten from the
manifest built in child 001. Not one was edited by hand.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

One commit carrying the moves, the generated rewrite and a green board together.

The first four runs were partial, and the packet predicted why: the gate here is the existence check
and the specifier grep, not the build. Each gap was found by grepping for the old path, and each
would have failed differently:

| Gap | How it would have failed |
|---|---|
| `vi.mock('…')` names a module by path but is a call, not an import | The double stops replacing anything and the suite passes against the real module — silent |
| `new URL('./x.worker.ts', import.meta.url)` addresses a worker | Nothing fails at build time; the worker is unreachable when constructed |
| The logic suites are `.tsx`, which the scan's extension list omitted | Nine imports never visited |
| A relay integration test imports a client reducer by deep-relative path | The suite fails to collect — the loud one, and the only one the build caught |

All four are now encoded in the applier with the reason, because child 003 moves roughly a hundred
more files and both workers.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The scan roots are every tree that can name a module**, not the tree being renamed. Scoping the
scan to the moving files is the mistake that looks like a shortcut; the relay test proved it.

**The folder documentation moved up rather than being deleted.** `README.md` and `CODE.md` describe
the shared layer and now sit at `shared/`. Packet 014 replaces them with per-folder documentation;
deleting authored content to satisfy a folder-removal requirement would have been the wrong trade.

**`fixtures/` is separate from every runtime folder.** `demo.ts` ships to stories, not to users, and
that distinction should be visible from the directory listing rather than by opening the file.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `shared/data/` removed | PASS — the directory does not exist; seven new folders in its place |
| Old-path grep, code | PASS — zero non-comment references to `shared/data/` remain |
| `npm run typecheck` | PASS — exit 0, 1123 files, 0 errors |
| `npm run build` | PASS — exit 0 |
| `npm run test:web` | PASS — exit 0, 66/532 and 16/188, both summaries present |
| Backend, four real directories | PASS — exit 0, 51 files / 384 tests |
| Token identity, three themes | PASS — 0 CHANGED / 0 VANISHED / 0 ADDED over 96 components plus `app.css` |
| `@ds guardrail:` fences | PASS — 201 in source and 277 including documentation, identical before and after |
| Worker resolution | PASS — neither worker is in this child's scope; both remain under `pages/chat/`, and the applier now rewrites their URL form |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Ten documentation files and eight story-file comments still name `$shared/data/…` in prose.** They
are references in comments rather than specifiers, so nothing resolves them and nothing breaks — but
they now point at a folder that does not exist. Packets 013 and 014 own that text.

**The two folder documents at `shared/` describe a tree that has been split.** They are accurate
about the layer and stale about its shape until 014 rewrites them per folder.
<!-- /ANCHOR:limitations -->
