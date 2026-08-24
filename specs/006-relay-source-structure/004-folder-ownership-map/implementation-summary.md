---
title: "Phase D implementation summary — folder ownership map"
description: "Completed app-relay/src/README.md: the stale twelve-folder zone map now covers all sixteen folders, the four missing ones (ask-question, attachments, commands, runtime) were added to the topology and dependency direction, and a reason-to-change table routes a change to the folder that owns it. No code touched."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/004-folder-ownership-map"
    last_updated_at: "2026-08-24T21:41:27.664Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Map completed to 16 folders with a reason-to-change table; only README changed."
    next_safe_action: "Proceed to 005-root-source-banners."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-004 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The `app-relay/src/README.md` folder map, completed. It already carried a zone map and dependency-
direction diagram, but it was stale: it named "twelve folders" and omitted four that now exist. The map
now covers all sixteen folders, and a new "Where a change goes" table gives, for each folder, what it
owns and the kind of change that lands there — so a maintainer routes a change to the right folder from
one table. `attachments` links to its own phase-C README rather than repeating it.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The four missing folders — `ask-question`, `attachments`, `commands`, `runtime` — were added to the
overview count, the package topology tree, the directory-tree ownership table, and the allowed
dependency direction. Their dependency edges were taken from their real imports: `ask-question` → auth,
replay, store; `attachments` → auth; `commands` → rpc, store; `runtime` → rpc, store; and the
`index.ts`, `http/` and `prompt/` consumer lines were extended to name them. The existing zone-map
content was preserved; only the folder count, the four additions, and the new routing section changed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Complete the existing map, do not replace it.** `src/README.md` already had a good dependency-direction
story for the twelve folders it knew. The stale part was the missing four and the absent reason-to-change
routing, so the change is additive: fix the count, add the four, add the table, keep the rest.

**One map, not sixteen READMEs.** Most folders are small and earn a single row. Only `attachments`, the
eight-file subsystem, earns its own document; the map links to it. This matches the web client's "a code
map only where the folder earns one" philosophy.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| All 16 folders in the routing table | Yes — 16 rows |
| Four missing folders added everywhere | Yes — topology, directory tree, dependency direction, routing table; overview says sixteen |
| Dependency edges match real imports | Yes — derived from each folder's `from '../<x>/'` imports |
| Scope: only `README.md` changed under `src/` | Yes — plus the phase-C `attachments/README.md`; no code or comment change |
| Section numbering | 1–10, no duplicates or gaps |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The dependency-direction section lists each folder's primary edges, not the complete import graph — it is
a curated "allowed direction" summary, as it was before. Type-only cross-imports (for example store
reading attachment types) are not elevated to edges, to keep the inward-flow story legible.
<!-- /ANCHOR:limitations -->
