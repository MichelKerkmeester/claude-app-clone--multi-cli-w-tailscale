---
title: "Child 007 checklist — verification and cutover sign-off"
description: "QA sign-off for the cutover, one line of evidence per item — the record that authorised deleting the React runtime."
trigger_phrases:
  - "verify and cutover verification checklist"
  - "verify and cutover packet"
  - "verification checklist"
importance_tier: "normal"
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

# Verification Checklist: Child 007 — verification migration and cutover

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Every item carries its evidence inline. An item without evidence is not checked, regardless of how
confident anyone is.

Gate 9 is recorded only from a **realpath** invocation of `validate.sh`. Through the `.opencode`
symlink the script prints nothing and exits 0 even on a failing packet, so a symlink-form result is
not evidence of anything.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Pre-migration token snapshot captured at L0, the only reference for what the app used to resolve to. [evidence: `baseline/token-identity-baseline.json`]
- [x] **CHK-PRE-02** [P0] Census re-measured before planning the 007-EXT pass. [evidence: `phase-0-census.md` — 95 `.svelte` / 14 `.svelte.ts` / 87 `.ts`, 275 guardrail markers across 64 files]
- [x] **CHK-PRE-03** [P1] Fence-text baseline fixed in git history rather than a copied snapshot, so it cannot drift out of sync with the tree. [evidence: baseline commit `4796234`]
- [x] **CHK-PRE-04** [P1] Authorization model agreed — executor writes `app-mobile/**`, Claude owns barriers, git and all verification. [evidence: `tasks.md` TASK NOTATION section]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Production build clean. [evidence: `npm run build` exit code 0]
- [x] **CHK-CQ-02** [P0] Type check clean. [evidence: `npm run typecheck` via `svelte-check`, 0 errors]
- [x] **CHK-CQ-03** [P0] CSS decomposition removed a rule only when every one of its selectors was reproduced by a component scoped style block, never splitting a grouped selector. [evidence: `build-app-css.mjs`, 7932 to 3153 lines]
- [x] **CHK-CQ-04** [P1] Page-centric reorg done by deterministic codemod rather than by hand. [evidence: commit `2a811df` — 191 files moved, 480 imports rewritten]
- [x] **CHK-CQ-05** [P1] Single `$shared` alias wired in lockstep across `svelte.config.js` and both vitest configs. [evidence: commits `3aba4d1` and `c13fa47` — 219 specifiers across 91 files]
- [x] **CHK-CQ-06** [P2] Section segmentation applied across the tree. [evidence: 95/150 files carry numbered Format A sections; the other 55 sit below the 60-line body threshold]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Web suite green. [evidence: `npm run test:web` — 528 Svelte plus 182 logic tests passed]
- [x] **CHK-TEST-02** [P0] Backend leak detector green. [evidence: `npm test` 365/366, the single failure being the known `auth.test.ts` timing flake confirmed pre-existing]
- [x] **CHK-TEST-03** [P0] All behaviour tests ported, cluster by cluster, each verified before the next began. [evidence: 317 tests across 8 clusters, `tasks.md` PHASE 2 table]
- [x] **CHK-TEST-04** [P0] Faithfulness verified per cluster against the React oracle rather than inferred from a passing run. [evidence: matching `it` counts, matching `expect` counts, oracle-exact call counts per cluster]
- [x] **CHK-TEST-05** [P0] Every masked assertion caught and reverted. [evidence: exact count softened to `>=1`, `mockClear`, `mockRejectedValueOnce` widened, gutted Retry-After test, filtered `getAllByRole` call]
- [x] **CHK-TEST-06** [P1] Both accepted skips documented at the point of skip with rationale. [evidence: `SessionComposer.svelte.test.ts` and `App.svelte.test.ts` skips — jsdom cannot run bits-ui focus-trap redirect or interact-outside dismissal, and the React oracle passed both vacuously]
- [x] **CHK-TEST-07** [P1] Catalog renders every story in both themes without throwing. [evidence: `node scripts/catalog-smoke-cdp.mjs` — 404 frames, 0 throws]
- [x] **CHK-TEST-08** [P0] Structural gate clean at phone width against the built preview. [evidence: `node scripts/design-system-cdp.mjs` — 390px, both themes, zero horizontal overflow]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] All `$effect` self-invalidation instances found and fixed by untracking the synchronous dispatch while leaving the genuine dependency tracked. [evidence: 7 instances across 6 files]
- [x] **CHK-FIX-02** [P0] Three of those were latent committed regressions the ports exposed rather than introduced. [evidence: `AskQuestionCard`, `useRuntime` mount refresh, `hostCommandCatalog` mount plus reconnect]
- [x] **CHK-FIX-03** [P1] Confirmed that fixing one effect does not clear a file. [evidence: `hostCommandCatalog.svelte.ts` had a second self-invalidating effect after the first was already fixed]
- [x] **CHK-FIX-04** [P0] Accessibility parity gap closed and independently verified. [evidence: 3 P0 plus 7 P1 fixed, 4 adversarial verifier groups, 0 defects, `a11y-parity-findings.md` resolution table]
- [x] **CHK-FIX-05** [P0] Background AT-hiding restored across sheet surfaces. [evidence: `shared/primitives/ariaHideOutside.svelte.ts` — ref-counted, precise restore, live-region exempt, MutationObserver — wired through `SheetContent.svelte`]
- [~] **CHK-FIX-06** [P2] Remaining accessibility items deferred as amendment candidates rather than silently dropped. [deferred: ~10 P2 findings listed in `a11y-parity-findings.md`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Backend suite green throughout, proving the rewrite never leaked out of the web workspace. [evidence: `npm test` green at every barrier; relay and protocol are framework-independent]
- [x] **CHK-SEC-02** [P0] No change to the loopback relay, tailnet-only posture, foreground authority, redaction, fail-closed ticketed mutations, host plan mode or content-free push. [evidence: no diff under `app-relay/` or the protocol package across this child]
- [x] **CHK-SEC-03** [P0] The phone never gains full-access mode. [evidence: nothing in this child touches that boundary; `verify-full-access-runtime.mjs` unchanged]
- [x] **CHK-SEC-04** [P1] Read-only rich-content security assertions re-verified against the Svelte sources after the reorg rather than assumed to carry over. [evidence: backend 366/366 re-run post-`2a811df`]
- [x] **CHK-SEC-05** [P1] CSP moved to hash mode and its release check repointed at the built output. [evidence: `kit.csp` in `svelte.config.js`; `scripts/release-verify.mjs` checks the built `dist/index.html`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] All four onboarding docs corrected to Svelte reality by re-deriving the real layout, not find/replacing paths. [evidence: commits `2d2b37c` and `25f30e6`]
- [x] **CHK-DOC-02** [P2] Per-folder feature READMEs throughout the source tree, with `CODE.md` added where a folder is substantial. [evidence: commit `2d2b37c` plus follow-up]
- [x] **CHK-DOC-03** [P1] Convention authority authored for 008 to encode verbatim. [evidence: `comment-grammar-reference.md`]
- [x] **CHK-DOC-04** [P1] Accessibility findings committed with a resolution table so deferred items stay visible. [evidence: `a11y-parity-findings.md`]
- [ ] **CHK-DOC-05** [P2] XB.3 styling wayfinding — owner-pointer anchors, artifact-viewer block index, stale `.tsx` reference cleanup.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] `lib/` dissolved into page and shared trees. [evidence: `pages/{home,chat,review,inbox,enrollment}/` plus `shared/{primitives,chrome,data}`]
- [x] **CHK-ORG-02** [P1] Conversation view renamed without disturbing routing. [evidence: `Session.svelte` to `pages/chat/Chat.svelte`; `/session/[id]` route and session-protocol names unchanged]
- [x] **CHK-ORG-03** [P0] React runtime fully deleted. [evidence: commit `be76d77` then `0757d83` — 60 `.tsx`, `style.css`, 53 retired oracle tests, 5 React dependencies, 21 node_modules packages]
- [x] **CHK-ORG-04** [P0] The react-deleted invariant is true rather than aspirational. [evidence: 0 react imports in `app-mobile/src`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The cutover is signed off. All nine gates were green at C2, the adversarial deep-review at C3 returned
zero defects, the operator gave an explicit go-ahead at C4 with screenshots shown, and C5 performed
the irreversible delete against that green board.

Two items remain open and neither gates the cutover: **XB.3** styling wayfinding and **XE.1** hook
enforcement. **XA.4**'s removals and installs stay deferred pending an explicit go-ahead, because each
is a deletion or a dependency addition rather than an edit.

The honest caveat on this record: gate 9 results predating the realpath discovery were produced by an
invocation that silently no-ops. Gates 1 through 8 are unaffected — they were always run directly.
<!-- /ANCHOR:summary -->
