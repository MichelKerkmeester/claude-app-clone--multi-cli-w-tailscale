---
title: "Child 008 — Refactor the sk-code-mobile-cli Skill (React→Svelte conventions)"
description: "Completely refactor the sk-code-mobile-cli surface skill so it teaches the SvelteKit 5 / Svelte 5 stack instead of React — SMART ROUTING + surface-detection markers, the @ds grammar's .svelte seam form, the per-component scoped <style> model, the Bits UI / Melt UI mapping, runes verification, and setup/standards. It is the conventions authority every cli-devin dispatch loads, so it drafts before the first code dispatch and finalizes at cutover. The skill lives in the Public monorepo (symlinked); it lands via an isolated Public worktree."
trigger_phrases:
  - "refactor sk-code-mobile-cli skill svelte conventions"
  - "sk-code surface svelte smart routing markers"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-24T05:55:14Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; two open items recorded."
    next_safe_action: "Update svelte-conventions.md to Format A, then merge the branch."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 008 — Refactor the sk-code-mobile-cli Skill (React→Svelte)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../007-verify-and-cutover/spec.md |
| **Successor** | ../009-storybook-experience/spec.md |
| **Level** | 2 |
| **Layer** | spans the run — **draft before L1**, **finalize at L7** (not a position in the sequence) |
| **Writer** | Claude (conventions authority), optional markdown-agent fan-out for mechanical conformance |
| **Cross-repo** | skill lives in the **Public monorepo** (`.opencode` here is a symlink); **land via an isolated Public worktree, never staged in the shared checkout** |
| **Barrier** | draft: correct Svelte guidance before the first dispatch. finalize: `package_skill.py --check` clean |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Every L1+ `cli-devin` dispatch is instructed to load `sk-code` → the `sk-code-mobile-cli` surface for
its frozen tokens, the `@ds` grammar, and the verification method. That surface currently teaches the
**React** stack — react-aria, the single `style.css`, Vite/React config, `.tsx` seams. Left as-is it
would actively mislead every dispatch. It must teach the Svelte stack instead, and it must be correct
**before** the first code dispatch — otherwise the dispatches inherit the wrong conventions.

Because the skill also encodes conventions the migration *discovers* (real runes/scoping/`:global()`
patterns), it is authored in two passes: a **draft** from the known target conventions (the amendment)
before L1, and a **finalize** capturing the proven patterns at cutover.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — refactor the surface at `.opencode/skills/sk-code/sk-code-mobile-cli/`:**
- `SKILL.md` — the **SMART ROUTING** map and the **surface-detection markers** (React/Vite markers →
  SvelteKit markers: `svelte.config.js`, `.svelte` files, `src/mobile-app`, `@sveltejs/kit`); the
  surface contract narrative.
- `references/ds-grammar.md` — the `@ds` grammar's **seam form** moves from `.tsx` to `.svelte`
  (same labels; the `@ds surface:` marker now collapses once-per-file); grammar meaning unchanged.
- `references/editability-guardrails.md` — guardrail fences re-expressed for `.svelte` (logic/a11y/
  security still fenced); the fence semantics are carried.
- `references/workflow-implement.md` · `workflow-debug.md` · `workflow-verify.md` — the doctrine
  rewritten for the runes mapping, the react-aria→Bits/Melt mapping, and per-component `<style>`.
- `references/verification.md` — `svelte-check`, the CSS-corpus builder, and the token-identity
  resolver replace the React verification commands.
- `references/token-library.md` · `component-tokens.md` · `theme-remap.md` · `retint-recipes.md` —
  the three-layer token model is **carried verbatim** (framework-agnostic); only examples that assume
  the single `style.css` are updated to the scoped `<style>` home. No token value changes.
- `references/setup/` · `standards/` — setup/code-standards updated from React/Vite to SvelteKit.
- `references/design-reference/` — the UI teardown/map/screens are largely carried (the UI is
  unchanged); only framework-specific notes are updated.
- `README.md` and the `changelog/` — a new version entry documenting the React→Svelte refactor.

**Out of scope:** any app code (that is children 001–007); any token value; the security posture;
the surface's routing class / advisor visibility (unchanged); `operations/`, `release/`, `quality/`
app-guide content that is framework-agnostic (touched only where it names React).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — **Draft milestone (before L1):** the surface teaches the Svelte stack accurately enough that a
  dispatch loading it produces correct runes / Bits-Melt / scoped-`<style>` / `@ds` output.
- **REQ-002** — **Finalize milestone (at L7):** the proven patterns (real `:global()` scoping rules, the
  runes-split reference, the socket-lifecycle pattern) are folded back in.
- **REQ-003** — Carried-verbatim content (the token model, the `@ds` grammar meaning, the guardrail semantics,
  the design-reference UI) is preserved; only the framework medium changes. **No token value edits.**
- **REQ-004** — The surface contract fields (`packetKind: surface`, read-only `toolSurface`, advisor-invisible,
  routing class) are unchanged.
- **REQ-005** — The finished refactor **lands via an isolated Public worktree**; nothing is staged or committed
  in the shared Public checkout (per the repo-protection memory).
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Draft: a dry-run dispatch against the drafted surface yields conventions-correct Svelte output
  (spot-checked by Claude before L1 opens).
- Finalize: `python3 …/create-skill/scripts/package_skill.py --check` clean on the surface;
  `validate_document.py` 0 issues on every refactored reference/asset; zero broken in-hub links;
  the changelog entry present.
- No React-stack instruction remains where it would misguide a dispatch (grep sweep for
  `react-aria`, `plugin-react`, `style.css` single-file claims in the surface).
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Bootstrapping:** the draft must be right before any pattern is proven; mitigation — draft from the
  amendment's decided conventions, then finalize from real code at L7.
- **Shared-checkout hazard:** editing through the `.opencode` symlink dirties the Public working tree;
  mitigation — author, then land via an isolated Public worktree; never `git add`/commit in the shared
  checkout; never touch the two untracked repos under `specs/context`.
- **Precedent:** the sibling `../004-sk-code-mobile-cli-mode` planned this surface; this child rewrites
  its conventions — read that packet's build-strategy for the hub contract before editing.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
