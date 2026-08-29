---
title: "Task ledger - Phase 15 Storybook designer adjustability"
description: "Task ledger for making the catalog adjustable: the token playground, derived state controls per view, and the editable-seams reference."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T08:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the adjustability task ledger alongside the shipped work."
    next_safe_action: "Finish the remaining page views, then wire design links."
    completion_pct: 85
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Phase 15 Storybook designer adjustability

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` done with evidence naming a real artifact · a deferral states its reason.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] T1.1 Measure what a designer can already change before adding anything [evidence: `window.__STORYBOOK_PREVIEW__.loadStory` read across 101 components: 442 of 924 props carry a derived control, 482 are callbacks or snippets that correctly get none]
- [x] T1.2 Identify the real gap rather than the assumed one [evidence: 142 of the 442 controls resolve to a raw object or array editor, which is the state a designer cannot reach]
- [x] T1.3 Confirm an external visual editor is not viable [evidence: `app-mobile/svelte.config.js` sets `default-src 'self'`, `app-relay/src/http/server.ts` serves `frame-ancestors 'none'`, and `scripts/release-verify.mjs` asserts the policy]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] T2.1 Build a token playground over every custom property the stylesheets declare [evidence: `app-mobile/.storybook/token-playground.svelte` discovers tokens from the CSSOM; 94 rows across 12 groups render]
- [x] T2.2 Apply a retune to every story, not just the playground [evidence: a `beforeEach` hook in `app-mobile/.storybook/preview.ts`; an override changes `--accent` in `views-header--default` and clearing it restores the shipped value]
- [x] T2.3 Label tokens that resolve differently per theme [evidence: `--ink-inverse` and `--canvas` carry the flag; `--surface-code`, `--on-code` and `--space-4` correctly do not]
- [x] T2.4 Export a retune as text the token gate can accept [evidence: Copy CSS emits only changed tokens as a `:root` block; the playground writes no stylesheet]
- [x] T2.5 Give the page views derived state controls [evidence: Home, SessionCard, TranscriptList and Chat expose roster state, session count, block count and streaming state]
- [x] T2.6 Extend derived controls to the remaining page views and object-prop components [evidence: review gains `queueState` and `pendingCount`, inbox `inboxState` and `itemCount`, enrollment `enrollmentPhase`, and the composer six controls; `pendingCount:0` takes rendered buttons 6/1 and `itemCount:0` takes them 7/1]
- [x] T2.7 Make the system's editable and frozen markers readable in the catalog [evidence: `app-mobile/.storybook/editable-seams.svelte` reads the markers from source; 100 seams and 185 frozen notes across 58 files]
- [ ] T2.8 Wire design links per component [deferred: `@storybook/addon-designs` is installed and unused; the Figma file and frame URLs are not knowable from the repository and must come from the operator]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 Prove a retune reaches a story other than the playground [evidence: `--accent` reads `#d97757` then `#00ff00` then `#d97757` in `views-header--default` as the override is set and cleared]
- [x] T3.2 Negative-control the mechanism that carries a retune [evidence: with the preview hook removed and Storybook rebuilt, the override stops applying and the check reports NOT APPLIED]
- [x] T3.3 Prove each derived control changes the render [evidence: roster ready to empty takes rendered cards from 2 to 0; block count 1 to 6 grows the transcript from 194 to 698 characters]
- [x] T3.4 Confirm the catalog additions leave the archive alone [evidence: `git status --porcelain screenshots` reports only the pages this work adds]
- [x] T3.5 Run the workspace gates from the final state [evidence: `npm run typecheck -w @pi-remote/web` 0 errors; `npm run test:web` exit 0; `node scripts/story-coverage.mjs`, `node scripts/css-comment-integrity.mjs` and `node scripts/token-identity.mjs verify app-mobile/src/app.css` all pass]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] A token edited in the catalog moves every story and can be cleared [evidence: proven by the set-and-clear check on `views-header--default`]
- [x] No production component gained API to serve a story [evidence: an earlier attempt added a prop and a slot; both were reverted and the components read byte-identical to their committed state]
- [x] Every existing story keeps its name and its pixels [evidence: `git status --porcelain screenshots` shows only added pages]
- [x] Every page view exposes its states as controls [evidence: home, session card, transcript, chat, review, inbox, enrollment and the composer each expose derived controls proven to change the DOM]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements this ledger serves.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
