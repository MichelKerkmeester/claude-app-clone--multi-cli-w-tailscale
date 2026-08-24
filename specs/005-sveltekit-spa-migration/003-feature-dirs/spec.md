---
title: "Child 003 — Feature Directories (rich-content, artifacts, attachments, ask-question)"
description: "Rewrite the four already-well-decomposed feature directories to Svelte 5 — rich-content/, artifacts/, attachments/, features/ask-question/ — each as one parallel dispatch. React Context→setContext runes store; hooks→*.svelte.ts factories; workers port verbatim; each surface's style.css block folds into the component's scoped <style>."
trigger_phrases:
  - "svelte rewrite feature dirs rich-content artifacts attachments"
  - "ask-question svelte port"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/003-feature-dirs"
    last_updated_at: "2026-08-23T10:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 — Feature Directories

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../002-ports-and-primitives/spec.md |
| **Successor** | ../004-chrome-and-composer/spec.md |
| **Level** | 2 |
| **Layer** | L2 — 4 parallel cli-devin, one dispatch per directory |
| **Writer** | cli-devin (GLM-5.2 High) → Claude verifies |
| **Barrier** | each dir renders in the catalog + typecheck |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

These four directories are already cleanly decomposed in the React app, so they are the ideal first
components to rewrite — self-contained, disjoint, and each portable by one dispatch. They establish
the component-rewrite pattern (Context→`setContext`, hooks→`*.svelte.ts`, CSS block→scoped `<style>`)
that chrome/views reuse.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — four disjoint directories, one dispatch each** (under `src/lib/`):
- `rich-content/` — markdown/code rendering; `highlight.worker.ts` already ported (child 002).
- `artifacts/` — artifact cards/preview; `pdfjs-dist` kept `optimizeDeps.exclude`.
- `attachments/` — attachment tiles/upload; `attachment-hash.worker.ts` already ported.
- `features/ask-question/` — the inline ask-question card + its client state machine.

**Per directory, each dispatch:**
- React Context → `setContext`/`getContext` runes store; hooks → `*.svelte.ts` factories;
  `useState`→`$state`, `useMemo`→`$derived.by`, `useEffect`→`$effect`/`onMount`, `useRef`→`bind:this`.
- **CSS decomposition folded in:** move this surface's `@ds surface:` block from `style.css` into the
  component's scoped `<style>`; scan every moved selector for cross-boundary reach (child elements,
  `[data-theme]`/`[aria-*]`/`[dir]` context selectors, shared `@keyframes`) and wrap in `:global(...)`.
  Preserve frozen values byte-for-byte; keep all `@ds guardrail:` fences.

**Out of scope:** chrome, composer, views, shell, routing; any token value; shared files; installs.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each directory is disjoint — the four dispatches never share a file.
- **REQ-002** — Rendered output is visually identical to the React version (design-preserving).
- **REQ-003** — Every moved CSS block is scope-audited; no `:global()` leak and no lost containment.
- **REQ-004** — Guardrail fences preserved; the `@ds surface:` marker collapses to once-per-file.
  **Superseded by the 007 census:** once-per-file erases genuinely distinct surfaces in
  multi-surface files, so the rule is once-per-*surface*-per-file.
- **REQ-005** — Value preservation is proven by resolving the CSS, never by screenshot. Under the
  app's CSP a headless render comes out unstyled, so a visual diff would compare two broken pages.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Each of the four directories renders in the Storybook catalog (light + dark) without throw.
- `svelte-check` clean; Claude re-verifies token-identity on the four touched surfaces (0 diffs).
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **R-css (the #1 risk):** Svelte only hashes local-element selectors; a moved block that styles a
  child-rendered element silently stops applying unless wrapped in `:global()`. Every moved block is
  scanned; the token-identity gate catches regressions.
- Depends on L1 (primitives + ports).
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
