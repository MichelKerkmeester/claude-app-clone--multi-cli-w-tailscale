---
title: "Child 008 checklist — surface-skill refactor sign-off"
description: "Sign-off for the sk-code-mobile-cli refactor, including the two items that keep it from being in force."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-23T10:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; two open items recorded."
    next_safe_action: "Update svelte-conventions.md to Format A, then merge the branch."
    blockers: []
    completion_pct: 90
---

# Verification Checklist: Child 008 — sk-code-mobile-cli React to Svelte refactor

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

A skill has no test suite. Its real correctness question — does a dispatch that loads this produce
correct output — is answerable only by a dry-run against the merged surface. Everything below is a
structural proxy, and this checklist says so rather than implying otherwise.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Hub contract read before editing. [evidence: sibling packet `004-sk-code-mobile-cli-mode` build strategy reviewed]
- [x] **CHK-PRE-02** [P0] Landing constraint established before any edit. [evidence: the shared Public checkout's index holds another session's staged files, so `git add` there is destructive]
- [x] **CHK-PRE-03** [P1] Changed-versus-carried split agreed up front. [evidence: `spec.md` REQ-003 fixes the split — framework medium changes; `token-library.md`, `component-tokens.md` and `theme-remap.md` carried verbatim]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Skill packages cleanly with no new warnings. [evidence: `package_skill.py --check` PASS — 12 pre-existing warnings, 0 new]
- [x] **CHK-CQ-02** [P0] Every changed document validates. [evidence: `validate_document.py` — 0 issues across 12 docs]
- [x] **CHK-CQ-03** [P1] Skill-root metadata regenerated so the pre-push gate passes. [evidence: `ci-skill-root-metadata.cjs` passed=13 failed=0 after regenerating `leaf-manifest.json`]
- [x] **CHK-CQ-04** [P1] Version bumped and changelogged rather than edited silently. [evidence: `SKILL.md` 1.1.0.0 to 1.2.0.0 with `changelog/v1.2.0.0.md`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] No React-stack instruction survives where it could misguide a dispatch. [evidence: residual-reference sweep — remaining `react-aria` mentions describe the swap itself]
- [x] **CHK-TEST-02** [P1] Packet validates under strict rules. [evidence: `validate.sh --strict` exit code 0 on this folder]
- [~] **CHK-TEST-03** [P0] No dry-run dispatch executed against the merged surface. [deferred: the branch is unmerged, so the only check that would prove the doctrine is correct rather than merely well-formed cannot run yet]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P1] Stale hardcoded fence count replaced with count-fresh guidance, so the doc cannot go stale again. [evidence: `editability-guardrails.md` no longer names a fixed number]
- [x] **CHK-FIX-02** [P1] Proven traps folded into the doctrine rather than left as tribal knowledge. [evidence: `svelte-conventions.md` covers the `$effect` self-invalidation trap, the `fileURLToPath` space-in-path bug and the virtualizer store API]
- [ ] **CHK-FIX-03** [P0] `svelte-conventions.md` still teaches the superseded compact divider form. [evidence needed: Format A is a `// ` prefix plus 67 box-drawing characters around a numbered label, and 007-EXT converted 45 files and 213 dividers to it]
- [ ] **CHK-FIX-04** [P0] Branch not merged into the live `skilled/v4.0.0.0`, so no workflow loads the refactor. [evidence needed: merge after CHK-FIX-03]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] The shared Public checkout was never staged or committed in. [evidence: 3/3 commits authored inside isolated worktrees — `5ad99cdc28`, `f9d840d649`, `2b7622c32d` — both worktrees removed afterwards]
- [x] **CHK-SEC-02** [P0] The five read-only research repos under `specs/context/` were never touched. [evidence: no `git add -A`, `git clean` or `stash -u` run in this packet]
- [x] **CHK-SEC-03** [P1] Branch name allocated rather than hand-picked. [evidence: `branches/008-sk-code-mobile-cli-svelte` issued by the sk-git allocator under lock]
- [x] **CHK-SEC-04** [P1] No token value or security-posture instruction edited. [evidence: `component-tokens.md` and `theme-remap.md` carried verbatim; only stale paths fixed]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] Svelte doctrine written into a new file rather than into shared ones. [evidence: `svelte-conventions.md` added; the symlinked `workflow-*.md` left untouched for `sk-code-webflow` and `sk-code-opencode`]
- [x] **CHK-DOC-02** [P1] Verification doctrine rewritten to the actual gate. [evidence: `verification.md` now describes the browser-free CSS-corpus resolver rather than React commands]
- [x] **CHK-DOC-03** [P2] Deviations from the spec's letter recorded rather than quietly absorbed. [evidence: one-pass authoring and the untouched shared workflows both documented]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Detection markers point at the real tree. [evidence: `app-mobile/`, `.svelte`, `*.svelte.ts`, `app.css`, `$shared/`]
- [x] **CHK-ORG-02** [P2] Framework-agnostic cores left in place rather than reorganised. [evidence: `token-library.md`, `component-tokens.md`, `theme-remap.md` keep their structure]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The refactor is authored, verified and pushed to a branch, and every structural gate is green.

It is not in force. Two items remain, and their order matters: `svelte-conventions.md` still teaches
the superseded compact divider form, and the branch is unmerged. Merging first would propagate the
wrong grammar to every dispatch that loads the surface — which is precisely what a conventions
authority is for.
<!-- /ANCHOR:summary -->
