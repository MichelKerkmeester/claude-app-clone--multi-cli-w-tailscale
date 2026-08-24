---
title: "Phase D checklist — folder ownership map barrier"
description: "Barrier sign-off for completing the src folder ownership map: all 16 folders mapped with an accurate reason to change, the four missing folders added, and no code changed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/004-folder-ownership-map"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; map completed to 16 folders, no code touched."
    next_safe_action: "None — the relay source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. The map is proven by
checking each folder row against the folder's real contents and dependency edges.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P1] The 16 `src/` folders were read and the four the old map omitted confirmed before writing. [evidence: `ask-question`, `attachments`, `commands`, `runtime` found absent from the old `## 3` tree; `16` folders read]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The map lists all 16 `src/` folders with what each owns and its reason to change. [evidence: `## 5. WHERE A CHANGE GOES` table has `16` rows]
- [x] **CHK-CQ-02** [P0] The four folders the old map omitted are now present everywhere. [evidence: `ask-question`, `attachments`, `commands`, `runtime` added to the topology, directory tree, dependency direction and routing table; overview says "Sixteen"]
- [x] **CHK-CQ-03** [P1] The four folders' dependency edges match their real imports. [evidence: edges from `from '../<x>/'` — `ask-question` → auth/replay/store, `attachments` → auth, `commands` → rpc/store, `runtime` → rpc/store]
- [x] **CHK-CQ-04** [P1] The `attachments` row links to its phase-C README rather than repeating it. [evidence: routing table links `./attachments/README.md`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P1] The app-relay suite is unaffected by this doc-only phase. [evidence: `vitest run tests` 46 files / 307 tests passed at the packet-wide final run]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P1] The existing zone-map and dependency-direction content is preserved, not rewritten. [evidence: `src/README.md` sections `1`–`4` and `7`–`10` kept; only the count fixed, four folders added, and the routing section inserted]
- [x] **CHK-FIX-02** [P2] A reader can route a common change (a new auth rule, a new RPC frame, a store migration) from the map. [evidence: the routing table's reason-to-change column names each]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] No code, comment or behaviour changed — the only change under `src/` is `README.md`. [evidence: `git diff` under `src/` touches only `README.md` and the phase-C `attachments/README.md`; no `.ts` changed]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
- [x] **CHK-DOC-02** [P1] The README section numbering stays consistent after inserting the new section. [evidence: `src/README.md` sections renumber `1`–`10`, no duplicates or gaps]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The map is one document (`src/README.md`), not sixteen per-folder READMEs. [evidence: only `attachments` earns its own README; the other 15 folders are rows in `src/README.md`]
- [x] **CHK-ORG-02** [P2] The map links `attachments` to its own README rather than duplicating it. [evidence: routing table and directory tree link `./attachments/README.md`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The stale twelve-folder zone map is completed to all sixteen folders with a reason-to-change table, the
four missing folders added to the topology and dependency direction, and no code touched.
<!-- /ANCHOR:summary -->
