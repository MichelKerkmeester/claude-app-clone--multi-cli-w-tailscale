---
title: "Verification checklist - Repo rules"
description: "Verification checklist for the per-repository rules document; every completed item carries evidence naming a real artifact, because the document's only guarantee is that its claims are re-runnable."
trigger_phrases:
  - "repo rules verification checklist"
  - "repo rules packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the packet and dispatched five research passes over the rules file."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Repo rules

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact. A rules document has no test suite, so its only guarantee is that each claim is a measurement a reader can repeat.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented with acceptance criteria [evidence: `spec.md` section 4 states REQ-001 through REQ-008]
- [x] CHK-002 [P0] Sequenced approach defined [evidence: `plan.md` section 4 orders establish, research, fold]
- [x] CHK-003 [P1] The boundary against the shared rules file is explicit [evidence: `AGENTS.md` is a symlink to the Public monorepo's shared file; the document states which wins on rules versus on paths, commands and numbers]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] No universal rule is restated [evidence: the document carries paths, commands, numbers and traps; comment hygiene, scope lock and the verification standards stay in `AGENTS.md`]
- [x] CHK-011 [P0] The surface skill is routed to, not duplicated [evidence: `REPO RULES.md` section 3 is three sentences naming `.opencode/skills/sk-code/sk-code-mobile-cli/`; the seven-row table that restated `SKILL.md` was cut]
- [x] CHK-012 [P1] Section order matches how work arrives [evidence: `REPO RULES.md` opens with `## 1. FIRST-COMMAND TRAPS`; the tree-destroying and silent-false-pass sentences moved from lines 171 and 192 of 204 to the first screen]
- [x] CHK-013 [P1] Nothing is stated twice [evidence: the golden count appears once, on the authority sentence in `REPO RULES.md` section 5; the ladder names `token-identity.mjs` without repeating it]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] CHK-020 [P0] Every cited path resolves [evidence: nine skill reference documents and every `scripts/*.mjs` gate script confirmed present against the tree]
- [x] CHK-021 [P0] Every npm script cited is defined [evidence: seven scripts resolved against the root and `app-mobile` `package.json`]
- [x] CHK-022 [P0] Every number is a measurement [evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` reports 39 goldens; `MANIFEST.json` reports 337 stories, 311 captured, 26 visually empty; one `app.css` against 95 scoped `<style>` blocks]
- [x] CHK-023 [P0] Recalled claims were falsified rather than trusted [evidence: the composer fence is at `session-composer.svelte:599`, not the remembered ~687; the named plan-mode test does not exist and the real file is `app-mobile/tests/menu-plan-mode.svelte.test.ts`]
- [x] CHK-024 [P1] A warning that no longer applies was removed [evidence: the root `npm test` names five explicit directories, so the bare-positional sweep is already fixed; rewritten as a do-not-reintroduce note]
- [x] CHK-025 [P1] The pinned clock is consistent across the scripts that read it [evidence: `2026-08-28T12:00:00.000Z` in `capture-screenshots.mjs`, `ui-audit.mjs` and `catalog-state-visibility.mjs`]
- [x] CHK-026 [P1] Every research finding is dispositioned [evidence: `implementation-summary.md` tables six falsified claims and four added facts; unverifiable findings stay in `research/`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-030 [P0] The gate ladder separates behaviour from presentation [evidence: `REPO RULES.md` section 4 holds two `bash` blocks; the second is introduced by the reason it exists, and adds the `npm run typecheck` five-of-six coverage gap]
- [x] CHK-031 [P0] The archive's non-determinism is stated with its measurement [evidence: `REPO RULES.md` section 6 records 5 / 5 differing comparisons on both a current and a pre-change capture]
- [x] CHK-032 [P1] The clock decision is recorded, not just the value [evidence: `2026-08-28T12:00:00.000Z` is named in all three scripts, with the rejected re-pin shown as `05:00 remaining` becoming `14573:00`]
- [x] CHK-033 [P1] The protected repositories are named [evidence: six research repositories under `specs/context/`, compared with `diff` against the directory listing; `orca-main` had been missing]
- [x] CHK-034 [P1] Confirmed research findings are folded in [evidence: `REPO RULES.md` gained the `playwright` gap, the macOS-only `catalog-smoke-cdp.mjs`, the `boot.mjs` version floors and the typecheck coverage gap]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] No credential, host or token value appears [evidence: `rg` over `REPO RULES.md` finds only the CSP directives `default-src 'self'` and `default-src 'none'`, and no secret]
- [x] CHK-041 [P0] The fail-closed contract is stated [evidence: never invent a host field; build inert behind a capability check and append the request to the host-requests packet]
- [x] CHK-042 [P1] The frozen mutation seam is named with its location [evidence: `session-composer.svelte:599` fences submit, steer, stop, snapshot, slash-draft and attachment flow]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] The document states its own precedence against the shared rules file [evidence: the opening blockquote of `REPO RULES.md` gives the rule-versus-path split against `AGENTS.md`]
- [x] CHK-051 [P1] Each trap says what it costs, not just what it is [evidence: `validate.sh` exit 3 is paired with its consequence in `REPO RULES.md` section 1 — a sweep reads the silence as a clean pass]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] The document sits beside the shared rules file it companions [evidence: `REPO RULES.md` at the repository root, next to the `AGENTS.md` symlink]
- [x] CHK-061 [P1] Research output is kept with the packet [evidence: one report per pass under `specs/007-repo-rules/research/`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The document is established and every claim in it is verified. What remains is dispositioning the five research passes and folding in whatever they confirm; two open questions are recorded in `spec.md` rather than resolved here - whether the counts should be generated, and whether a gate should guard the document's own path claims.
<!-- /ANCHOR:summary -->
