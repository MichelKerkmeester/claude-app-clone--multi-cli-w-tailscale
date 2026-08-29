---
title: "Phase D tasks — folder ownership map ledger"
description: "Read, extend, and verify the reason-to-change map for the 16 src folders. Each task carries its evidence inline."
trigger_phrases:
  - "folder ownership map task ledger"
  - "folder ownership map packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/004-folder-ownership-map"
    last_updated_at: "2026-08-24T21:41:27.664Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Map completed to 16 folders; only README changed."
    next_safe_action: "Proceed to 005-root-source-banners."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Read the 16 `src/` folders and note what each owns. [evidence: `// MODULE:` header read for the main file of each of the `16` folders]
- [x] **T1.2** Confirm the four folders the old map omitted and derive their dependency edges. [evidence: `ask-question`, `attachments`, `commands`, `runtime` absent from the old tree; edges from `from '../<x>/'` imports]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Fix the folder count and add the four folders to the topology, directory tree and dependency direction. [evidence: overview now reads "Sixteen folders"; `src/README.md` tree and `## 4. DIRECTORY TREE` gain the four rows]
- [x] **T2.2** Add the reason-to-change table over all 16 folders, linking `attachments` to its README. [evidence: `## 5. WHERE A CHANGE GOES` table — `16` rows; `attachments` links `./attachments/README.md`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Confirm the map lists all 16 folders with an accurate reason to change. [evidence: routing table has `16/16` folder rows]
- [x] **T3.2** Confirm section numbering stays consistent after inserting the new section. [evidence: `src/README.md` sections renumber `1`–`10`, no duplicates or gaps]
- [x] **T3.3** Confirm the only change under `app-relay/src` is `README.md`. [evidence: `git status` under `src/` shows only `README.md` (plus the phase-C `attachments/README.md`)]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All 16 folders are mapped with an accurate reason to change, the four missing folders are added
everywhere, and no code changed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the read/extend/verify approach.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
