---
title: "Amendment — Component architecture: keep React → SvelteKit 5 SPA"
description: "Formal amendment reversing Decision 1 of 001-architecture-conventions-tokens research (keep React + single style.css + react-aria) in favor of SvelteKit 5 / Svelte 5 runes with per-component scoped <style> and Bits UI / Melt UI. States clause-by-clause what is superseded vs carried verbatim; Decisions 2 and 3 are carried, not re-decided."
trigger_phrases:
  - "sveltekit amendment component architecture"
  - "reverse keep react decision design system"
  - "sveltekit spa migration amendment"
importance_tier: "important"
contextType: "implementation"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Amendment — Component architecture: keep React → SvelteKit 5 SPA

## 1. What this amends and why

The research at `../001-architecture-conventions-tokens/research/research.md` records three
**DECIDED — build-ready** decisions and explicitly allows a later child to propose an *amendment*
via the spec amendment route "if it finds a genuine blocker, documented with evidence." This file
invokes that route.

**The blocker (evidence).** The stated product problem is that the app "is not designer-friendly"
and "it's not clear at all how to change the HTML/CSS of a page or of a component." Decision 1 keeps
the two structures that *cause* that problem: all five views are functions inside a 96 KB `App.tsx`,
and all presentation lives in one 7,931-line `style.css` where a component's CSS sits thousands of
lines from its markup. Decision 1 formalized the *conventions* of that layout but did not dissolve
the monoliths. The user's chosen remedy — an authoring model closer to separated HTML/CSS/TS while
staying TypeScript — requires a framework where a component is **one file** with co-located,
**structurally scoped** CSS. React with a single global stylesheet cannot provide that; Svelte 5 can.

**The decision.** Rewrite `apps/pi-remote-web` to **SvelteKit 5 / Svelte 5 (runes) in SPA/CSR mode**.
This **supersedes Decision 1 only.** Decisions 2 and 3 are **carried forward, not re-decided** —
they are framework-agnostic and this amendment preserves their substance.

This is a design-*preserving* rewrite. No rendered value, no security boundary, and no a11y contract
changes; see [`goal.md`](goal.md) §3–4 for the acceptance authority.

## 2. Decision 1 — SUPERSEDED (clause by clause)

| Decision 1 clause (superseded) | Replaced by |
|--------------------------------|-------------|
| Keep the single `src/style.css` as the sole presentational authority; no per-component CSS, no `<style>` tags | Each component is **one `.svelte` file** with a co-located **scoped `<style>`**. A global `app.css` keeps only the foundation (`@theme`, `@font-face`, the three `data-theme` blocks, resets, the global guardrail media queries, and ~10 shared/convention surfaces). |
| Keep the surface-grouped flat `src/*.tsx` layout; the ~55 semantic components are the API; no `components/` dir | Same *semantic* decomposition, re-homed under `src/mobile-app/src/lib/` as `.svelte` files grouped by the identical surfaces (`rich-content/`, `artifacts/`, `attachments/`, `features/ask-question/`, chrome, views). The component set and its names are unchanged. |
| react-aria (v1.11) owns behavior and state | **Bits UI** (component-level, Svelte 5) is the primary a11y primitive; **Melt UI** builders back only the composer autocomplete (focus must stay in the textarea). The a11y contract — roles, focus order, focus trapping, `aria-*` — is held identical and proven by regression tests. |
| Tailwind-4 `@theme` block; states via react-aria `data-*` attribute selectors; variants via class suffixes; parts via named slot classes | Tailwind-4 `@theme` **carried** (foundation `app.css`). States stay **`data-*`/`aria-*` attribute selectors** (Bits UI emits the same attribute hooks react-aria did); variants stay **class suffixes**; parts stay **named slot classes**. The selector grammar is unchanged; only the element that emits the attributes moves from a react-aria component to a Bits UI one. |
| Runtime state via React (`useState`/`useReducer`/`useMemo`/`useEffect`/`useRef`/Context) | Svelte 5 **runes**: `$state`, pure reducer + `$state` dispatch, `$derived.by`, `$effect`/`onMount`, `bind:this`, `setContext`/`getContext`; hooks become `*.svelte.ts` factories. The pure reducers (`state.ts`) port **verbatim**. |
| The bespoke React catalog | **Storybook 8 for SvelteKit** (`@storybook/sveltekit`) with a mock-context decorator over `demo.ts` fixtures. |

## 3. Decision 2 — CARRIED (with a medium change, not a substance change)

Decision 2 (the designer-editability model) is **preserved in substance**:

- **Token-first CSS + the `@ds` inline-comment grammar** (`@ds surface:` `@ds slot:` `@ds state:`
  `@ds variant:` `@ds edit:` `@ds guardrail:` `@ds end`) is **carried**. It is framework-agnostic:
  it labels seams in CSS and in markup, and both still exist.
- **Guardrail fences are carried.** Logic, a11y wiring, and the security boundary stay
  `@ds guardrail:`-fenced and unreachable to a designer. All **≥76 fences are preserved**.
- **Two changes, both mechanical:** (a) the "narrow labelled seams in each `.tsx`" become **seams in
  each `.svelte` file** — the same labels, a different host file; (b) because Svelte scopes every
  `<style>`, containment is now enforced **structurally**, so the `@ds surface:` correlation marker
  collapses to **once per file** (it no longer has to re-assert which stylesheet region belongs to
  which component — the file boundary already says so).

Child 008 (`008-sk-code-svelte-refactor`) rewrites the `sk-code-mobile-cli` skill's `ds-grammar.md`
and `editability-guardrails.md` to teach the `.svelte` seam form; the grammar's meaning is unchanged.

## 4. Decision 3 — CARRIED VERBATIM

Decision 3 (the three-layer token library) is **preserved unchanged**:

- **Three layers:** primitive (`--pi-*` frozen raw values) → semantic/role (themed `:root` roles,
  remapped per theme) → component (thin per-surface aliases resolving to semantic tokens).
- **No token build step.**
- **WCAG AA via the on-ink/on-surface pairing invariant + the machine-checkable contrast manifest**
  over the semantic→primitive map.

The **only** change is *where the component-layer aliases live*: they move from the single stylesheet
into each component's scoped `<style>`. They resolve **identically** — CSS custom properties inherit
into scoped blocks unchanged — and the token-identity resolver (all three theme states, 0 diffs)
proves it. The frozen palette values, Inter + Source Serif 4, light/dark/system theming, WCAG AA, and
`≥44px` targets are all carried verbatim.

## 5. How this is recorded (no in-place edit of the frozen decision)

- The research file's decision table is **not edited**. A single forward-pointer line is added atop
  its status blockquote directing readers here.
- The supersession is encoded as a graph edge: this child's `graph-metadata.json` lists the research
  packet under `manual.supersedes`.
- This amendment plus [`goal.md`](goal.md) and [`spec.md`](spec.md) are the authority for the new
  component architecture; Decisions 2 and 3 remain authoritative in the original research file.
