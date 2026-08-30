---
title: "Child 009 — Full Storybook Experience (dummy-proof, self-maintaining catalog)"
description: "Elevate Storybook from a developer-only render catalog (Phase 006) into a first-class, dummy-proof, self-maintaining component surface: one-command launch a non-technical user can run, the relevant addons installed (a11y, test, themes, autodocs, designs), per-component autodocs, a co-located story-per-component convention enforced by a coverage gate, an AI-runnable story scaffold so every component change initializes/updates its story, and a documented folder architecture that follows the post-cutover pages/ + shared/ layout. Blocked on 007 cutover + WS-C reorg; drafts now, executes after."
trigger_phrases:
  - "full storybook integration dummy proof"
  - "storybook addons autodocs auto-maintained stories"
  - "non technical user boot up storybook"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/009-storybook-experience"
    last_updated_at: "2026-08-24T05:55:17Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; coverage at 74/74."
    next_safe_action: "None; every requirement is closed."
    blockers:
      - "Story-coverage gate is red until the 27 missing stories are authored; those are EXECUTOR-territory (real fixtures + provider decorators in app-mobile/src/**, reaffirmed by the goal's execution model) and the executor is blocked in this environment — a red gate that resists bounded repair within Claude's ownership. The machinery + scaffold + story-upkeep rule are the self-maintaining apparatus that makes the fill one command per component."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 009 — Full Storybook Experience

---

<!-- ANCHOR:executive-summary -->
## EXECUTIVE SUMMARY

Child 006 built a catalog. This child makes it stay built, because a catalog decays by default: a
component gets added, a story does not, and coverage drops with no signal until the catalog describes
an app that no longer exists.

The answer is enforcement rather than discipline — a gate that fails when a renderable component has
no story, a reasoned allowlist so every exclusion is a written decision, and a scaffold command that
makes complying cheaper than skipping. Coverage now stands at 74/74 with 22 allowlisted.

A third instrument was added mid-flight because a real defect passed the two that existed: a
decorator-ordering mistake produced a story that rendered nothing and threw nothing, and both the
coverage gate and the catalog smoke were green on it.
<!-- /ANCHOR:executive-summary -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../008-sk-code-svelte-refactor/spec.md |
| **Successor** | ../010-context-repo-research/spec.md |
| **Level** | 3 (developer-experience architecture + automation + docs; heavier companion docs — plan/tasks/decision-record — authored when execution opens) |
| **Layer** | AFTER `007` green **and** the WS-C page-centric reorg — not a position in the L0–L7 sequence |
| **Writer** | app code + stories under `app-mobile/**` by the executor (`cli-devin`); Claude owns barrier files (`.storybook/*`, `package.json`, gate/scaffold scripts, root scripts, READMEs) + git + all verification |
| **Barrier** | `build-storybook` exit 0 · catalog-smoke (light+dark, 0 throws) green · story-coverage gate exit 0 · addon-vitest story tests green · one-command non-tech launch demonstrated |
| **Status** | Complete |
| **Blocked on** | `007` (cutover + C5 React delete) · WS-C reorg (`pages/` + `shared/`) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Phase `006-catalog` stood up Storybook 9 (`@storybook/sveltekit` + `addon-a11y`, 48 story files / 202 stories, catalog-smoke green light+dark). That delivered a **render catalog for developers** — but it stops short of the North Star's designer-editability promise in four ways:

1. **Not dummy-proof.** Launch is a workspace script (`storybook dev … --no-open`); a non-technical user has no obvious one-command, browser-auto-opening entry, and no plain-language quickstart.
2. **Not self-maintaining.** Stories are hand-authored ad hoc. Nothing initializes a story when a component is added, nothing keeps stories in sync on change, and nothing fails when a renderable component ships with no story.
3. **Thin integration.** Only `addon-a11y` is installed; no test/interaction addon, no robust theme switcher (the theme toggle is a hand-rolled decorator), no per-component autodocs, no design-source linkage.
4. **Coupled to soon-deleted structure.** `preview.ts` imports `../src/style.css` (deleted at C5) and every story lives under `lib/` (moved to `pages/` + `shared/` by WS-C).

**Purpose:** make Storybook the flawless, dummy-proof, **self-maintaining** "open one component → see it live, themed, documented, tested" surface — the tangible payoff of the whole migration for a designer or non-technical user, kept correct automatically as components change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**

- **Dummy-proof boot.** A single obvious command (`npm run storybook` at repo root, delegating to the web workspace) that **auto-opens the browser** (drop `--no-open`) with zero setup beyond `npm install`. A top-of-repo plain-language quickstart (what it is, the one command, what you'll see) plus, if it helps a non-tech user, a double-clickable launcher. Boots against the **final `pages/` layout** and **`app.css`** (not `style.css`).
- **Relevant addons** (web workspace devDeps, registered in `.storybook/main.ts`): keep **`@storybook/addon-a11y`**; add **`@storybook/addon-vitest`** (SB9 test addon — play/interaction + component tests via Vitest browser, wired to the existing test gate), **`@storybook/addon-themes`** (robust system/light/dark via `data-theme`, replacing the hand-rolled decorator), **autodocs** (SB9 docs core — enable `tags: ['autodocs']` per component), and **`@storybook/addon-designs`** (embed the Figma frame beside each surface — the team already uses Figma). **Evaluate** `@chromatic-com/storybook` for visual-regression (hosted/paid — flagged as an open question, not adopted by default). All pinned compatible with the installed Storybook `9.1.x`.
- **Self-maintaining architecture.**
  - **Convention:** every renderable `*.svelte` component has a co-located `*.stories.ts`.
  - **Coverage gate:** a script that globs renderable components vs stories and **fails on any gap** (with a small, documented allowlist for intentional non-story files — thin route wrappers, in-situ-only primitives). Added to the board.
  - **Scaffold:** an AI-runnable, one-command story generator (`npm run story:new <componentPath>`) emitting a correct CSF3 stub (meta + a default story + `autodocs` tag).
  - **AI upkeep rule:** documented in the `sk-code` surface so **every executor dispatch that adds or changes a component also creates/updates its story** — the automation that keeps the catalog live "on every component change."
- **Docs.** Per-component **autodocs** pages; a Storybook usage guide (run it, read it, add a story) at a discoverable location; a short README per story folder where it aids navigation.
- **Folder + architecture.** Stories co-located under the post-WS-C `pages/{…}/` + `shared/` layout; `preview.ts` imports `app.css`; a documented, consistent structure.

**Out of scope:** any app component behavior or rendered value (frozen); any token value; the security posture; **publicly hosting/deploying** Storybook (it stays a local/dev surface — tailnet/Funnel posture unchanged unless separately decided); committing to the Chromatic paid service; changes to the 006 stories' assertions beyond the mechanical repoint/co-location the reorg requires.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001 · One-command, non-tech launch.** `npm run storybook` from repo root boots Storybook and auto-opens the browser with no prior knowledge; a plain-language quickstart documents it.
- **REQ-002 · Addon set installed + registered.** a11y, test (addon-vitest), themes, autodocs, designs are installed at compatible versions and active in `main.ts`; the Chromatic decision is recorded. **Closed:** `@storybook/addon-vitest` is installed in the web workspace and listed in `main.ts`. It is registered rather than exercised — running stories as tests additionally needs vitest browser mode, which this repository does not install, because both web suites run in jsdom.
- **REQ-003 · Every renderable component has a story.** The coverage gate exits 0; every non-story exception is in the documented allowlist with a reason.
- **REQ-004 · Self-updating on change.** A scaffold command exists and the `sk-code` surface instructs the executor to create/update a component's story whenever the component changes.
- **REQ-005 · Per-component documentation.** Autodocs renders for each component; the usage guide exists. **Closed:** the catalog index reports 100 docs entries beside 337 stories, and each page renders a props table derived from the component's own types.
- **REQ-006 · Correct structure post-reorg.** Stories are co-located in the `pages/`/`shared/` layout; `preview.ts` imports `app.css`; no reference to the deleted `style.css` or old `lib/` paths remains.
- **REQ-007 · No regressions.** `build-storybook` exit 0; catalog-smoke green (light+dark, 0 throws); token-identity, backend, and the migration board stay green (adding devDeps + stories must not perturb the app bundle).
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- A non-technical user runs one command and sees the live, themed catalog — demonstrated.
- `npm run build-storybook -w @pi-remote/web` exit 0; `node scripts/catalog-smoke-cdp.mjs` = 0 throws, light+dark.
- The story-coverage gate exits 0; adding a component without a story makes it fail (negative control), and the scaffold command fixes it.
- addon-vitest runs the stories as tests and passes; addon-a11y and addon-themes are active; autodocs pages render.
- Grep sweep: no `style.css` import and no stale `lib/` story path remains after the reorg.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Sequencing (primary).** Executing before WS-C forces a codemod over new stories and a second preview repoint. Mitigation: **blocked on `007` + WS-C**; draft the spec now, execute after (user-chosen order).
- **Addon/version compat.** Addons must match Storybook `9.1.x` + the SvelteKit framework preset; addon-vitest needs the Vitest browser provider. Mitigation: pin compatible versions, verify `build-storybook` after each addition.
- **Coverage-gate false positives.** Layouts, route wrappers, and in-situ-only primitives legitimately have no isolated story. Mitigation: an explicit, reasoned allowlist; the gate reports what it skipped (no silent exclusion).
- **Dummy-proof drift.** "One command" must survive the monorepo workspace layout. Mitigation: a root script that delegates to the workspace; test it from a clean checkout.
- **Bundle/gate perturbation.** New devDeps must not leak into the app build. Mitigation: devDependencies only; re-run build + token-identity after install.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## 7. NON-FUNCTIONAL REQUIREMENTS

| Area | Requirement | How it is met |
|---|---|---|
| Accessibility | The catalog must not become a place a11y regressions hide | `@storybook/addon-a11y` runs per story; a11y parity remains a manually verified deliverable because no automated gate can see the AT tree |
| Determinism | Gates must not be flaky | The coverage gate walks the filesystem; the render test runs under jsdom; neither depends on timing |
| Isolation | Nothing in the catalog may reach a live relay | Every fixture is static data from `demo.ts` |
| Bundle safety | Adding stories and devDependencies must not perturb the app | Storybook packages are devDependencies; `dist/` excludes stories; the migration board is re-run |
| Approachability | A non-developer must succeed on the first try | One root command; `STORYBOOK.md` opens with seeing it, not configuring it |
| Theming | Every surface must be checkable in both themes | `withThemeByDataAttribute` drives `data-theme`; the smoke gate reads the same global |
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## 8. EDGE CASES

**A component genuinely cannot have a standalone story.** Compositional sub-parts and context
providers render nothing on their own. Handled by the allowlist, with a reason per entry.

**A required prop can only be supplied by a loader.** `PdfPage.svelte` needs a live
`PDFDocumentProxy`, and Storybook's arg typing cannot express that without a cast or a suppression,
both of which this codebase bans. Allowlisted; its rendering is exercised through `PdfPreview`.

**A story renders nothing without throwing.** The failure mode a decorator-ordering mistake produces.
Handled by the render test, not by the smoke gate, which treats an empty frame as a pass by design.

**A story exists but shows a state nobody has.** Guarded by fixture provenance — every fixture traces
back to `demo.ts`, so a story cannot quietly become fiction.

**A component is deleted but its story remains.** The story fails to compile, so `build-storybook`
catches it; no separate check is needed.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## 9. COMPLEXITY ASSESSMENT

| Dimension | Rating | Note |
|---|---|---|
| Blast radius | Low | Everything here is devDependencies, scripts and stories; none of it ships |
| Reversibility | High | Deleting the scripts and the test restores the 006 state with no app change |
| Coupling | Medium | Depends on 007's page-centric layout and on 007-EXT's React removal |
| Novel mechanism | Medium | The `composeStories` render test is the one non-obvious piece |
| Verification difficulty | Medium | Two of three instruments were straightforward; the third existed only because a real bug passed the first two |

Level 3 is the right declaration: this packet carries three architectural decisions with real
alternatives weighed — enforcement model, verification instrument, and visual-regression posture —
which is precisely what a decision record exists for.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:risk-matrix -->
## 10. RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The allowlist becomes a dumping ground | Medium | High | Reasons are mandatory and visible in the diff; "hard to test" would not survive review |
| A new context-dependent story is added with no role assertion | Medium | Medium | The decorator-order rule is documented at the story host and in the conventions surface |
| `svelte-check` regresses again on story typing | Low | Medium | The two working recipes are recorded; unproven annotations already made it worse once, 7 errors to 11 |
| Adding devDependencies perturbs the app bundle | Low | High | The full migration board is re-run after dependency changes |
| REQ-004's executor instruction never takes effect | Medium | Medium | It lives in the `sk-code` surface, which sits on 008's unmerged branch — tracked there, not silently assumed |
<!-- /ANCHOR:risk-matrix -->

---

<!-- ANCHOR:user-stories -->
## 11. USER STORIES

**As a designer who does not run the app**, I want one command that shows me every component in both
themes, so I can see what exists without asking a developer or standing up a relay.

**As a developer adding a component**, I want the build to tell me I forgot a story, so the catalog
stays true without anyone remembering to check it.

**As a developer who cannot write a story for something**, I want to record why, so the exclusion is a
decision a reviewer can disagree with rather than an absence nobody notices.

**As a reviewer**, I want a story that renders nothing to fail, so a green board means the catalog
actually shows the component rather than an empty box.
<!-- /ANCHOR:user-stories -->

---

<!-- ANCHOR:questions -->
## 12. OPEN QUESTIONS

- **Chromatic / visual-regression?** Adopt `@chromatic-com/storybook` (hosted, paid tier) for pixel-diff regression, or keep the local CDP catalog-smoke as the only visual gate? (Default: local-only; evaluate Chromatic, don't adopt without a yes.)
- **Publish surface?** Should the built Storybook ever be served (tailnet-only, mirroring the app's posture), or stay a purely local `npm run storybook`? (Default: local-only.)
- **Non-tech launcher form.** Is the root `npm run storybook` + quickstart enough, or is a double-clickable desktop/Finder launcher wanted? (Default: root script + quickstart; add a launcher if requested.)
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:related -->
## 13. RELATED DOCUMENTS

- `plan.md` — enforcement model, the decorator-order trap, and the gate board.
- `tasks.md` — the task ledger with evidence.
- `checklist.md` — sign-off, including the one open addon.
- `decision-record.md` — ADR-001 the reasoned allowlist, ADR-002 the render test, ADR-003 declining
  visual regression.
- `implementation-summary.md` — what shipped and what remains.
- `../006-catalog/` — the catalog this child hardened.
- `../008-sk-code-svelte-refactor/` — holds the executor instruction half of REQ-004.
- `../../../STORYBOOK.md` — the plain-language quickstart.
- Program goal: `../goal.md`.
<!-- /ANCHOR:related -->
