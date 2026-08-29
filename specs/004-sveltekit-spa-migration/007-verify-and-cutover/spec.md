---
title: "Child 007 — Verification Migration + Cutover"
description: "Build the CSS-corpus builder, commit the token-identity resolver gate (0 diffs across 3 themes = the pixel-identity proof), rewrite the 75 tests to @testing-library/svelte, repoint CDP at the built preview, run a deep-review fan-out against the frozen contracts, then cut over: all nine objective gates green + validate.sh --strict, and close the spec amendment."
trigger_phrases:
  - "css corpus token identity gate cutover svelte"
  - "test rewrite testing-library svelte cdp repoint"
  - "verify and cutover spec requirements"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/007-verify-and-cutover"
    last_updated_at: "2026-08-23T09:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Cutover shipped; 007-EXT sectioning complete at 95 files."
    next_safe_action: "Close XB.3 styling wayfinding, then XE.1 hook enforcement."
    blockers: []
    completion_pct: 92
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 — Verification Migration + Cutover

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../006-catalog/spec.md |
| **Successor** | ../008-sk-code-svelte-refactor/spec.md |
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
  specs/004-sveltekit-spa-migration --strict` → commit/PR on the branch.
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

- **REQ-001** — The token-identity gate is committed and reproducible; PASS is exactly 0/0/0 across
  all three theme states. This is the load-bearing proof that nothing rendered moved.
- **REQ-002** — The backend suite (`npm test`) stays green throughout the entire migration. Because
  the relay and protocol are framework-independent, a backend failure means the rewrite leaked out of
  the web workspace; it is a leak detector, not a regression suite.
- **REQ-003** — The CDP gate runs against the *built* preview in both themes at 390px with zero
  horizontal overflow. Built, not dev: SvelteKit emits static CSS links, so this is the first time the
  structural screenshots render styled.
- **REQ-004** — At least 76 `@ds guardrail:` fences survive, and every WCAG contrast pair stays at or
  above its threshold.
- **REQ-005** — The 317 behaviour tests are ported without weakening. Faithfulness is verified
  independently against the React oracle — matching `it` counts, matching `expect` counts and
  oracle-exact call counts — because a passing suite proves nothing if its assertions were softened.
- **REQ-006** — The a11y contract survives the react-aria→Bits/Melt swap. No objective gate can see
  AT-tree, focus-order, role or dismissal loss, so this needs its own adversarial verification.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

The nine gates. All must be green for the cutover to be legitimate; REQ-001 through REQ-006 each
trace to at least one of them.

1. `npm run build` exit 0
2. `npm run typecheck` (`svelte-check`) exit 0
3. `npm test` exit 0 — green *throughout*, not merely at the end
4. `npm run test:web` exit 0
5. token-identity 0 diffs across all three theme states
6. contrast pairs at threshold, and ≥76 `@ds guardrail:` fences preserved
7. CDP structural gate at 390px, both themes, zero horizontal overflow
8. catalog smoke, light and dark, no throw
9. `validate.sh … --strict` exit 0 — **invoked through the script's realpath**, since through the
   `.opencode` symlink it silently prints nothing and exits 0 even when the packet fails.
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
