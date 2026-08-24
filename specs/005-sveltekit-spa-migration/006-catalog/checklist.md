---
title: "Child 006 checklist — Storybook catalog sign-off"
description: "Barrier sign-off for the Storybook catalog and its CDP render gate, including the blind spot the gate carries by design."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/006-catalog"
    last_updated_at: "2026-08-23T10:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped, extended by 009."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 006 — Storybook catalog

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The catalog is itself a test instrument, so this checklist is mostly about what tests the instrument.
The governing distinction: `storybook build` proves stories compile, and only a rendered frame proves
they draw.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] L2 through L5 confirmed complete, since components must exist before they can have stories. [evidence: `005-views-and-shell` barrier green — app runs end-to-end, 3/3 URLs resolve]
- [x] **CHK-PRE-02** [P0] Render gate landed with the first surface group rather than at the end. [evidence: commit `bf539a4` ships rich-content stories and the CDP render-smoke gate together, so every later group was gated on arrival]
- [x] **CHK-PRE-03** [P1] Theme mechanism chosen so the gate and the human toolbar read the same global. [evidence: `withThemeByDataAttribute` sets `data-theme`; the gate sets `globals=theme:*`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean across story files. [evidence: `svelte-check` clean]
- [x] **CHK-CQ-02** [P1] Story meta typed in the form that preserves arg inference. [evidence: commit `67e9118` corrects `StatusPill` to the `Meta<typeof …>` form]
- [x] **CHK-CQ-03** [P1] Global stylesheet imported once so surfaces resolve against real tokens. [evidence: `preview.ts` imports `../src/app.css`]
- [x] **CHK-CQ-04** [P1] Storybook's competing background painter disabled deliberately. [evidence: `backgrounds: { disable: true }` in `preview.ts`, since the tokens own the surface background]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Every story renders in both themes without throwing. [evidence: `node scripts/catalog-smoke-cdp.mjs` — 404 frames, 0 throws, commit `2c7a91e`]
- [x] **CHK-TEST-02** [P0] The gate drives a real browser rather than trusting a successful build. [evidence: `catalog-smoke-cdp.mjs` fails on `Runtime.exceptionThrown` or any console error]
- [x] **CHK-TEST-03** [P1] Both themes exercised per story so theme-only breakage cannot hide. [evidence: `catalog-smoke-cdp.mjs` renders each story at `globals=theme:light` and `theme:dark` — 202 stories x 2 = 404 frames]
- [x] **CHK-TEST-04** [P2] Blank-frame cap tightened so the gate does not wait needlessly. [evidence: commit `e67424b` sets the cap to 2.5s]
- [~] **CHK-TEST-05** [P0] The gate treats an empty frame as a pass by design. [deferred: a decorator-ordering mistake that leaves a component without context renders nothing and stays green; closed later by the `story-render` test in 009, which composes the real decorator pipeline and asserts roles]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P1] Fixture provenance preserved so a story cannot drift from reality. [evidence: commit `90b8579` restores provenance in the transcript list and block stories]
- [x] **CHK-FIX-02** [P1] Socket-coupled surfaces render without a relay. [evidence: 55 story files seed from `demo.ts` fixtures; no story opens a socket]
- [~] **CHK-FIX-03** [P2] The planned single mock-context decorator was not built. [deferred: one global decorator would make every story depend on a shared mock, so a change there could quietly alter dozens of unrelated stories; per-story fixtures plus `AttachmentDraftStoryHost.svelte` were used instead]
- [~] **CHK-FIX-04** [P2] The `/catalog` route does not coexist as the spec assumed. [deferred: child 005 dropped it once Storybook became a separate application]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No story reaches a live socket or a real relay. [evidence: every fixture is static data from `demo.ts`; the catalog runs with no backend]
- [x] **CHK-SEC-02** [P1] Storybook is a separate application, never bundled into the shipped app. [evidence: `.storybook/` and `*.stories.ts` are excluded from the `dist/` build]
- [x] **CHK-SEC-03** [P1] Fixtures carry no real session content or credentials. [evidence: `demo.ts` fixtures are synthetic and were ported verbatim in 002]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The preview config explains its non-obvious choices where they are made. [evidence: `preview.ts` comments cover the `app.css` import, the disabled backgrounds and the shared `theme` global]
- [x] **CHK-DOC-02** [P1] The gate script states why it exists rather than just what it does. [evidence: `catalog-smoke-cdp.mjs:2` — `storybook build` only proves stories compile]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Stories live beside the components they document. [evidence: 74 `*.stories.ts` files colocated under `app-mobile/src/`]
- [x] **CHK-ORG-02** [P2] Story dispatches were disjoint, one surface group each. [evidence: 6 commits — rich-content, transcript, artifacts, views, chrome, attachment tile]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The barrier passed at 404 frames with zero throws, and coverage exceeded the target: the spec aimed at
roughly 60 of 64 surfaces, and 74 story files exist today after 009's coverage work.

The honest qualification is the gate's designed blind spot — an empty frame passes — which stayed open
until 009 added a render test that composes the real decorator pipeline. Two spec assumptions also did
not survive contact: the single mock-context decorator and the coexisting `/catalog` route.
<!-- /ANCHOR:summary -->
