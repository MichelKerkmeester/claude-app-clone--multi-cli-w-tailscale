---
title: "Phase F tasks — root folder docs ledger"
description: "Read, write, and verify the four missing folder READMEs. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/006-root-folder-docs"
    last_updated_at: "2026-08-24T21:41:28.315Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Four READMEs written and checked against the folders."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Read the `inbound-media` and `plan` extensions' `src` and package.json. [evidence: package names `@pi-remote/inbound-media-extension` and `@pi-remote/plan-extension` and entry points read]
- [x] **T1.2** List the children of `packages` and `extensions` for the container maps. [evidence: `packages/pi-rpc-protocol`; `extensions/` has `pi-remote-approval`, `pi-remote-inbound-media`, `pi-remote-plan`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Write `extensions/pi-remote-inbound-media/README.md` and `extensions/pi-remote-plan/README.md` following the `pi-remote-approval` pattern. [evidence: both READMEs written with package, purpose and entry point drawn from source]
- [x] **T2.2** Write `extensions/README.md` and `packages/README.md` container maps linking their children's READMEs. [evidence: `extensions/README.md` maps 3 extensions; `packages/README.md` links `pi-rpc-protocol`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Verify each README's package name, entry point and behaviour against the source. [evidence: names checked against each `package.json`; behaviour against each `src`]
- [x] **T3.2** Confirm the only changes under `packages`/`extensions` are the four new READMEs. [evidence: `git status` shows four added `README.md` files and no modified code]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The four READMEs exist and describe their real folders, every root code folder is reachable from a
README, and no code changed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the read/write/verify approach.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
