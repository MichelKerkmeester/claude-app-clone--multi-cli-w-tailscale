---
title: "Acceptance Criteria: Phase 15 Storybook designer adjustability"
description: "The criteria this phase must satisfy before it may be closed, each one met by a named measurement rather than by inspection, or waived by a decision record."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T15:05:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the closure gate; all eight criteria met with named measurements."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---
# Acceptance Criteria: Phase 15 Storybook designer adjustability

<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
<!-- HVR_REFERENCE: .opencode/skills/sk-doc/shared/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability
**Level:** 2
**Status:** Complete
**Date:** 2026-08-29
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given an override stored the way the playground stores it, When a different story is opened, Then that story's computed token carries the override, and clearing it restores the shipped value | `node scripts/token-override-check.mjs` — `--accent` on `views-header--default` reads `#d97757`, then `#00ff00`, then `#d97757`; exit 0 | Met | - |
| AC-002 | REQ-002 | Given a story that needs state a component does not expose, When the story is authored, Then no prop, slot or export is added to the component to serve it | An `initialOpen` prop and a `children` slot from a first attempt were reverted; `composer-tools.svelte` and `sheet-model-effort.svelte` read byte-identical to their committed state; allowlisted story hosts compose the real components instead | Met | - |
| AC-003 | REQ-003 | Given the committed screenshot archive, When this phase's work lands, Then every story keeps its name and no shot moves except as a named state fix carrying a before and after | Seven shots moved, each listed in `implementation-summary.md` with what it rendered before and after; all seven reproduced byte-identically across two full captures; the two that differed between runs were the known pre-existing flake families and were restored | Met | - |
| AC-004 | REQ-004 | Given the catalog can retune tokens, When a retune is exported, Then it is text to paste and no stylesheet is written | The playground's Copy CSS returns only changed properties as a `:root` block; `node scripts/token-identity.mjs verify app-mobile/src/app.css` matches all 39 goldens across light, dark and system | Met | - |
| AC-005 | REQ-005 | Given a page view whose state hides behind an object prop, When a designer opens it, Then the state is reachable from a control rather than by editing a literal | Synthetic controls measured on home, chat, review, inbox, enrollment and the composer: roster ready to empty takes rendered cards 2/0, session count 1 to 4 gives 1/2, `pendingCount:0` takes buttons 6/1 | Met | - |
| AC-006 | REQ-006 | Given a control the catalog exposes, When two of its values are rendered at the block count its own stories use, Then the DOM differs | `node scripts/catalog-state-visibility.mjs` passes over 337 stories and goes red when the streaming append is disabled; `streamingState: 'token'` was inert at the default count and now differs at counts 1, 3 and the default | Met | - |
| AC-007 | REQ-007 | Given the design system records editable seams and frozen rules in source comments, When a designer opens the catalog, Then those markers are readable there | `editable-seams.svelte` reads markers out of component sources and `app.css` at build time: 100 seams and 185 frozen notes over 58 files, so the page cannot disagree with the code | Met | - |
| AC-008 | REQ-008 | Given a token whose light and dark values differ, When it is listed in the playground, Then it is labelled, because an override pins it flat across both themes | The playground flags `--ink-inverse` and `--canvas`; `--surface-code`, `--on-code` and `--space-4` correctly carry no flag | Met | - |
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes

The criteria that carried this packet are AC-001 and AC-006: a retune that reaches every story, and a
control that is proven to change what renders rather than merely existing. Both are now persisted
gates with their own negative controls, because the defects they cover pass every other gate in the
repository — a published state that no rule consumes, and a control inert at exactly the value its
stories set, both shipped green through typecheck, both suites, story coverage and the render gate.

Consciously left out: design links. The operator confirmed there is no design file for this app, so
`@storybook/addon-designs` stays installed and unwired, and `STORYBOOK.md` records that no story
declares a `design:` parameter so the gap cannot later be misread as coverage. That was an open
question rather than a requirement, so it carries no waiver row.

One measured limitation is recorded rather than designed around: `pending` and `failing` separate by
only ΔE 8.6 in light and 11.6 in dark, against 58.6 and 54.4 for `failing` against `passing`, because
`--warning` resolves to the app's rust accent and sits near `--danger` in hue. Widening that needs a
token the palette does not have, and tokens change only through their own gate.
<!-- /ANCHOR:closure -->
