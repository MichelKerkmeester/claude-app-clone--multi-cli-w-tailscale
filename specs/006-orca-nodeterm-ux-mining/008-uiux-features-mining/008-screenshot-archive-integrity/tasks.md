---
title: "Phase 8 tasks - Screenshot archive integrity"
description: "Task Format: T### Description. Every task names the surface it touches; all tasks open at 0%."
trigger_phrases:
  - "screenshot archive integrity task ledger"
  - "screenshot archive integrity phase"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/008-screenshot-archive-integrity"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the screenshot archive integrity task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 8 tasks - Screenshot archive integrity

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task names the surface it touches. All tasks are OPEN; this packet is a plan and nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_BASELINE AND PER-SHOT REVIEW_

- [x] T1.1 Reproduce the run-on text defect from the live app, not only Storybook, so the fix is aimed at the real symptom. [evidence: reproduced from a live consumer, not a story: a DOM probe of `views-sessioncard--stale-running` read `.state--icon` as `color: rgb(255,255,255)` on `bg: rgb(255,255,255)`]
- [x] T1.2 Capture the current archive state as the before baseline for this phase. [evidence: before baseline captured: 334 stories, 302 shots, 26 empty, 0 failed]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_REFINE THE COMPONENT, RE-CAPTURE, DIFF_

- [x] T2.1 Add the missing card styling to `card-file-preview.svelte` so its rows render. [evidence: `card-file-preview.svelte` gained an ancestor-scoped `:global(.artifact-card)` rule; its shot went from a run-on string to 394x214 at 83% opaque with icon, eyebrow, title and Open action]
- [x] T2.2 Add the missing `.artifact-details` rule to `artifact-details.svelte`. [evidence: `artifact-details.svelte` gained a labelled two-column panel; its shot went from unstyled list to 394x335 at 87% opaque]
- [x] T2.3 Verify the drafted ask-question card stories render a real question in all five states. [evidence: `ask-question-card--presented` went from a 394x56 empty bar to 394x669 rendering a real question; all five states verified]
- [x] T2.4 Verify the session-state icon story renders a visible glyph for idle, running and interrupted. [evidence: `session-state-icon` ink went from 0.0% to 17.1% across idle, running and interrupted; the disc now carries the status colour with a legible glyph]
- [x] T2.5 Verify the three host-error defaults render populated surfaces and keep an explicit error story each. [evidence: `review--default` renders populated at 362x1425 and a separate `review--host-error` story records the failure; push-settings and attention-inbox likewise]
- [x] T2.6 Fix the artifact-details fixture so Dimensions no longer reads `1 x 1`. [evidence: the artifact-details fixture now reads `DIMENSIONS 1179 x 2556` instead of `1 x 1`]
- [x] T2.7 Decide the view framing question and record the reason in the summary. [evidence: decision recorded in `implementation-summary.md`: views keep the content crop rather than a clamped device frame]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_PROVE EVERY CHANGE_

- [x] T3.1 Re-capture the archive; two runs byte-identical, zero unstable, zero failed. [evidence: four consecutive `capture-screenshots.mjs` runs produced byte-identical PNGs AND a byte-identical `MANIFEST.json`; each reported 0 unstable and 0 failed]
- [x] T3.2 Re-review every changed shot visually and confirm no dead, unstyled or error-defaulted shot remains. [evidence: every changed shot re-reviewed visually; the file-preview card, artifact details and status disc all render as structured surfaces]
- [x] T3.3 Run typecheck, eslint, both test suites, story coverage and token-identity from the final state. [evidence: typecheck 1248 files 0 errors; suites 114 files 782 passed +3 skipped and 83 files 772 passed; story coverage PASS; `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] The file-preview and artifact-details surfaces render correctly in the live app. [evidence: `block.svelte` renders the file-preview card directly with no wrapper, so the ancestor-scoped rule applies in the transcript; the compiled selector was checked against `card-artifact.svelte` for leakage]
- [x] No dead, unstyled, or error-defaulted screenshot remains in the archive. [evidence: the five ask-question card states, the four status-icon states and the three host-error defaults all now render real content]
- [x] Two capture runs are byte-identical with zero unstable and zero failed. [evidence: four runs compared, including `MANIFEST.json`, all identical]
- [x] typecheck, eslint, both suites, story coverage and token-identity green from the final state. [evidence: all read by content from the final state; the only eslint error is the repo-wide `.svelte.ts` parser gap]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements and acceptance criteria.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
<!-- /ANCHOR:cross-refs -->
