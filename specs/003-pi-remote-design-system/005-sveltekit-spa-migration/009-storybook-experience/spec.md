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
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/009-storybook-experience"
    last_updated_at: "2026-08-23T03:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Blocker RESOLVED (007 cutover done: preview.ts already imports app.css, all 49 stories already co-located in pages/+shared, 0 in lib/, so R6 is done). Shipped the self-maintaining machinery + dummy-proof launch (commit f6d74b5): story-coverage gate + reasoned 19-entry allowlist (R3), story:new CSF3 scaffold (R4), root `npm run storybook` auto-open + story:coverage/story:new scripts (R1), STORYBOOK.md quickstart+usage guide (R1/R5). Baseline build-storybook exit 0. Coverage gate correctly reports 27 genuine gaps."
    next_safe_action: "Remaining 009: (R2) install addons @storybook/addon-themes + addon-designs (light) then addon-vitest (heavy — Vitest browser provider), register in main.ts, swap the hand-rolled theme decorator for addon-themes; re-verify board (build/token-identity/test:web) per R7. (R4) add the sk-code-mobile-cli AI-upkeep rule 'every component change creates/updates its story' — cross-repo Public worktree (see [[public-cross-repo-skill-landing-flow]]). (R3 fill) author the 27 missing stories with real demo fixtures + provider decorators — EXECUTOR-territory (app-mobile/src/**) per the ownership split; executor currently blocked. Then 009 completion docs + validate.sh --strict."
    blockers:
      - "Story-coverage gate is red until the 27 missing stories are authored; those are executor-territory (real fixtures + provider decorators, app-mobile/src/**) and the cli-devin/executor is blocked in this environment. Machinery + scaffold + (pending) sk-code AI-upkeep rule are what make that fill efficient."
    completion_pct: 45
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 009 — Full Storybook Experience

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 (developer-experience architecture + automation + docs; heavier companion docs — plan/tasks/decision-record — authored when execution opens) |
| **Layer** | AFTER `007` green **and** the WS-C page-centric reorg — not a position in the L0–L7 sequence |
| **Writer** | app code + stories under `app-mobile/**` by the executor (`cli-devin`); Claude owns barrier files (`.storybook/*`, `package.json`, gate/scaffold scripts, root scripts, READMEs) + git + all verification |
| **Barrier** | `build-storybook` exit 0 · catalog-smoke (light+dark, 0 throws) green · story-coverage gate exit 0 · addon-vitest story tests green · one-command non-tech launch demonstrated |
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

- **R1 · One-command, non-tech launch.** `npm run storybook` from repo root boots Storybook and auto-opens the browser with no prior knowledge; a plain-language quickstart documents it.
- **R2 · Addon set installed + registered.** a11y, test (addon-vitest), themes, autodocs, designs are installed at compatible versions and active in `main.ts`; the Chromatic decision is recorded.
- **R3 · Every renderable component has a story.** The coverage gate exits 0; every non-story exception is in the documented allowlist with a reason.
- **R4 · Self-updating on change.** A scaffold command exists and the `sk-code` surface instructs the executor to create/update a component's story whenever the component changes.
- **R5 · Per-component documentation.** Autodocs renders for each component; the usage guide exists.
- **R6 · Correct structure post-reorg.** Stories are co-located in the `pages/`/`shared/` layout; `preview.ts` imports `app.css`; no reference to the deleted `style.css` or old `lib/` paths remains.
- **R7 · No regressions.** `build-storybook` exit 0; catalog-smoke green (light+dark, 0 throws); token-identity, backend, and the migration board stay green (adding devDeps + stories must not perturb the app bundle).
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

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- **Chromatic / visual-regression?** Adopt `@chromatic-com/storybook` (hosted, paid tier) for pixel-diff regression, or keep the local CDP catalog-smoke as the only visual gate? (Default: local-only; evaluate Chromatic, don't adopt without a yes.)
- **Publish surface?** Should the built Storybook ever be served (tailnet-only, mirroring the app's posture), or stay a purely local `npm run storybook`? (Default: local-only.)
- **Non-tech launcher form.** Is the root `npm run storybook` + quickstart enough, or is a double-clickable desktop/Finder launcher wanted? (Default: root script + quickstart; add a launcher if requested.)
<!-- /ANCHOR:questions -->
