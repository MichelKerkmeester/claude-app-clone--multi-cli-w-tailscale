---
title: "Child 004 checklist — chrome and composer sign-off"
description: "Barrier sign-off for the chrome ports and the two focus-sensitive units, including what jsdom could not reach."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/004-chrome-and-composer"
    last_updated_at: "2026-08-23T10:20:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 004 — chrome and composer

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Chrome is checked by render; the focus-sensitive units are checked by assertion. That split is the
point of this child — a screenshot cannot tell you where focus landed, and the difference between
react-aria and Bits UI on open is exactly that.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] L2 barrier confirmed green before starting, since the chrome sits above the feature directories. [evidence: `003-feature-dirs` barrier — catalog render pass, `svelte-check` clean, `token-identity.mjs` 0 diffs]
- [x] **CHK-PRE-02** [P0] Work split by focus sensitivity rather than by file conflict, since the files are disjoint either way. [evidence: chrome dispatched in parallel; `LeavePlanSheet` and the composer run alone]
- [x] **CHK-PRE-03** [P1] The composer's governing property fixed before implementation. [evidence: `ComposerCommandAutocomplete.svelte:7` states the contract — focus never leaves the textarea, so every autocomplete decision follows from it]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean across the layer. [evidence: `svelte-check` clean]
- [x] **CHK-CQ-02** [P1] Chrome delivered and composing the shared primitives. [evidence: 34 files in `pages/chat/chrome/`, plus 11 in `shared/chrome/`]
- [x] **CHK-CQ-03** [P1] Pure presentation logic kept out of the components. [evidence: `planModePresentation.ts` holds the plan-mode derivations]
- [x] **CHK-CQ-04** [P0] Slash detection not re-implemented. [evidence: `deriveSlashTrigger` used unmodified from its 002 port — the safest change to the drift-prone part was none]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Chrome renders in the catalog, light and dark, without throwing. [evidence: `node scripts/catalog-smoke-cdp.mjs` pass]
- [x] **CHK-TEST-02** [P0] LeavePlanSheet focus parity asserted rather than observed. [evidence: `LeavePlanSheet.svelte.test.ts` asserts `activeElement` is the stay control]
- [x] **CHK-TEST-03** [P0] Composer focus retention and slash-trigger parity covered. [evidence: `SessionComposer.svelte.test.ts` 48 tests and `ComposerCommandAutocomplete.svelte.test.ts` 54 tests]
- [x] **CHK-TEST-04** [P1] Composer tools accessibility covered separately. [evidence: `composer-tools-a11y.svelte.test.ts`]
- [~] **CHK-TEST-05** [P1] Interact-outside dismissal and the real focus-trap redirect not asserted here. [deferred: jsdom can simulate neither; both live in the CDP gate, and the 007 skips record that rationale at the point of skip]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Dialog auto-focus overridden explicitly rather than trusted. [evidence: `LeavePlanSheet.svelte:85-87` prevents the default and calls `stayEl.focus`]
- [x] **CHK-FIX-02** [P1] Deferred re-focus fallback for the case where the dialog moves focus after mount. [evidence: `LeavePlanSheet.svelte:103` re-focuses on a zero-delay timer]
- [x] **CHK-FIX-03** [P0] Autocomplete options kept out of the tab order so the caret never leaves the textarea. [evidence: options carry `aria-activedescendant` and are never focusable — `ComposerCommandAutocomplete.svelte`]
- [~] **CHK-FIX-04** [P2] Melt UI never adopted. [deferred: `@melt-ui/svelte` is not a dependency; once the autocomplete never takes focus, a popover library's main contribution is focus management this surface does not want]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Plan-mode authority stays host-side; the chrome only reflects it. [evidence: `planModePresentation.ts` derives display state from the runtime snapshot and grants nothing]
- [x] **CHK-SEC-02** [P0] Model and effort changes remain ticketed mutations rather than local state flips. [evidence: `ModelEffortSheet` routes through the runtime mutation boundary in `shared/data/runtime.ts`]
- [x] **CHK-SEC-03** [P1] Backend suite green across the layer, confirming nothing leaked into the relay. [evidence: `npm test` exit code 0]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P2] The chrome directory carries its own structural explanation. [evidence: `pages/chat/chrome/README.md` and `CODE.md`]
- [x] **CHK-DOC-02** [P1] The autocomplete's focus contract documented at the top of the component, where a future editor meets it first. [evidence: `ComposerCommandAutocomplete.svelte:7` explains why options use `aria-activedescendant` and stay out of the tab order]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Chat-specific chrome separated from app-level chrome. [evidence: 34 files in `pages/chat/chrome/` versus `Header`, `StatusPill`, `ThemeControl` and friends in `shared/chrome/`]
- [x] **CHK-ORG-02** [P2] Each chrome component's CSS folded into its own scoped style block, scope-audited on the 003 checklist. [evidence: `style.css` blocks moved per component with values preserved]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The barrier passed and the layer shipped. Focus parity is provable rather than assumed, which was the
point of running these two units alone.

Two qualifications stand. Melt UI was never adopted, so the spec's `createPopover` approach describes
a plan rather than the code. And jsdom cannot reach interact-outside dismissal or the real focus-trap
redirect, so those behaviours are covered only by the CDP gate.
<!-- /ANCHOR:summary -->
