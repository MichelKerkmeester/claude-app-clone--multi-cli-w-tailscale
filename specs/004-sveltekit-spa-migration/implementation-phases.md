---
title: "Implementation Phases — SvelteKit SPA Migration (layered DAG + delegation strategy)"
description: "The layered execution DAG (L0–L7 with barriers), the two-engine delegation strategy (cli-devin parallel code-gen + deep-review fan-out verification), the conflict-free isolation model, the per-dispatch contract, and the nine objective cutover gates."
trigger_phrases:
  - "sveltekit migration dag delegation strategy"
  - "cli-devin parallel dispatch barriers pi remote"
  - "sveltekit spa migration implementation phases"
importance_tier: "important"
contextType: "implementation"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Implementation Phases — SvelteKit SPA Migration

## 1. Execution model — who writes what

**Claude orchestrates and independently verifies; an external CLI model writes all app code.** The
executor is **GLM-5.2 High via `cli-devin`** (model id `glm-5-2`).

- **Claude authors / runs:** all spec-folder docs (this parent + the eight children + the amendment);
  the folder move + root-config edits + every `npm install` (infra, not app code); the shared
  integration files; **independent verification of every layer** (build / typecheck / test /
  test:web / CDP / token-identity, outside any sandbox); all git; and — because it is the
  conventions authority — child **008** (the `sk-code-mobile-cli` skill refactor), optionally with
  markdown-agent fan-out.
- **cli-devin (GLM-5.2 High) writes:** all app code under `src/mobile-app/` — the SvelteKit
  scaffold, `.svelte` components, scoped `<style>` blocks, `app.css`, Storybook stories, and the
  rewritten tests.

## 2. Two engines, clean split

Grounded in the tooling: `fanout-run.cjs` is **analysis-only** (`deep-review` / `deep-research`, no
code-gen mode). So generation and verification use different engines:

1. **Generation — cli-devin, parallel background dispatch.** Up to **K parallel `devin -p`**
   (K=3), each `--model glm-5-2 --permission-mode accept-edits`, `AI_SESSION_CHILD=1`,
   stdin `</dev/null`, **PID captured**, per-unit log file, **PID-scoped kill** (never blanket
   `pkill`). Within one dispatch, Devin may further fan out via native `run_subagent`.
2. **Verification — deep-review fan-out (`fanout-run.cjs`).** Between layers and at cutover, a
   `deep-review` loop (executor kind `cli-devin`) adversarially verifies the generated tree against
   the frozen contracts. This is what `fanout-run.cjs` is *for*.

## 3. Isolation — conflict-free parallelism on ONE worktree

- Unit of parallelism = **one disjoint directory** under `src/mobile-app/src/lib/`. Parallel
  dispatches never share a file.
- **Shared / integration files are barrier-only** (`app.css`, `+layout.svelte`, `src/routes/*`,
  `svelte.config.js`, `vite.config.ts`, `package.json`, test config) — done sequentially by Claude,
  never inside a parallel batch.
- **All dependency installs happen once in the L0 barrier.** Every parallel dispatch is **BANNED**
  from `npm install` / editing `package.json` / touching config.
- Escalation: a dispatch that strays outside its ALLOWED WRITE PATHS (caught by Claude's per-dispatch
  diff review) is redone in an isolated git worktree.

## 4. The layered DAG (barrier between layers; Claude verifies each before the next)

```
L0  move + scaffold + app.css + deps          [Claude, sequential]     ── barrier ──
    008-draft: sk-code skill teaches Svelte    [Claude, before L1]      ── prerequisite ──
L1  .ts ports ‖ 7 a11y primitives             [K parallel cli-devin]   ── barrier ──
L2  rich-content ‖ artifacts ‖ attachments ‖ ask-question [4 parallel] ── barrier ──
L3  chrome (parallel) + composer, LeavePlanSheet (serial, focus-risk)  ── barrier ──
L4  Enrollment ‖ Home ‖ Review ‖ Inbox → Session (alone) [mostly serial] ── barrier ──
L5  +layout + routes + goto integration       [Claude + 1 dispatch]    ── barrier ──
L6  Storybook stories (parallel) + verification migration [parallel]   ── barrier ──
L7  deep-review fan-out → cutover              [fanout-run.cjs]         ── FINAL GATE ──
    008-finalize: capture proven patterns      [Claude, at cutover]     ── FINAL ──
```

- **L0 → child `001-move-and-scaffold`.** Claude infra. The folder move stays React and stays fully
  green (the existing React suite is the correctness oracle); then the SvelteKit skeleton + `app.css`
  foundation + all deps. Barrier: build+typecheck+test+test:web+CDP green.
- **008-draft (prerequisite before L1).** Because every L1+ dispatch loads the `sk-code-mobile-cli`
  surface for its conventions, that skill must already teach the Svelte stack (runes mapping,
  react-aria→Bits/Melt mapping, per-component scoped `<style>`, the `.svelte` `@ds` seam form,
  `svelte-check`/CSS-corpus verification). The draft is authored from the amendment's known target
  conventions; it is finalized at L7 once the real patterns are proven.
- **L1 → `002-ports-and-primitives`.** K parallel, disjoint files: the verbatim `.ts` ports run
  alongside the shared a11y primitives (Button + thin Bits UI wrappers Sheet/Menu/ToggleGroup/
  RadioGroup/Switch/Collapsible). Barrier: `svelte-check` + primitive smoke stories.
- **L2 → `003-feature-dirs`.** 4 parallel, one dispatch per already-well-decomposed dir. Barrier:
  each dir renders in the catalog + typecheck.
- **L3 → `004-chrome-and-composer`.** Chrome components in parallel; the composer + LeavePlanSheet
  **serial and single-focus (K=1)** because they hand-roll focus/IME. Barrier: chrome renders +
  focus/a11y regression tests (LeavePlanSheet `activeElement`, composer IME/slash).
- **L4 → `005-views-and-shell` (views half).** Enrollment/Home/Review/Inbox parallel; **Session
  alone** (owns the socket + virtualizer). Barrier folds into L5.
- **L5 → `005-views-and-shell` (shell half).** Claude + one dispatch: `+layout.svelte`, `src/routes/*`,
  `goto`/`afterNavigate` routing. Barrier: end-to-end app runs; the 3-URL routing works.
- **L6 → `006-catalog` + verification migration.** Storybook stories in parallel with the
  verification-migration groundwork. Barrier: catalog smoke (light + dark).
- **L7 → `007-verify-and-cutover`.** CSS-corpus builder, the committed token-identity gate, the
  test rewrite, the CDP repoint to the built preview, a deep-review fan-out, then cutover. Barrier:
  all nine objective gates green (§6). **008-finalize** and the amendment close happen here.

## 5. Per-dispatch contract (every cli-devin prompt carries)

- `Spec folder: <phase-child> (pre-approved, skip Gate 3)`.
- **ALLOWED WRITE PATHS:** exactly this unit's directory — nothing else.
- **BANNED:** `npm install`, editing `package.json` / config / shared files, changing any token value
  / security invariant / routing behavior / a11y contract, deletes outside scope.
- **Load `sk-code`** → the `sk-code-mobile-cli` surface (frozen `--pi-*` tokens, the `@ds` grammar,
  the verification method) + **`sk-design-md-generator`** with a `DESIGN_DISPATCH_MANIFEST` pinning
  the frozen ink-on-parchment tokens (design-preserving — build against measured tokens, never
  re-design). Prompt-craft follows `sk-prompt/sk-prompt-models` for `glm-5-2`.
- The exact React source file(s) to port + the runes mapping + the react-aria→Bits/Melt mapping for
  this unit.
- **Verification demand-back:** the child returns its `svelte-check` result + which surface blocks it
  moved; **Claude re-verifies independently outside the sandbox** (diff review + typecheck +
  token-identity on touched surfaces) before the barrier.

**Concurrency K=3** (tunable): GLM-5.2 High is a capable, free generator, but **Claude's independent
verification is the throughput bottleneck**, so 3 in flight keeps verification honest. **K=1** for the
focus-sensitive units (composer, LeavePlanSheet) and the shell integration.

**Model-fit backstop:** GLM-5.2 High (`glm-5-2`) is a high-thinking general-generation model and free
— a good fit for the bounded per-directory units. Two limits to respect: its **200K context** (vs a
1M-context tier) keeps units bounded (already the strategy — one directory each, never the whole
tree), and any model can still slip on the reasoning-heavy units (runes port, react-aria→Bits/Melt
a11y parity, CSS `:global()` scoping fixups). Mitigation: Claude's per-dispatch verification is the
backstop, and a stalled unit escalates to a stronger model (`glm-5-2-max` or `grok-4-6-high`) **for
that unit — flagged to the user first, since those are paid tiers** — per the cli-devin
model-selection guidance.

## 6. Verification — the nine objective cutover gates (all must pass)

1. `npm run build` exit 0 (protocol → relay → web → extensions).
2. `npm run typecheck` exit 0 (web = `svelte-check`).
3. `npm test` exit 0 — **green throughout** (backend is framework-independent; a leak detector).
4. `npm run test:web` exit 0 (new Svelte suite).
5. **Token-identity resolver:** resolved token map (all 3 theme states) === the L0 snapshot,
   **0 diffs** (CHANGED 0 / VANISHED 0 / ADDED 0).
6. **Contrast:** every WCAG pair ≥ threshold (unchanged arithmetic) + all corpus guardrail regexes
   match; **≥76 guardrail fences** preserved.
7. **CDP structural:** 390 px, zero horizontal overflow, both themes, against the built preview.
8. **Catalog smoke:** every component-backed surface renders in Storybook (light + dark) w/o throw.
9. `validate.sh specs/004-sveltekit-spa-migration --strict` exit 0.

Child 008 adds one non-app gate: `package_skill.py --check` clean on the refactored
`sk-code-mobile-cli` surface, landed via an isolated Public worktree.
