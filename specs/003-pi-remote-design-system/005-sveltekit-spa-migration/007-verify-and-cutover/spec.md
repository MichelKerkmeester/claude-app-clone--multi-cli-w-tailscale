---
title: "Child 007 — Verification Migration + Cutover"
description: "Build the CSS-corpus builder, commit the token-identity resolver gate (0 diffs across 3 themes = the pixel-identity proof), rewrite the 75 tests to @testing-library/svelte, repoint CDP at the built preview, run a deep-review fan-out against the frozen contracts, then cut over: all nine objective gates green + validate.sh --strict, and close the spec amendment."
trigger_phrases:
  - "css corpus token identity gate cutover svelte"
  - "test rewrite testing-library svelte cdp repoint"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/007-verify-and-cutover"
    last_updated_at: "2026-08-22T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "007-EXT Phase 0 calibration complete — X0.1 census (phase-0-census.md, 3 plan refinements) + X0.2 React-completion (0757d83) + X0.3 grammar reference (comment-grammar-reference.md); X0.4 fence baseline deferred to pre-Phase-B"
    next_safe_action: "Phase 0 done. Remaining 007-EXT (Phase A docs/READMEs · Phase B comment edits · Phase C codemod) + the 5-repo research program are gated on two user decisions: push unpushed commits, and research launch approach (validate-OGAM-first vs all-5, --auto OK)"
    blockers:
      - "Push go-ahead needed for the unpushed commits on main"
      - "Research launch decision needed (approach + --auto) before firing the deep-research loops; per user ordering, research feeds Phase A/B/C"
    completion_pct: 72
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 — Verification Migration + Cutover

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Layer** | L7 — parallel groundwork → barrier → FINAL GATE |
| **Writer** | cli-devin (test rewrite) + Claude (gates, deep-review, cutover, git) |
| **Barrier** | all nine objective gates green (see implementation-phases §6) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The migration's claim — "nothing rendered or behaved differently" — is only credible if proven by
machine checks. This child builds those checks (the token-identity gate is the load-bearing one),
migrates the 75-test suite off React, repoints the CDP structural gate at a now-styled built preview,
runs an adversarial deep-review, and executes the cutover.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **CSS-corpus builder:** glob every `.svelte`, extract each `<style>` body, concat with `app.css`;
  point `contrast.test`'s `STYLE` regex assertions at the corpus.
- **Committed token-identity resolver gate:** parse the corpus, resolve all tokens per theme, diff
  vs the L0 snapshot → **PASS = CHANGED 0 / VANISHED 0 / ADDED 0**.
- **Test rewrite (75 tests):** `vitest.web.config.ts` `plugin-react`→`vite-plugin-svelte`,
  `@testing-library/react`→`@testing-library/svelte` v5, `resolve.conditions:['browser']`; pure-logic
  tests port first for early confidence.
- **CDP repoint:** to the *built* preview (`vite build && vite preview`) — SvelteKit emits static CSS
  `<link>`s (CSP-clean), so the 390 px/no-overflow screenshots render **styled** for the first time.
- **Deep-review fan-out** (`fanout-run.cjs`, `deep-review`) against the frozen contracts.
- **Cutover:** all nine gates green → complete the spec-005 amendment docs → `validate.sh
  specs/003-pi-remote-design-system/005-sveltekit-spa-migration --strict` → commit/PR on the branch.
- **008-finalize trigger:** signal child 008 to capture the proven runes/scoping patterns.

**Out of scope:** any token value change; any new feature; the relay/protocol/extensions.

**Extension (007-EXT — post-cutover editability/DX pass; approach = `ai-council-007-ext-synthesis.md`):**
- **React-completion:** delete the DEAD React-hook halves in `shared/data/runtime.ts` + `commands.ts` (keep the live pure exports), drop `react`/`react-dom`/`react-aria-components` — completes the cutover the deletion left unfinished; **unblocks 009**.
- **(a) Inline comments (TOP PRIORITY):** a 4-element house grammar + section-segmentation on **EVERY file** (banner weight scaled to size, sk-code/opencode style), enforced via the comment-hygiene hook.
- **(b) Architecture:** one `$shared` import alias (codemod ~168 deep-relative specifiers); prune dead-React `tsconfig`. No god-file splits / barrels / renames.
- **(c) Styling structure:** comment-only wayfinding (owner-pointer anchors, `@ds` legend → top of `app.css`, viewer-block index). No CSS rule moved.
- **(d) Docs & editing ease:** rewrite the 4 stale onboarding docs to Svelte reality; **per-folder CODE README (structure/logic) + FEATURE README (what/why)**; `.vscode`/`.editorconfig`; format-on-save going forward; root `npm run storybook`.
- **HARD CONSTRAINT:** zero rendered-value / a11y / security / routing change — the 9 gates + a new per-file unchanged-fence-TEXT diff prove it. Executor writes comment/doc/config; Claude diff-inspects comment-only + owns barriers. Full plan: `tasks.md` §007-EXT.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- R1: The token-identity gate is committed and reproducible; PASS is exactly 0/0/0 across 3 themes.
- R2: The backend suite (`npm test`) is green throughout the whole migration — a leak detector.
- R3: The CDP gate runs against the built preview in both themes with zero horizontal overflow.
- R4: ≥76 `@ds guardrail:` fences preserved; every WCAG contrast pair still ≥ threshold.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA (the nine gates)

1. `npm run build` 0 · 2. `npm run typecheck` (`svelte-check`) 0 · 3. `npm test` 0 (green throughout)
· 4. `npm run test:web` 0 · 5. token-identity 0 diffs (3 themes) · 6. contrast + ≥76 fences ·
7. CDP 390 px both themes · 8. catalog smoke light+dark · 9. `validate.sh … --strict` 0.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **75-test blast radius** — first-class scope, not an afterthought; backend green is the invariant.
- **CSP hash-mode** — re-point `release-verify.mjs`'s CSP check at the built `dist/index.html`.
- Depends on all prior layers; this is the final barrier.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent. 007-EXT decisions resolved 2026-08-22 (React residue → fold into Phase 0/A; comment-section segmentation → every file, scaled to size; research scope → all 5 `specs/context/` repos) — see `handover.md`.
<!-- /ANCHOR:questions -->
