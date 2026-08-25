---
title: "Phase 1 tasks — skill @ds retirement ledger"
description: "Map the skill's @ds footprint, rewrite the comment references and strip @ds authoring, then verify reference integrity and the router bijection and land via the Public worktree. Each task carries its evidence inline on completion."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T19:25:28.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Task ledger scoped; awaiting the luna dispatch."
    next_safe_action: "Run T1.1 — enumerate the live @ds citations in the skill."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Enumerate every live `@ds` citation in the skill, split into rewrite / keep-history / restate-in-prose.
- [ ] **T1.2** Read the `cli-codex` SKILL.md and compose the luna dispatch prompt with the convention and the greppable do-not-edit decision.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** Rewrite `comment-grammar.md` as the single convention source (banners kept; module header, markup labels, per-part purpose lines, greppable do-not-edit note).
- [ ] **T2.2** Retire `ds-grammar.md` and repoint every RESOURCE_MAP / router / trigger-phrase citation; restate `editability-guardrails.md` around the greppable marker.
- [ ] **T2.3** Strip `@ds` authoring from every live reference and `assets/*-checklist.md`; keep design-system semantics as prose.
- [ ] **T2.4** Update `SKILL.md` §2b RESOURCE_MAP + §3b conventions and `README.md`; add the changelog entry and bump the version.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** `scan-skill-references.mjs` broken:0 across every touched reference.
- [ ] **T3.2** Router-sync bijection green (leaf §2b == hub `ROUTER.md` §11 re-prefixed union).
- [ ] **T3.3** `run-all-drift-guards.sh` packet-scoped delta for `/skills/sk-code/` is 0; the skill loads.
- [ ] **T3.4** Land via the isolated Public worktree with the three pre-push gates; `validate.sh --strict` exit 0 via realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The skill teaches the natural convention and instructs `@ds` authoring nowhere, reference integrity and the
router bijection hold, the drift-guard packet delta is 0, and the change is landed on Public
`skilled/v4.0.0.0` with a version changelog.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the rewrite architecture and the landing flow.
- `checklist.md` — the barrier sign-off.
<!-- /ANCHOR:cross-refs -->
