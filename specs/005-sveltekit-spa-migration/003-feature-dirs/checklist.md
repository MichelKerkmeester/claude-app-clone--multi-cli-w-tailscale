---
title: "Child 003 checklist — feature directories sign-off"
description: "Barrier sign-off for the four parallel feature-directory ports and their folded-in CSS decomposition."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/003-feature-dirs"
    last_updated_at: "2026-08-23T10:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 003 — feature directories

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Two gates with different blind spots. The catalog answers "does it draw"; the token-identity resolver
answers "did any value move". Neither answers "does a `:global()` reach further than it should", which
is why the per-block scope audit is itself a checked item rather than an assumed practice.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] L1 barrier confirmed green, since these directories compose its primitives and import its ports. [evidence: `002-ports-and-primitives` barrier — `svelte-check` clean, smoke stories pass]
- [x] **CHK-PRE-02** [P0] Four directories confirmed genuinely disjoint before dispatching in parallel. [evidence: `rich-content`, `artifacts`, `attachments`, `features/ask-question` share no file]
- [x] **CHK-PRE-03** [P1] Scope-audit checklist established before any CSS moved. [evidence: child-rendered elements, `[data-theme]` / `[aria-*]` / `[dir]` context selectors, shared `@keyframes`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean across all four directories. [evidence: `svelte-check` clean]
- [x] **CHK-CQ-02** [P1] React Context converted to runes stores and hooks to factories on the established pattern. [evidence: 3 factories in `features/ask-question` — state, mutation, keyboard navigation]
- [x] **CHK-CQ-03** [P1] All four directories delivered. [evidence: 4/4 delivered — `rich-content` 21 files, `artifacts` 46, `attachments` 13, `features/ask-question` 21]
- [x] **CHK-CQ-04** [P1] `pdfjs-dist` kept out of dependency optimisation so the artifact viewer keeps working. [evidence: `optimizeDeps.exclude` retained in `vite.config.ts`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Every directory renders in the catalog, light and dark, without throwing. [evidence: `node scripts/catalog-smoke-cdp.mjs` pass across all four]
- [x] **CHK-TEST-02** [P0] No token value moved on the touched surfaces. [evidence: `token-identity.mjs` 0 diffs, verified independently by Claude]
- [x] **CHK-TEST-03** [P1] Value preservation checked by CSS resolution rather than screenshot. [evidence: `node scripts/token-identity.mjs` resolves the CSS; under CSP a headless render is unstyled, so a screenshot diff would compare 2 broken pages]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Every moved CSS block scope-audited before its dispatch was accepted. [evidence: every block checked against the `@ds surface:` audit list before its dispatch was accepted]
- [x] **CHK-FIX-02** [P0] Cross-boundary selectors wrapped so they keep applying after scoping. [evidence: 73 `:global(` occurrences across the three chat feature directories]
- [x] **CHK-FIX-03** [P1] Guardrail fences preserved through every move. [evidence: `@ds guardrail:` count held; 277 present program-wide today against a floor of 76]
- [~] **CHK-FIX-04** [P2] An over-reaching `:global()` remains invisible to both gates. [deferred: it styles what it should not while the catalog and the resolver stay green; the per-block audit is the only defence]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Rich-content rendering keeps its sanitisation boundary through the port. [evidence: `npm test` rich-content security assertions green, re-verified against the Svelte sources]
- [x] **CHK-SEC-02** [P1] Artifact size ceiling and read-error codes unchanged by the artifacts port. [evidence: `MAX_ARTIFACT_BYTES` and `artifactReadDisplayCode` still sourced from `shared/data/relay.ts`]
- [x] **CHK-SEC-03** [P1] Attachment hashing still runs in its worker rather than on the main thread. [evidence: `attachment-hash.worker.ts` ported verbatim in 002 and composed unchanged here]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P2] Each substantial feature directory carries its own explanation. [evidence: `README.md` plus `CODE.md` in `rich-content`, `artifacts`, `attachments`, `features/ask-question`]
- [x] **CHK-DOC-02** [P2] Surface markers retained so the catalog coverage gate can key off them. [evidence: 8 markers rich-content, 37 artifacts, 5 attachments]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] One directory per dispatch, disjoint by construction. [evidence: 4/4 dispatches disjoint — 0 shared files between `rich-content`, `artifacts`, `attachments`, `features/ask-question`]
- [x] **CHK-ORG-02** [P2] Component and its styles now live in one file, which was the point of the migration. [evidence: each surface's block moved from `style.css` into a scoped `<style>`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

All four directories shipped and the barrier passed. Every later layer composes them unchanged.

One requirement was superseded rather than met as written: REQ-004's "collapse `@ds surface:` to
once-per-file" would have erased genuinely distinct surfaces in multi-surface files. The 007 census
corrected it to once-per-surface-per-file, and `artifacts/` carries 37 markers under that rule.
<!-- /ANCHOR:summary -->
