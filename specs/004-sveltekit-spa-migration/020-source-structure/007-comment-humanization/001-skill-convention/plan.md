---
title: "Phase 1 plan — retire @ds in the surface skill, teach the natural convention"
description: "Rewrite the skill's comment-convention teaching off @ds and onto the natural human-voice convention, then land it via the Public worktree flow. comment-grammar.md becomes the single source (banners kept; module header, markup labels, per-part purpose lines, greppable do-not-edit note); ds-grammar.md is retired and repointed; editability-guardrails.md restates the frozen-seam contract around the greppable marker; every live reference and asset that instructs @ds authoring is updated. Proven by scan-skill-references broken:0, the router-sync bijection, a packet-scoped drift-guard delta of 0, and the skill loading."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "skill convention plan approach"
  - "skill convention packet"
  - "plan approach"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T20:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scoped; the skill's @ds footprint mapped for retirement."
    next_safe_action: "Rewrite comment-grammar.md and retire ds-grammar.md; land via Public worktree."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Update the `sk-code-mobile-cli` surface skill so it teaches the natural human-voice comment convention and
instructs `@ds` authoring nowhere. The executor is luna 5.6 (gpt-5.6-luna) at xhigh via `cli-codex`,
editing inside an isolated Public worktree; Claude owns the barrier verification and the push. The change
is docs-only within the skill and lands on Public `skilled/v4.0.0.0`.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

`scan-skill-references.mjs` is broken:0 across every touched reference; the leaf §2b RESOURCE_MAP and the
hub `ROUTER.md` §11 stay an exact re-prefixed union (router-sync bijection green); the packet-scoped
`run-all-drift-guards.sh` delta for `/skills/sk-code/` is 0; a `grep -rl '@ds'` over the skill returns only
the historical `changelog/v*.md` (and any retained design-system semantic references restated in prose);
the skill loads; a version changelog entry exists.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

`comment-grammar.md` becomes the single source for the convention: the `MODULE:` banner and the numbered
box-drawing section banners stay; on top of them sit the module-script header, the `<!-- section -->`
markup labels, and a one-line human-voice purpose comment per function, effect and rule. The `@ds` seam
markers are removed from the grammar. `ds-grammar.md` is retired — its still-useful content (the four edit
classes, how to read a seam) folds into `comment-grammar.md` and `editability-guardrails.md`, and every
RESOURCE_MAP / router / trigger-phrase citation of it is repointed.

The frozen-seam contract is the load-bearing part. `editability-guardrails.md` restates it around a
natural, consistent, greppable do-not-edit note ("Do not edit — <why>") instead of `@ds guardrail:`. The
note keeps the enumerable safety property the a11y/security/logic seams depend on; phase 2 re-anchors the
`scan-comments` fence counter onto it so the count is preserved, not dropped. Every other reference and
asset that currently instructs an author to write an `@ds` marker is edited to teach the natural form.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · map
Enumerate every live `@ds` citation in the skill (`grep -rl '@ds'`), separating comment-convention teaching
(to rewrite) from historical changelog mentions (to keep) and design-system semantic references (to
restate in prose).

### Phase 2 · rewrite
Rewrite `comment-grammar.md`, `editability-guardrails.md`; retire `ds-grammar.md` and repoint its
citations; strip `@ds` authoring from every live reference and `assets/*-checklist.md`; update `SKILL.md`
§2b RESOURCE_MAP + §3b conventions and `README.md`; add the changelog entry and bump the version.

### Phase 3 · verification + land
Run `scan-skill-references`, the router-sync bijection, and the packet-scoped drift guards; confirm the
skill loads. Land via an isolated Public worktree (`worktree-naming.sh create`), the three pre-push gates,
and `SPECKIT_ALLOW_REMOTE_PUSH=1` — never staged in the shared checkout.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Docs-only: no unit tests. The reference-integrity scan proves no dangling path, the router-sync vitest
proves the leaf/hub bijection, and the drift guards prove no repo-wide regression was introduced. A skill
load confirms the front matter and RESOURCE_MAP still parse.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The Public monorepo skill `sk-code/sk-code-mobile-cli` and the hub `sk-code` ROUTER.md.
- The `cli-codex` dispatch skill (read its SKILL.md before composing the luna prompt).
- The Public worktree landing flow and the drift-guard recipe from [[public-cross-repo-skill-landing-flow]].
- The approved `screen-chat.svelte` pilot as the worked example the convention documents.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change is confined to the skill under Public `skilled/v4.0.0.0`. The worktree is removed on completion;
if the landed commit regresses, `git revert` on `skilled/v4.0.0.0` restores the prior skill. No app source
or data is touched in this phase.
<!-- /ANCHOR:rollback -->
