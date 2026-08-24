---
title: "Phase C tasks — attachments README ledger"
description: "Read, write, and verify the attachments folder README. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/003-attachments-readme"
    last_updated_at: "2026-08-24T19:46:24.715Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "README written and checked against the code."
    next_safe_action: "Proceed to 004-folder-ownership-map."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Read the eight `src/attachments` files and trace their call graph. [evidence: exports and roles noted for `attachment-service`, `-types`, `-limits`, `-decoder`, `-normalizer`, `pi-image-bridge`, `-transcript-projector`, `-reaper`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Write `src/attachments/README.md`: purpose, decode→reap flow, per-file ownership table. [evidence: `src/attachments/README.md` written with a flow diagram and an 8-row ownership table]
- [x] **T2.2** Add the decode-vs-normalize security boundary and a starting-point guide for common changes. [evidence: `README.md` sections "Why decode and normalize are separate" and "Where to start for a common change"]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Verify each named file and flow step against the actual source. [evidence: each role checked against the file's `// MODULE:` header and exports]
- [x] **T3.2** Confirm the only change under `app-relay/src` is the new README. [evidence: `git status` under `src/` shows `attachment-service`-family unchanged; only `attachments/README.md` added]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The README names all eight files accurately, its flow matches the service call order, and no code changed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the read/write/verify approach.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
