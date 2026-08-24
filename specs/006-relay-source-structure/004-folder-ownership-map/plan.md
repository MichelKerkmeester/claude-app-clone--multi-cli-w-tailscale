---
title: "Phase D plan — folder ownership map"
description: "How the reason-to-change map for the 16 src folders is completed and checked: read each folder, confirm the four the old map omitted and their real dependency edges, extend the existing src/README.md, then verify the only src change is that README."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/004-folder-ownership-map"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; ownership map completed to 16 folders."
    next_safe_action: "None — the relay source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Complete `app-relay/src/README.md`. It already carried a zone map and dependency-direction diagram, but
it was stale — it named "twelve folders" and omitted four that now exist. Add the four missing folders to
the topology and dependency direction, and add one reason-to-change table over all 16 folders. No code
changes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The map lists all 16 `src/` folders with an accurate reason to change; the four missing folders
(`ask-question`, `attachments`, `commands`, `runtime`) are added everywhere the map lists folders; their
dependency edges match their real imports; and the only change under `app-relay/src` is `README.md`,
confirmed by `git status`.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The change is additive, not a rewrite: the existing zone-map and dependency-direction content is good for
the folders it knew, so it is preserved. The stale parts are the four missing folders and the absent
reason-to-change routing. The four folders' edges are taken from their real imports — `ask-question` →
auth, replay, store; `attachments` → auth; `commands` → rpc, store; `runtime` → rpc, store — and their
consumers (`index.ts`, `http/`, `prompt/`) are extended to name them. One routing table then maps a
change to the folder that owns it, with `attachments` linking to its phase-C README.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · read
Read the 16 `src/` folders; confirm the four the old map omits and derive their dependency edges from
their imports.

### Phase 2 · extend
Fix the folder count, add the four folders to the topology, directory tree and dependency direction, and
add the reason-to-change table over all 16 folders.

### Phase 3 · verify
Confirm all 16 folders are mapped, the section numbering stays consistent, and the only src change is the
README.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Documentation-only, so the check is accuracy: each folder row is confirmed against the folder's real
contents and each new dependency edge against its imports. The app-relay suite is not expected to change
and is proven green by the packet-wide `vitest run tests` final run.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The 16 `app-relay/src/` folders and their imports (`from '../<x>/'`).
- Phase C, whose `attachments/README.md` the map links to.
- The existing `app-relay/src/README.md` zone map, preserved and extended.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change is confined to `app-relay/src/README.md`. `git checkout -- app-relay/src/README.md` restores
the prior map with no other effect.
<!-- /ANCHOR:rollback -->
