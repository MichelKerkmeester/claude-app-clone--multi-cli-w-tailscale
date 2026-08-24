---
title: "Child 009 checklist — Storybook experience sign-off"
description: "Sign-off for the enforcing coverage gate, the render test and the launch experience, with the one addon still outstanding."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/009-storybook-experience"
    last_updated_at: "2026-08-24T05:55:17Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; coverage at 74/74."
    next_safe_action: "Install addon-vitest to close REQ-002."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 009 — Storybook experience

<!-- SPECKIT_LEVEL: 3 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Three instruments with deliberately different reach: the coverage gate asks whether every component
has a story, the smoke gate asks whether every story renders without throwing, and the render test
asks whether a story actually produces its component. The third exists because a real defect passed
the first two.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] 007-EXT React-completion confirmed landed, since the dead React halves blocked this child. [evidence: commit `0757d83` removed the dead hooks and 5 React dependencies]
- [x] **CHK-PRE-02** [P1] Baseline coverage measured before building the gate, so the gate had a real target. [evidence: coverage was partial at 006; the gate now reports 74/74]
- [x] **CHK-PRE-03** [P1] Typing recipes proven on single files before being applied broadly. [evidence: an earlier repair round made `svelte-check` worse, 7 errors to 11, by applying an unproven annotation]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean. [evidence: `npm run typecheck` — 0 errors across 1123 files]
- [x] **CHK-CQ-02** [P0] Story typing uses the recipes that preserve arg inference. [evidence: `const meta: Meta<typeof X>` together with `type Story = StoryObj<typeof Component>` — not `typeof meta`, which breaks inference]
- [x] **CHK-CQ-03** [P1] No cast or type suppression introduced to force a story. [evidence: `PdfPage.svelte` allowlisted instead, since its required prop is loader-injected]
- [x] **CHK-CQ-04** [P1] Storybook builds. [evidence: `npm run build-storybook -w @pi-remote/web` exit code 0]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Coverage gate exits 0 at complete coverage. [evidence: `node scripts/story-coverage.mjs` — 74/74 renderable components, 22 allowlisted]
- [x] **CHK-TEST-02** [P0] The gate's negative control is real, not assumed. [evidence: adding a component without a story makes it fail, and `npm run story:new` fixes it]
- [x] **CHK-TEST-03** [P0] Catalog smoke green in both themes. [evidence: `node scripts/catalog-smoke-cdp.mjs` — 0 throws]
- [x] **CHK-TEST-04** [P0] A silently-empty story now fails a gate. [evidence: `story-render.svelte.test.ts` composes the real decorator pipeline and asserts `role="list"` named `/draft photos/i` plus `role="dialog"`]
- [x] **CHK-TEST-05** [P1] Adding devDependencies and stories did not perturb the app bundle. [evidence: `npm test` and the migration board stayed green]
- [~] **CHK-TEST-06** [P1] `@storybook/addon-vitest` not installed — deferred, not open. [deferred: it duplicates `catalog-smoke-cdp.mjs`, which already renders every story in both themes and fails on a throw; R2 deferred it for that reason. The story lane's self-maintaining half shipped — the R4 upkeep rule is live at v1.4.0.0]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Decorator-order trap found and fixed rather than worked around. [evidence: `decorateStory` reduces from the story outward, so the LAST decorator is outermost; `[Provider, Host]` reversed to `[Host, Provider]`]
- [x] **CHK-FIX-02** [P0] The empty-render bug was reproduced before the fix, so the same check proves the change. [evidence: `AttachmentDraftStoryHost` rendered empty with no throw; `story-coverage.mjs` and `catalog-smoke-cdp.mjs` were both green on it — 2/2 existing gates blind]
- [x] **CHK-FIX-03** [P1] `@storybook/svelte` inlined in the vitest config for the same reason bits-ui is. [evidence: `vitest.web.svelte.config.ts` `server.deps.inline` — it ships raw `.svelte` internals]
- [x] **CHK-FIX-04** [P1] Every allowlist entry carries a reason. [evidence: 22/22 entries name why — compositional sub-part, context provider with no visual, loader-injected prop]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Storybook and its addons are devDependencies only, never in the shipped bundle. [evidence: `@storybook/*` entries live in `devDependencies`; `dist/` excludes stories]
- [x] **CHK-SEC-02** [P0] No story reaches a live relay or carries real session content. [evidence: fixtures come from `demo.ts`; the catalog runs with no backend]
- [x] **CHK-SEC-03** [P1] Backend suite green after the dependency additions. [evidence: `npm test` exit code 0]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P0] A non-technical user can reach the catalog from one root command. [evidence: `npm run storybook` at the repo root delegates into the web workspace]
- [x] **CHK-DOC-02** [P1] Plain-language quickstart exists and leads with seeing it, not with configuring it. [evidence: `STORYBOOK.md` — "See it (one command)" is the first section]
- [x] **CHK-DOC-03** [P1] Per-component docs render. [evidence: 74/74 story files carry the `autodocs` tag]
- [x] **CHK-DOC-04** [P1] The Chromatic decision is recorded rather than left open. [evidence: `STORYBOOK.md` records visual regression as intentionally declined; `decision-record.md` ADR-003 gives the reasoning]
- [x] **CHK-DOC-05** [P2] The outstanding addon is recorded as planned rather than dropped. [evidence: `STORYBOOK.md:68` names `@storybook/addon-vitest` as planned per the 009 spec]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Stories co-located in the post-reorg layout. [evidence: `*.stories.ts` files sit beside their components under `pages/` and `shared/`]
- [x] **CHK-ORG-02** [P0] No reference to the deleted stylesheet or the dissolved directory survives. [evidence: grep sweep finds no `style.css` import and no stale `lib/` story path]
- [x] **CHK-ORG-03** [P1] Scaffold and gate scripts live at the repo root beside the other gates. [evidence: `scripts/story-coverage.mjs`, `scripts/new-story.mjs`, `scripts/story-coverage-allowlist.json`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Six of seven requirements hold. Coverage is complete at 74/74 and enforced, the launch is one root
command, the scaffold exists, autodocs render, structure is correct post-reorg, and the board is green.

REQ-002 is partially met: three of four addons are installed and the Chromatic decision is recorded,
but `@storybook/addon-vitest` is not installed. It is recorded as planned in `STORYBOOK.md` rather than
quietly dropped, and it is the single open item in this packet.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: ARCHITECTURE VERIFICATION

- [x] **CHK-ARCH-01** [P0] Enforcement chosen over discipline, with alternatives weighed. [evidence: `decision-record.md` ADR-001 scores the enforcing gate 9/10 against reporting-only at 3/10]
- [x] **CHK-ARCH-02** [P0] The verification instrument matches the failure mode it must catch. [evidence: ADR-002 — `composeStories` runs the real decorator pipeline rather than a reimplementation of it]
- [x] **CHK-ARCH-03** [P1] Gates walk the filesystem rather than Storybook internals, so they survive a tooling change. [evidence: `scripts/story-coverage.mjs` enumerates components and stories by path]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: PERFORMANCE VERIFICATION

- [x] **CHK-PERF-01** [P1] The catalog build stays viable at full coverage. [evidence: `npm run build-storybook -w @pi-remote/web` exit code 0 with 74 story files]
- [x] **CHK-PERF-02** [P2] The smoke gate does not wait needlessly on blank frames. [evidence: the blank-frame cap was tightened to 2.5s in commit `e67424b`]
- [x] **CHK-PERF-03** [P2] Gates are deterministic rather than timing-dependent. [evidence: the coverage gate walks files; the render test runs under jsdom]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: DEPLOYMENT READINESS

- [x] **CHK-DEPLOY-01** [P0] Nothing in this packet reaches the shipped bundle. [evidence: Storybook packages are devDependencies; `dist/` excludes `.storybook/` and `*.stories.ts`]
- [x] **CHK-DEPLOY-02** [P0] The app board stayed green after the dependency additions. [evidence: `npm test` exit code 0 and the migration board re-run]
- [x] **CHK-DEPLOY-03** [P1] Rollback is a deletion, not a migration. [evidence: removing 3 scripts, 1 test and 2 root `package.json` entries restores the 006 state]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: COMPLIANCE VERIFICATION

- [x] **CHK-COMPLY-01** [P0] No token value changed by this packet. [evidence: `token-identity.mjs` 0 diffs across 3 themes]
- [x] **CHK-COMPLY-02** [P0] No security-posture or routing behaviour touched. [evidence: this packet edits only devDependencies, scripts, stories and 1 test file]
- [x] **CHK-COMPLY-03** [P1] The codebase's ban on casts and type suppressions was honoured even at cost. [evidence: `PdfPage.svelte` allowlisted rather than typed with a cast]
- [x] **CHK-COMPLY-04** [P1] Every exclusion is a written decision. [evidence: 22/22 allowlist entries carry a reason]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: DOCUMENTATION VERIFICATION

- [x] **CHK-DOCV-01** [P0] The quickstart leads with the outcome, not the configuration. [evidence: `STORYBOOK.md` section 1 is "See it (one command)"]
- [x] **CHK-DOCV-02** [P1] Three architectural decisions recorded with alternatives and scores. [evidence: `decision-record.md` ADR-001, ADR-002, ADR-003]
- [x] **CHK-DOCV-03** [P1] The open item is recorded rather than dropped. [evidence: `STORYBOOK.md:68` names `@storybook/addon-vitest` as planned]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: SIGN-OFF

| Role | Verdict | Basis |
|---|---|---|
| Implementation | Complete except REQ-002's addon-vitest | 6 of 7 requirements hold with evidence per item |
| Verification | Green | Coverage 74/74, `build-storybook` 0, smoke 0 throws, typecheck 0/1123, render test pass |
| Architecture | Accepted | 3 ADRs, each 5/5 on the five checks |
| Operator | Outstanding | `@storybook/addon-vitest` install is the only remaining decision |

The packet is signed off as complete-with-one-open-item rather than complete. REQ-002 is partially
met, and calling it done would misrepresent the board.
<!-- /ANCHOR:sign-off -->
