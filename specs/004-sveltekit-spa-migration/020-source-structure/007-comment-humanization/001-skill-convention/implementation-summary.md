---
title: "Phase 1 implementation summary — @ds retired in the surface skill"
description: "The sk-code-mobile-cli surface skill was moved off the @ds grammar onto the natural human-voice comment convention and landed on Public skilled/v4.0.0.0 as v1.7.0.0. comment-grammar.md became the single convention source, editability-guardrails.md was restated around the greppable do-not-edit note, ds-grammar.md was deleted and every citation repointed, and @ds authoring was stripped from all live references and assets. Proven by the router-sync bijection (10/10), a packet-scoped alignment-drift delta of 0, a fresh leaf-manifest, and only the intended migration note still naming @ds."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "skill convention implementation summary"
  - "skill convention packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/001-skill-convention"
    last_updated_at: "2026-08-25T20:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Skill @ds retired via luna; verified and landed as v1.7.0.0 on skilled/v4.0.0.0."
    next_safe_action: "None — phase 1 complete; phase 2 applies the convention to the source."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-comment-humanization` |
| Level | 2 |
| Status | Complete |
| Landed | Public `skilled/v4.0.0.0` @ `2a7f1d0070` (skill v1.7.0.0) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The `sk-code-mobile-cli` surface skill now teaches the natural human-voice comment convention and instructs
`@ds` authoring nowhere. `comment-grammar.md` is the single convention source (banners kept; module header,
markup labels, per-part purpose lines, the greppable do-not-edit note); `editability-guardrails.md` restates
the frozen-seam contract around that note; `ds-grammar.md` is deleted with every citation repointed; and
`@ds` authoring is stripped from all live references and assets. `SKILL.md`, `README.md`, and the hub
`ROUTER.md` were updated, the leaf-manifest and hub keywords regenerated, and a `v1.7.0.0` changelog added.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The edits were dispatched to luna 5.6 (gpt-5.6-luna) at xhigh via `cli-codex`, editing inside an isolated
Public worktree; Claude owned the verification and the landing. luna's first run halted on the framework's
Gate-3 documentation prompt and made no edits; the fix was an explicit autonomous-child directive plus
inheriting the suppression env into codex, after which the run completed. Claude then verified independently
(the finding-is-a-hypothesis rule), regenerated the two generator-owned artifacts luna correctly left alone
(`leaf-manifest.json` via `ci-skill-root-metadata.cjs --fix`, and the stale `ds-grammar` keyword in the hub
`description.json`), committed the change, and pushed it to `skilled/v4.0.0.0` through the pre-push gates.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Keep the frozen-seam net greppable.** `@ds guardrail: do-not-edit` was a searchable enumeration of frozen
a11y/security/logic seams that `scan-comments` counts. Rather than dissolve it into free-form prose, the
retirement replaces it with a consistent natural note that begins `Do not edit — <why>`, which reads as
human voice yet stays greppable; phase 2 re-anchors the fence counter onto it so the count is preserved.

**Claude owns the generator-owned artifacts.** luna was told not to touch `leaf-manifest.json` (a generated
file), so it flagged the manifest stale instead of hand-editing it. Claude regenerated it with the fleet
audit tool, keeping the leaf/hub bijection intact.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Files changed | `23` modified + `ds-grammar.md` deleted + `changelog/v1.7.0.0.md` added |
| `@ds` still teaching (excl. changelog) | `1` — the intended migration note in `comment-grammar.md` |
| Dangling `ds-grammar.md` references | `0` after leaf-manifest regen + hub keyword removal |
| Router-sync bijection | PASS — `10/10` (leaf §2b == hub `ROUTER.md` §11 re-prefixed union) |
| Alignment-drift packet delta | `0` for `/skills/sk-code/` (only the known repo-wide backlog fails) |
| `git diff --check` | clean |
| Landed | `1a8c5aab28..2a7f1d0070` on `skilled/v4.0.0.0`, pre-push gates `13/13` |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The routing file `manual-testing-playbook/ds-grammar-routing.md` keeps its old name (its content was updated
and its reference is valid); renaming it to a convention-neutral name is a cosmetic follow-up for phase 3.
The frozen-seam count is not yet re-anchored in the app gate — that is phase 2's job, when the source
`@ds guardrail` markers become the greppable do-not-edit note.
<!-- /ANCHOR:limitations -->
