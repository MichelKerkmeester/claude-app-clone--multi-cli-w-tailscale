---
title: "Phase 1 checklist — skill @ds retirement barrier"
description: "Barrier sign-off for retiring @ds from the surface skill and teaching the natural convention: no live @ds authoring taught, reference integrity clean, router-sync bijection green, drift-guard packet delta 0, the frozen-seam contract preserved as a greppable do-not-edit note, skill loads, changelog + version bump, landed on Public skilled/v4.0.0.0."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T20:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Barrier proven; skill retired @ds, bijection 10/10, landed v1.7.0.0."
    next_safe_action: "None — phase 1 complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A docs-only skill change
is proven by a reference-integrity scan, the router-sync bijection, the drift guards, and a skill load —
not by a line diff. The frozen-seam contract is the load-bearing item and gets its own barrier.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The skill's `@ds` footprint is enumerated before any edit. [evidence: `24` skill files named `@ds`; split into rewrite / keep-history / restate-in-prose]
- [x] **CHK-PRE-02** [P0] The `cli-codex` contract is read and the luna brief bound with Gate-3 suppression. [evidence: `cli-codex` v1.8.0.0 read; `gpt-5.6-luna` xhigh, autonomous-child directive + env inheritance]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] No live reference or asset instructs `@ds` authoring; the only remaining `@ds` is the intended migration note. [evidence: `grep -rn '@ds' <skill> --include='*.md' | grep -v changelog/v` = `1` line, `comment-grammar.md:23`]
- [x] **CHK-CQ-02** [P0] `comment-grammar.md` is the single convention source; banners kept; module header, markup labels, per-part purpose lines documented. [evidence: `comment-grammar.md` rewritten around the natural convention]
- [x] **CHK-CQ-03** [P0] `ds-grammar.md` retired with every RESOURCE_MAP / router / trigger-phrase citation repointed — no dangling reference. [evidence: file deleted; `0` `ds-grammar.md` references in leaf-manifest / hub description.json / ROUTER.md]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Reference integrity clean across every touched reference. [evidence: leaf-manifest regen `13/13` pass; `0` dangling references]
- [x] **CHK-TEST-02** [P0] Router-sync bijection green and the packet-scoped drift-guard delta for `/skills/sk-code/` is 0. [evidence: `sk-code-router-sync.vitest.ts` `10/10`; alignment-drift `/skills/sk-code/` delta `0`]
- [x] **CHK-TEST-03** [P1] The skill loads; front matter and RESOURCE_MAP parse. [evidence: router-sync vitest parses the RESOURCE_MAP; `git diff --check` clean]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every `ds-grammar.md` citation is repointed; no dangling reference remains. [evidence: `0` dangling references after the leaf-manifest and hub-keyword regen]
- [x] **CHK-FIX-02** [P0] Generator-owned artifacts are regenerated, not hand-edited. [evidence: `leaf-manifest.json` via `ci-skill-root-metadata.cjs --fix` — `13/13` pass; the stale `ds-grammar` hub keyword removed]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] The frozen-seam contract is preserved: `editability-guardrails.md` defines the natural greppable do-not-edit note and states phase 2 re-anchors `scan-comments` onto it. [evidence: `editability-guardrails.md` restated around `Do not edit — <why>`]
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**` or any app source is touched; the change is confined to the skill. [evidence: all `26` worktree changes under `.opencode/skills/sk-code/`; `git status` scoped]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] A version changelog entry records the retirement and the new convention. [evidence: `changelog/v1.7.0.0.md` added]
- [x] **CHK-DOC-02** [P1] The change is landed with the pre-push gates. [evidence: `2a7f1d0070` on `skilled/v4.0.0.0`; pre-push metadata gate `13/13`]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Landed on Public `skilled/v4.0.0.0` via an isolated worktree with the pre-push gates; the worktree removed on completion. [evidence: worktree `034-sk-code-mobile-retire-ds` created, pushed, and removed]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The skill teaches the natural convention with no live `@ds` authoring — only the migration note remains.
Reference integrity is clean, the router-sync bijection is `10/10`, the frozen-seam contract is preserved as
the greppable `Do not edit — <why>` note, and the change is landed on Public `skilled/v4.0.0.0` as v1.7.0.0.
<!-- /ANCHOR:summary -->
