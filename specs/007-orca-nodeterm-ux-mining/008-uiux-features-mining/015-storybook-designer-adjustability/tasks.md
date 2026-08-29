---
title: "Task ledger - Phase 15 Storybook designer adjustability"
description: "Task ledger for making the catalog adjustable: the token playground, derived state controls per view, and the editable-seams reference."
trigger_phrases:
  - "adjustability tasks"
  - "playground task ledger"
  - "derived controls tasks"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T15:05:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed the four control defects and added the state-visibility gate."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
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
- [x] T2.9 Make a published state visible rather than merely emitted [evidence: `data-check-classification` now drives border and value ink in `check-summary.svelte`; a first attempt tinted the failing background and failed the audit at 4.48:1, so the fill was dropped]
- [x] T2.10 Stop the story-only controls being handed back to the components [evidence: four re-adding lines removed across `screen-chat.stories.ts` and `transcript-list.stories.ts`; neither component declares those props nor spreads rest props]
- [x] T2.11 Make the streaming state differ at the count its own stories use [evidence: `'token'` now always appends a truncated copy of a real assistant block with a collision-safe id, and differs from `'fixture'` at counts 1, 3 and the default]
- [x] T2.12 Migrate the fixtures stranded away from the pinned capture clock [evidence: the todo panel's `updatedAt` and the stale-running card's `updatedAt` moved to the 2026-08-28 pin; "243 hours ago" and "240d ago" now read "10 minutes ago" and "25m ago"]
- [x] T2.13 Add a gate for the defect class the other gates cannot express [evidence: `scripts/catalog-state-visibility.mjs` checks classification paint, control difference and age plausibility across 337 stories]
- [ ] T2.8 Wire design links per component [deferred by operator decision: no design file exists for this app, possibly one in future; the addon stays installed and unwired]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 Prove a retune reaches a story other than the playground [evidence: `--accent` reads `#d97757` then `#00ff00` then `#d97757` in `views-header--default` as the override is set and cleared]
- [x] T3.2 Negative-control the mechanism that carries a retune [evidence: with the preview hook removed and Storybook rebuilt, the override stops applying and the check reports NOT APPLIED]
- [x] T3.3 Prove each derived control changes the render [evidence: roster ready to empty takes rendered cards from 2 to 0; block count 1 to 6 grows the transcript from 194 to 698 characters]
- [x] T3.4 Account for every shot the work moves [evidence: seven shots moved, each a named state fix; all seven reproduced byte-identically across two full captures, and the only shots differing between runs were `plan-mode-button--build` and `sandboxed-diagram--valid`, the known pre-existing flake families, both restored]
- [x] T3.5 Run the workspace gates from the final state [evidence: `npm run typecheck -w @pi-remote/web` 0 errors; `npm run test:web` exit 0; `node scripts/story-coverage.mjs`, `node scripts/css-comment-integrity.mjs` and `node scripts/token-identity.mjs verify app-mobile/src/app.css` all pass]
- [x] T3.6 Negative-control the state-visibility gate on every check [evidence: deleting the classification rules, disabling the streaming append, and reverting one fixture timestamp each turn it red on that check alone; restoring all three returns it to green]
- [x] T3.7 Re-run the two-theme audit from the final state [evidence: `node scripts/ui-audit.mjs` over 670 story-runs reports 134 findings, all low or info; zero high, zero medium]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] A token edited in the catalog moves every story and can be cleared [evidence: proven by the set-and-clear check on `views-header--default`]
- [x] No production component gained API to serve a story [evidence: an earlier attempt added a prop and a slot; both were reverted and the components read byte-identical to their committed state]
- [x] Every existing story keeps its name, and every moved shot is a named state fix with a before and after [evidence: seven moved shots enumerated in `implementation-summary.md`; no story was renamed and no unrelated shot changed]
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
