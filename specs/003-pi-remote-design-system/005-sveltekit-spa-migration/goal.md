# SvelteKit SPA Migration — Program Goal

> The north-star that spans every child of this phase parent. When a child's local plan disagrees
> with this file, this file wins. It is scoped to the migration; the product goal remains the root
> [`goal.md`](../../../goal.md). This document is the durable plan of record — the structured
> overview, the execution rules, and the live status of every phase.

---

## 1. The goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** so every screen and component is
authored as **one `.svelte` file** — HTML markup, its own scoped CSS, and typed logic together —
making the app genuinely designer-editable, while **preserving byte-for-byte** the shipped look, the
accessibility guarantees, the security posture, and the PWA behavior.

A designer opens one file and sees the whole component. Cross-component style leaks become
structurally impossible (Svelte scopes every `<style>`). Nothing about what the app *does* or how it
*looks* changes. **Re-hosting, not redesign** — build against the frozen `--pi-*` tokens; never change
a rendered value.

## 2. Why this is safe to do

The migration is a re-hosting. Three properties make "nothing changed" verifiable rather than hoped-for:

- **The design system is already token-first.** Every rendered value resolves through `--pi-*`
  primitives → semantic roles → component aliases. Moving a rule from one stylesheet into a scoped
  `<style>` does not change what a token resolves to — CSS custom properties inherit into scoped
  blocks unchanged.
- **The behavior lives in framework-agnostic TypeScript.** `relay.ts` (the WebSocket client),
  `state.ts` (pure reducers), `cache.ts`, `auth.ts`, `effort.ts`, and the pure halves of
  `runtime.ts`/`commands.ts` have zero React imports and port verbatim.
- **The backend is untouched.** The relay, protocol, and extensions stay plain TypeScript. Tailscale
  Serve — not the relay — serves the web build, so `adapter-static` keeping `dist/` output means the
  relay needs zero serving changes. The backend suite is a leak-detector: it must stay green
  throughout, proving the rewrite never reached across the boundary.

## 3. Invariants held across every child

These do not move. Any child that would change one is out of scope → stop and escalate.

- **Every rendered token value is identical** in all three theme states (light, dark, system).
- **Every security invariant** still holds — loopback relay, tailnet-only ingress (Funnel off),
  foreground authority for mutations, redaction everywhere, mutation approval-gated and default-off,
  ticketed revision-checked control, host-enforced plan mode, content-free push. The phone still
  cannot enable full-access mode.
- **Every a11y contract** survives the react-aria → Bits UI / Melt UI swap — roles, focus order,
  focus trapping, `aria-*` wiring, `≥44px` targets, reduced-motion and forced-colors guardrails.
- **The routing behavior is identical** — the same three URLs (`/`, `/session/[id]`,
  `/attention/[lookupId]`), Review/Inbox as overlay state, Enrollment as an auth branch.
- **The PWA behaves identically** — installable, offline shell, the `/attention/:lookupId` deep link.
  The one deliberate change is the service-worker shell path (`/assets/` → `/_app/immutable/`) with a
  bumped cache name.

## 4. The acceptance authority for "nothing changed"

The claim is proven by machine checks, not inspection. The nine objective gates:

`build` · `svelte-check` · `npm test` (backend leak-detector) · `test:web` · **token-identity 0-diff**
(resolve every token in all 3 themes from a corpus of every scoped `<style>` + `app.css`, diff vs the
pre-migration snapshot → CHANGED 0 / VANISHED 0 / ADDED 0) · **contrast + ≥76 `@ds guardrail:` fences**
· **CDP 390px** (zero horizontal overflow, both themes, against the built preview) · **catalog-smoke**
(every story renders light+dark, 0 throws) · `validate.sh <packet> --strict`.

## 5. Execution model

- **Autonomous graph-loop.** Work all phases dependency-ordered: finish a node → pass its gate →
  advance to the next unblocked node; run independent nodes in parallel (e.g. research ‖ the comment
  pass). Do not hold for per-step go-ahead — proceed, verify, commit, push. **Stop + escalate only on:**
  a broken invariant (Logic-Sync), a red gate that resists bounded repair, or a destructive/irreversible
  act (mass-delete >100 files, history rewrite, force-push).
- **Who writes what.** Claude orchestrates, **verifies each layer**, and owns git, barrier/shared
  files, config, and `npm install`. An external executor writes `app-mobile/**` source (one directory
  per dispatch; BANNED from install/config/token/security/routing/a11y changes). Claude diff-inspects
  (comment-only) and runs the gates.
- **Executor routes (as discovered live in this environment).** Working: **luna** via the opencode
  `openai` provider (`openai/gpt-5.6-luna[-fast]`); **GLM-5.2** via **cli-devin** (`glm-5-2`, free);
  **stealth/ox-alpha** via `openrouter` for `cli-pi` story writes (rate-limits intermittently). Walled
  here: deepseek-direct (402 balance), opencode-go (429 monthly), openrouter-deepseek (402 credit),
  `zai-coding-plan` GLM (provider not configured in opencode), `cli-pi`/openai-codex (its own auth,
  had expired). Deep-research needs `SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1` + `NODE_PRESERVE_SYMLINKS=1`
  and its executor bound with the `=` form (`--executor=cli-devin --model=glm-5-2`).

## 6. Research → recommendations → approval (STANDING RULE)

Research is background enrichment that **feeds** the phases; it never blocks a phase and never
overrides a frozen contract. **New:** findings from research may spawn **new phases** or **update
existing phases** to implement their recommendations — but **every research-surfaced recommendation is
presented to the operator first. Nothing is scaffolded (no new phase folder, no plan edit) without
explicit approval.** The flow is: run research → synthesize recommendations → **present the full list
to the operator** → operator selects → only then scaffold/update phases.

## 7. The phase graph (plan of record)

### Layer 1 — Core migration (children `001`–`007`) — the barrier-gated DAG
| Child | Scope |
|---|---|
| `001` move-and-scaffold | `apps/→src/`, SvelteKit skeleton, `app.css` foundation, all deps |
| `002` ports-and-primitives | verbatim `.ts` ports + Bits UI primitives (Button/Sheet/Menu/ToggleGroup/RadioGroup/Switch/Collapsible) |
| `003` feature-dirs | rich-content · artifacts · attachments · ask-question |
| `004` chrome-and-composer | shared chrome + composer & LeavePlanSheet (hand-rolled focus/IME) |
| `005` views-and-shell | Enrollment/Home/Review/Inbox/Session + `+layout` + `goto` routing |
| `006` catalog | Storybook 9 + mock-context decorator |
| `007` verify-and-cutover | CSS-corpus builder, token-identity gate, test rewrite, CDP repoint, cutover |

### Layer 2 — Quality/DX pass
- **`007-EXT`** — risk-ascending, per dimension. HARD: zero rendered-value/a11y/security/routing change,
  proven by the 9 gates + a per-file unchanged-fence-TEXT diff.
  - **(a) Inline comments — TOP PRIORITY.** Segment **every** file into labelled comment SECTIONS,
    with `@ds` grammar + durable WHY, no ephemeral labels (no spec paths / task ids in comments).
    **Refined rule: the comment work must mimic sk-code/opencode ~1:1 in style and usage** — full-width
    box-drawing dividers (`// ─────…`) and the labeled `// ─── Label ───` variant, matching how the
    sk-code skill's own source is structured.
  - (b) Architecture: `$shared` alias, module boundaries, `*.svelte.ts` factories.
  - (c) Styling structure: scoped `<style>` + `app.css` token layering.
  - (d) Docs: per-folder READMEs (code + feature), onboarding, tsconfig prune, editor config.
- **`008` sk-code-mobile-cli refactor** *(this surface ONLY — not the sk-code hub).* Encode + lint the
  007-EXT conventions (incl. comment segmentation) into the **`sk-code-mobile-cli`** surface so every
  future executor/Claude edit to `app-mobile/**` stays on-pattern. Deliverables: `svelte-conventions.md`
  (authoring layer) + `SKILL.md` routing/detection.
- **`009` storybook-experience** — dummy-proof + self-maintaining catalog.
  - R1 one-command launch (auto-open) + quickstart · R2 addons (a11y/themes/autodocs/designs; vitest
    deferred — duplicates catalog-smoke) · R3 story-per-component + coverage gate + reasoned allowlist ·
    R4 self-maintaining (`story:new` scaffold + executor upkeep rule) · R5 autodocs + usage guide ·
    R6 co-located structure · R7 no regressions.

### Layer 3 — Cleanup
Drop the 3 retired `style.css`-oracle scripts (build-app-css / css-corpus / decl-equivalence) now that
CSS lives in scoped `<style>`.

### Parallel — Research (`010-context-repo-research`)
Per the 5 read-only `specs/context/` sibling chat repos: a fresh xhigh pass scopes angles
(ease-of-use · architecture · UX · logic) → **10 deep-research iterations** each. Findings feed
007-EXT/008/009 under the §6 approval rule.

## 8. Current status (live)

- **Core migration (001–007): ✅ done**, React deleted, board green, on GitHub.
- **007-EXT:** docs/architecture ✅. Comments: **85/109 files sectioned + pushed**; ~24 small leaves
  unsectioned; **the 1:1 sk-code/opencode style alignment is NEW open work.**
- **008: committed**, but `svelte-conventions.md` is not at the live skill path — **verify it landed on
  live Public, not a stranded branch.**
- **009: ~90%.** Machinery/addons/docs ✅ (R1/R4/R5/R6/R7; R2 ~80%). **R3: 21 of 27 story gaps filled**
  (verified — catalog-smoke 0 throws — and pushed); the last **6** (Chat, Enrollment,
  AttachmentPreviewDialog, AttachmentRail, PushSettings, RootErrorBoundary) are in progress.
- **Cleanup: ✅ done.**
- **Research: 3/5 landed** (ogam, mobilecli, nodeterm — pushed). openclaude-android + remote-for-opencode
  **not yet landed** — blocked on deep-research invocation issues (provider walls, Gate-3 stall, executor
  flag binding), not on content. Needs the operator's known-good GLM/cli-devin invocation.
- **Git: all work pushed to `origin/main`** (the remote now redirects to `remote-cli-agent-chat`).

## 9. Open work (next unblocked nodes)

1. **009** — finish the last 6 stories (executor on a working provider), gate, commit; then 009
   completion docs + `validate.sh --strict`.
2. **007-EXT comments** — bring the sections to a 1:1 sk-code/opencode match and close the ~24 gaps.
3. **008** — confirm the skill doc is on live Public.
4. **Research** — land openclaude-android → remote-for-opencode for 5/5; then **present recommendations
   (per §6) before scaffolding any research-driven phase.**

## 10. Done looks like

- The app runs as a SvelteKit 5 SPA; a designer edits any screen in one `.svelte` file; leaked styles
  are structurally impossible.
- All nine gates green; token-identity reports zero diffs.
- Every source file is segmented into sk-code/opencode-style comment sections; the `sk-code-mobile-cli`
  skill teaches the Svelte stack so future work auto-loads the conventions.
- Storybook is a one-command, self-maintaining, fully-covered catalog.
- The 5 research packets are landed and their recommendations have been **presented and dispositioned**
  (approved → scaffolded, or declined) under the §6 rule.
- The design-system spec records the React→SvelteKit reversal as a formal amendment.
