---
title: "Phase 1 tasks — skill @ds retirement ledger"
description: "Map the skill's @ds footprint, rewrite the comment references and strip @ds authoring, then verify reference integrity and the router bijection and land via the Public worktree. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T20:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All tasks done; skill retired @ds and landed as v1.7.0.0."
    next_safe_action: "None — phase 1 complete."
    blockers: []
    completion_pct: 100
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

- [x] **T1.1** Enumerate every live `@ds` citation in the skill, split into rewrite / keep-history / restate-in-prose. [evidence: `24` skill files named `@ds`; historical `changelog/v*.md` kept, the rest rewritten]
- [x] **T1.2** Read the `cli-codex` SKILL.md and compose the luna dispatch prompt with the convention and the greppable do-not-edit decision. [evidence: `cli-codex` v1.8.0.0 read; brief bound `gpt-5.6-luna` xhigh, `service_tier=fast`, autonomous-child Gate-3 suppression]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Rewrite `comment-grammar.md` as the single convention source (banners kept; module header, markup labels, per-part purpose lines, greppable do-not-edit note). [evidence: `comment-grammar.md` rewritten; the only remaining `@ds` is its migration note on line 23]
- [x] **T2.2** Retire `ds-grammar.md` and repoint every RESOURCE_MAP / router / trigger-phrase citation; restate `editability-guardrails.md` around the greppable marker. [evidence: `ds-grammar.md` deleted; `0` dangling references after leaf-manifest + hub-keyword regen]
- [x] **T2.3** Strip `@ds` authoring from every live reference and `assets/*-checklist.md`; keep design-system semantics as prose. [evidence: `23` files modified across references + assets + manual-testing routes]
- [x] **T2.4** Update `SKILL.md` §2b RESOURCE_MAP + §3b conventions and `README.md`; add the changelog entry and bump the version. [evidence: `SKILL.md`, `README.md`, hub `ROUTER.md` updated; `changelog/v1.7.0.0.md` added]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** `scan-skill-references` / reference integrity across every touched reference. [evidence: `0` dangling `ds-grammar.md` references; leaf-manifest regenerated via `ci-skill-root-metadata.cjs --fix` — `13/13` pass]
- [x] **T3.2** Router-sync bijection green (leaf §2b == hub `ROUTER.md` §11 re-prefixed union). [evidence: `sk-code-router-sync.vitest.ts` — `10/10` tests pass]
- [x] **T3.3** `run-all-drift-guards.sh` packet-scoped delta for `/skills/sk-code/` is 0; the skill loads. [evidence: alignment-drift entries touching `/skills/sk-code/` = `0`; only the known `specs/system-speckit` backlog fails]
- [x] **T3.4** Land via the isolated Public worktree with the pre-push gates. [evidence: `1a8c5aab28..2a7f1d0070` on `skilled/v4.0.0.0`; pre-push metadata gate `13/13`, worktree removed]
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
