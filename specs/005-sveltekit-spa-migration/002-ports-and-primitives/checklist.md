---
title: "Child 002 checklist — ports and primitives sign-off"
description: "Barrier sign-off for the verbatim TypeScript ports and the Bits UI primitive layer, including the verification bar that later proved too low."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-23T09:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 002 — verbatim ports and shared a11y primitives

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Ports are verified by **diff**, primitives by **render**. Those are different questions and deserve
different instruments: a copied file's correctness question is "did anything change", while a
reimplemented wrapper's is "does it still behave".

This checklist records one bar that was set too low at the time. It is marked as such rather than
back-dated to look sufficient.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] L0 barrier confirmed green before dispatching, since parallel units on one worktree are only safe once the foundation is fixed. [evidence: `001-move-and-scaffold` barrier — `npm run build`, `typecheck`, `test`, `test:web`, CDP all exit 0]
- [x] **CHK-PRE-02** [P0] Work partitioned into disjoint file sets so no two parallel units could touch the same file. [evidence: ports live in `shared/data/`, primitives in `shared/primitives/`]
- [x] **CHK-PRE-03** [P1] Attribute contract enumerated before implementation so the primitives had a concrete target. [evidence: `[data-pressed]`, `[aria-pressed]`, `[data-focus-visible]`, `[aria-selected]`, `[aria-disabled]`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean across every new file. [evidence: `svelte-check` clean; `npm run typecheck` exit code 0]
- [x] **CHK-CQ-02** [P0] Ports adjust import paths only and rewrite no logic. [evidence: Claude diff review found no logic drift]
- [x] **CHK-CQ-03** [P1] Runes-split reference pattern established for later children. [evidence: 5 `*.svelte.ts` factories — `app-state`, `hostCommandCatalog`, `useRuntime`, `useSyncSocket`, `useVisualViewportAnchor`]
- [x] **CHK-CQ-04** [P1] Primitives are thin wrappers over Bits UI rather than reimplementations. [evidence: 20 files in `shared/primitives/`, each delegating behaviour and owning only the attribute contract]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Every primitive renders a smoke story in both themes without throwing. [evidence: `node scripts/catalog-smoke-cdp.mjs` — every primitive story rendered in both themes, 0 throws]
- [x] **CHK-TEST-02** [P1] Each attribute the CSS state selectors depend on asserted per primitive. [evidence: smoke stories assert `[data-pressed]`, `[aria-pressed]`, `[data-focus-visible]`, `[aria-selected]`, `[aria-disabled]`]
- [~] **CHK-TEST-03** [P0] Behavioural a11y parity **not** verified at this layer. [deferred: the smoke bar checks attribute presence, not focus trapping, background hiding or dismissal; the gap was found and closed in `../007-verify-and-cutover/a11y-parity-findings.md`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P1] `use:` interaction actions supplied so hover, press and focus-visible state selectors keep working after the react-aria swap. [evidence: `shared/primitives/interactions.ts`]
- [~] **CHK-FIX-02** [P2] `Switch` deliberately not built as a shared primitive. [deferred: one consumer only — `pages/home/PushSettings.svelte:79` hand-rolls `role="switch"`; a single-consumer wrapper abstracts over nothing]
- [~] **CHK-FIX-03** [P0] Accessibility losses introduced by the primitive swap were fixed later, not here. [deferred: 3 P0 plus 7 P1 closed in 007 with `ariaHideOutside.svelte.ts` and the menu focus-trap work]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] `relay.ts` ported whole rather than reshaped, so the ticket and mutation boundary is unchanged. [evidence: `requestTicket`, `reserveAttachmentSet`, `submitPromptWithAttachmentRefs` present in `shared/data/relay.ts` with original semantics]
- [x] **CHK-SEC-02** [P0] No security-boundary logic rewritten in this layer. [evidence: `npm test` exit code 0 across this layer; ports adjust import paths only]
- [x] **CHK-SEC-03** [P1] Artifact size ceiling preserved through the port. [evidence: `MAX_ARTIFACT_BYTES` retained in `shared/data/relay.ts`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P2] Primitive layer carries its own explanation of the attribute contract. [evidence: `shared/primitives/README.md` and `CODE.md`]
- [x] **CHK-DOC-02** [P2] The pure-versus-runes twin pattern documented where a reader meets it. [evidence: `shared/data/README.md` covers the twin pattern and the `$effect` self-invalidation gotcha]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Ports and primitives occupy disjoint directories, which is what made parallel dispatch safe. [evidence: `shared/data/` versus `shared/primitives/`]
- [x] **CHK-ORG-02** [P2] Compound primitives split into composable parts rather than one slot-passing wrapper. [evidence: `Sheet` plus `SheetContent`, `SheetTitle`, `SheetClose`; `Menu` plus `MenuTrigger`, `MenuContent`, `MenuItem`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The barrier passed and the layer shipped. Every later component composes these primitives and imports
these ports.

The honest qualification: REQ-002 asks each primitive to expose the same accessibility surface its
react-aria counterpart did, and the verification performed here checked attributes rather than
behaviour. Real losses hid behind that gap until 007 found them. The requirement is satisfied as of
007, not as of this child, and the checklist says so.
<!-- /ANCHOR:summary -->
