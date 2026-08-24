---
title: "Phase 5 — SvelteKit SPA Migration (apps→src, React→Svelte 5)"
description: "Phase 5 — SvelteKit SPA Migration. Re-home the Pi Remote phone UI (apps/pi-remote-web, React 19) onto SvelteKit 5 / Svelte 5 runes in SPA/CSR mode so every screen and component is one .svelte file (markup + scoped CSS + typed logic), and relocate apps/* to src/*, preserving the shipped look, a11y, security posture, and PWA behavior byte-for-byte."
trigger_phrases:
  - "sveltekit spa migration"
  - "react to svelte 5 rewrite pi remote"
  - "apps to src move mobile app"
  - "phase 5 sveltekit spa migration"
importance_tier: "important"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration"
    last_updated_at: "2026-08-19T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Post-cutover queue complete; all thirteen nodes at 100%."
    next_safe_action: "None — the programme is complete."
    blockers: []
    key_files:
      - "spec.md"
      - "goal.md"
      - "amendment.md"
      - "implementation-phases.md"
    completion_pct: 100
    open_questions: []
    answered_questions:
      - "Authoring model → Svelte 5 rewrite"
      - "Setup → SvelteKit 5 SPA/CSR (most future-proof)"
      - "Migration → big-bang branch rewrite"
      - "Move scope → apps/* only → /src/*"
      - "Executor → GLM-5.2 High via cli-devin"
      - "Concurrency K=3, disjoint-directory isolation, seven phase children"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Phase 5 — SvelteKit SPA Migration (apps→src, React→Svelte 5)

> **Phase parent (lean trio).** This file documents the phase's root purpose and its eight
> work-children only. Heavy docs (`plan.md`, `tasks.md`, `checklist.md`,
> `implementation-summary.md`, `decision-record.md`) live in the children as each is executed.
> The spanning goal is [`goal.md`](goal.md); the formal reversal of this design system's frozen
> "keep React" decision is [`amendment.md`](amendment.md); the layered execution DAG and the
> external-delegate strategy are [`implementation-phases.md`](implementation-phases.md).

## 1. METADATA

- **Phase:** `app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration`
- **Kind:** phase parent; eight work-children — `001`–`007` are the bounded, barrier-gated build
  sequence; `008` is the conventions-authority refactor of the `sk-code-mobile-cli` skill, which
  spans the run (drafts before the first code dispatch, finalizes at cutover).
- **Independence:** `001`–`007` run under barriers — each closes with a hard gate before the next
  opens; `008` is dispatched by timing (draft, then finalize), not by position in the sequence.
- **Execution model:** Claude orchestrates and independently verifies; an external CLI model
  (GLM-5.2 High via `cli-devin`) writes all app code under `src/mobile-app/`. Claude owns
  the folder move, all shared/config/`npm install` work, and every git action.

## 2. PROBLEM & PURPOSE

### Problem Statement

The Pi Remote mobile web app is hard to author as a designer. Two monoliths cause it: all five
"pages" are functions buried inside a 96 KB `App.tsx`, and every presentation rule lives in one
7,931-line `style.css` where a component's CSS sits thousands of lines from its markup. It is
unclear how to change a page or component's HTML/CSS. Code also lives under `apps/`, not `src/`.

### Purpose

Re-home the phone UI onto **SvelteKit 5 / Svelte 5 (runes) in SPA/CSR mode** so every screen and
component becomes **one `.svelte` file** — real HTML markup, a co-located scoped `<style>`, and
typed `<script lang="ts">` logic — the purest one-file HTML/CSS/TS model. Relocate `apps/*` to
`src/*`. Do this as a **design-preserving** rewrite: the shipped look, the accessibility guarantees,
the security posture, and the PWA behavior are held **byte-for-byte** (see [`goal.md`](goal.md)).

## 3. SCOPE

### In Scope

- Rewrite **only** `apps/pi-remote-web` to SvelteKit 5 SPA (`adapter-static`, `ssr=false`,
  `prerender=false`), moved to `src/mobile-app`.
- Move `apps/pi-remote-relay` → `src/relay` (folder relocation only; **no** rewrite).
- Replace react-aria-components with **Bits UI** (primary) + **Melt UI** (composer autocomplete
  only); `@tanstack/react-virtual` → `@tanstack/svelte-virtual`; the bespoke React catalog →
  **Storybook 8 for SvelteKit**.
- Decompose `style.css` into per-component scoped `<style>` blocks (folded into each component
  dispatch), preserving every frozen value and all `@ds guardrail:` fences.

### Out of Scope (frozen)

- `packages/pi-rpc-protocol` and `extensions/*` — stay put, plain TS, untouched.
- Any change to a **rendered token value**, a **security invariant** (see root `goal.md` §3), a
  **routing behavior**, or an **a11y contract**. Such a change is out of scope → stop and escalate.
- The relay's serving model — Tailscale Serve (not the relay) serves the web build, so the relay
  needs **zero** serving changes. `adapter-static` keeps `dist/` output.

## 4. PHASE DOCUMENTATION MAP

| Child | Builds | Parallel? | Barrier gate |
|-------|--------|-----------|--------------|
| [`001-move-and-scaffold`](001-move-and-scaffold/) | folder move (apps→src) + SvelteKit skeleton + `app.css` foundation + all deps | no — Claude infra | build+typecheck+test+test:web+CDP green |
| [`002-ports-and-primitives`](002-ports-and-primitives/) | verbatim `.ts` ports + shared a11y primitives on Bits UI | yes — K parallel, disjoint files | `svelte-check` + primitive smoke stories |
| [`003-feature-dirs`](003-feature-dirs/) | `rich-content/` · `artifacts/` · `attachments/` · `features/ask-question/` | yes — 4 parallel, one per dir | each dir renders in catalog + typecheck |
| [`004-chrome-and-composer`](004-chrome-and-composer/) | shared chrome (parallel) + composer & LeavePlanSheet (serial, focus-risk) | partial | chrome renders + focus/a11y regression tests |
| [`005-views-and-shell`](005-views-and-shell/) | views (Enrollment/Home/Review/Inbox parallel; Session alone) + `+layout` + routes + `goto` | mostly no | end-to-end app runs; 3-URL routing works |
| [`006-catalog`](006-catalog/) | Storybook 8 + mock-context decorator → ~60/64 surfaces live | yes — stories per surface | catalog smoke (light + dark) |
| [`007-verify-and-cutover`](007-verify-and-cutover/) | CSS-corpus builder, token-identity gate, test rewrite, CDP repoint, deep-review, amendment close | yes → barrier | all 9 objective gates green |
| [`008-sk-code-svelte-refactor`](008-sk-code-svelte-refactor/) | completely refactor the `sk-code-mobile-cli` skill (React→Svelte conventions) so every dispatch loads correct guidance | spans the run | draft correct before L1; finalized + `package_skill.py --check` clean at cutover |
| [`009-storybook-experience`](009-storybook-experience/) | Storybook from render catalog to first-class component surface: addons, autodocs, a story-per-component coverage gate | after 007 | coverage gate green; one-command launch a non-technical user can run |
| [`010-context-repo-research`](010-context-repo-research/) | research sweep over five reference codebases → a decision-ready recommendation list | read-only, parallel | recommendations presented; nothing scaffolded without approval |
| [`011-ux-affordances`](011-ux-affordances/) | the home for deliberate operator-requested rendered changes — the one packet allowed to move a pixel | opt-in, per change | each change individually scoped; frozen tokens and a11y contracts still honoured |
| [`012-naming-and-structure`](012-naming-and-structure/) | **phase parent** — one kebab-case grammar, kind-first component names, `shared/` split by responsibility | no — same 148 files as 013 | all three children green; nine gates from the final state |
| [`013-comment-grammar`](013-comment-grammar/) | section banners on the 51 files lacking them; in-section comments rewritten from WHAT to WHY | no — same files as 012 | nine gates green; no rendered change |
| [`014-folder-documentation`](014-folder-documentation/) | 16 READMEs and 7 CODE files onto the `sk-doc` templates, plus the ones missing | after 012 and 013 | every folder explains its feature and its logic |
| [`015-test-lanes`](015-test-lanes/) | glob the logic-test allowlist, stop mocking the virtualizer away, give ESLint a Svelte parser | precondition, runs early | later fixes become provable |
| [`016-relay-correctness`](016-relay-correctness/) | **phase parent** — projection integrity, route authority, connection lifecycle | yes — relay-side, independent of the client queue | all three children green; backend suite green throughout |
| [`017-ask-question-activation`](017-ask-question-activation/) | wire the one relay service never constructed; today every route answers 503 | after 016 | the feature answers from a real service, not a stub |
| [`018-transcript-affordances`](018-transcript-affordances/) | disclosure state that survives scrolling, a distinguishable blanket grant, a transcript that can say stalled | client-side | three affordances land with tests |
| [`019-surface-skill-refresh`](019-surface-skill-refresh/) | re-open `sk-code-mobile-cli` once the conventions have shipped, and merge the branch stranded since 008 | last — describes what shipped | skill teaches the shipped tree; branch merged |

CSS decomposition is **folded into every component dispatch** (each moves its surface's `style.css`
block into that component's scoped `<style>`), not a separate child.

**Cross-repo note (child 008):** the `sk-code-mobile-cli` skill physically lives in the Public
monorepo (`.opencode` here is a symlink into it). Refactoring it dirties the shared Public working
tree, so the finished refactor **lands via an isolated Public worktree, never staged/committed in
the shared checkout** — the same discipline the `004-sk-code-mobile-cli-mode` sibling followed.

## 5. OPEN QUESTIONS

- None blocking. Gate 3 resolved: this phase parent owns the migration; `cli-devin` children
  proceed under the pre-approved child folders without re-asking.
- Folder-name detail confirmed: `src/mobile-app` (web) and `src/relay` (backend), **keeping the
  `@pi-remote/*` package names** so all cross-package imports keep resolving (folder-rename only).

## RELATED DOCUMENTS

- [`goal.md`](goal.md) — the north-star that spans all seven children.
- [`amendment.md`](amendment.md) — the formal reversal of `001-architecture-conventions-tokens`
  research Decision 1 (keep React → SvelteKit 5), clause-by-clause superseded vs carried-verbatim.
- [`implementation-phases.md`](implementation-phases.md) — the layered DAG, the two-engine
  delegation strategy, the barriers, and the per-dispatch contract.
- `../001-architecture-conventions-tokens/research/research.md` — the frozen decisions this phase
  amends (never edits in place).
