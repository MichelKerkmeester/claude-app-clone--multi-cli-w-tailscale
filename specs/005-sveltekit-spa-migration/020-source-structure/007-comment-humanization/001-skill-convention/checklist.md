---
title: "Phase 1 checklist — skill @ds retirement barrier"
description: "Barrier sign-off for retiring @ds from the surface skill and teaching the natural convention: no live @ds authoring taught, reference integrity broken:0, router-sync bijection green, drift-guard packet delta 0, the frozen-seam contract preserved as a greppable do-not-edit note, skill loads, changelog + version bump, landed on Public skilled/v4.0.0.0."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T19:25:28.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Barrier scoped; awaiting execution and verification."
    next_safe_action: "Dispatch luna to rewrite the skill, then verify the barrier."
    blockers: []
    completion_pct: 0
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

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] No live reference or asset instructs `@ds` authoring; `grep -rl '@ds' <skill>` returns only historical `changelog/v*.md` (and restated design-system semantics).
- [ ] **CHK-CQ-02** [P0] `comment-grammar.md` is the single convention source; banners kept; module header, markup labels, per-part purpose lines documented.
- [ ] **CHK-CQ-03** [P0] `ds-grammar.md` retired with every RESOURCE_MAP / router / trigger-phrase citation repointed — no dangling reference.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] The frozen-seam contract is preserved: `editability-guardrails.md` defines a natural, greppable do-not-edit note and states phase 2 re-anchors `scan-comments` onto it so the fence count is not lost.
- [ ] **CHK-SEC-02** [P0] Nothing under `specs/context/**` or any app source is touched; the change is confined to the skill.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] `scan-skill-references.mjs` broken:0 across every touched reference.
- [ ] **CHK-TEST-02** [P0] Router-sync bijection green and the packet-scoped drift-guard delta for `/skills/sk-code/` is 0.
- [ ] **CHK-TEST-03** [P1] The skill loads; front matter and RESOURCE_MAP parse.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] A version changelog entry records the retirement and the new convention.
- [ ] **CHK-DOC-02** [P1] `validate.sh <packet> --strict` exit 0 via realpath.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] Landed on Public `skilled/v4.0.0.0` via an isolated worktree with the three pre-push gates; the worktree removed on completion.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

_Pending execution._ The skill will teach the natural convention with no live `@ds` authoring, reference
integrity and the router bijection green, the frozen-seam contract preserved as a greppable do-not-edit
note, and the change landed on Public `skilled/v4.0.0.0` with a version changelog.
<!-- /ANCHOR:summary -->
