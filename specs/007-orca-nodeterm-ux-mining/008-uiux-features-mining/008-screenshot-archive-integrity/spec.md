---
title: "Phase 8 - Screenshot archive integrity"
description: "Make every screenshot an honest picture of its component before any refinement phase reads one. Fix the real styling defect, confirm the story-level repairs already drafted, settle how full screens are framed, and leave the archive deterministic with no dead, unstyled, error-defaulted or indistinguishable shots. Scope: archive-wide. Chain: after 007-host-liveactivity-fields · before 009-refine-artifacts."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/008-screenshot-archive-integrity"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed three live-app render defects and two capture determinism defects."
    next_safe_action: "Operator picks phase 009; the archive is trustworthy evidence."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 8 - Screenshot archive integrity

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) · Archive: [`../../../../screenshots/MANIFEST.json`](../../../../screenshots/MANIFEST.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P0 |
| **Status** | Complete |
| **Created** | 2026-08-28 |
| **Scope** | archive-wide |
| **Constraint** | Host-authoritative, fail-closed. Refinement never adds host truth |
| **Evidence** | The screenshot itself; a change is proven by a before and after image diff |
| **Phase chain** | after `007-host-liveactivity-fields` · before `009-refine-artifacts` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The screenshot archive is the acceptance evidence for every later refinement phase, and it is not yet trustworthy. A visual pass over all 302 shots found four dead classes. Five ask-question card stories render only a loading skeleton, the session-state icon draws a white glyph on a white disc, three surfaces show a relay error as their default state, and eleven file-preview and artifact-details shots render as run-on unstyled text. That last one is not a story defect: `card-file-preview.svelte` uses `class="artifact-card"` while those rules are scoped to `card-artifact.svelte`, so Svelte scoping means they never apply in the live transcript either.

### Purpose
Make every screenshot an honest picture of its component before any refinement phase reads one. Fix the real styling defect, confirm the story-level repairs already drafted, settle how full screens are framed, and leave the archive deterministic with no dead, unstyled, error-defaulted or indistinguishable shots.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Fix the missing styling on `card-file-preview.svelte` and `artifact-details.svelte` so both render as real cards in the app and in Storybook.
- Verify the drafted story repairs for the ask-question card, the session-state icon, the three host-error defaults, and the headless-button consumer story.
- Correct the artifact-details fixture so the Dimensions row stops reading `1 x 1`.
- Decide and record whether full-screen views stay cropped to full scroll height or are clamped to the 402x874 device frame.
- Re-capture the archive and prove determinism across two runs.

### Out of Scope
- Any UI refinement driven by reading a screenshot - that is phases 009 through 014.
- New components or features; this phase only makes existing surfaces photograph honestly.
- Host fields; nothing here needs one.

### Files to Change

| Path | Action | Why |
|------|--------|-----|
| `app-mobile/src/pages/chat/transcript/card-file-preview.svelte` | Modify | add the missing card styling it currently borrows by class name only |
| `app-mobile/src/pages/chat/artifacts/artifact-details.svelte` | Modify | add the missing `.artifact-details` rule |
| `app-mobile/src/**/*.stories.ts` | Modify | the drafted story repairs plus the `1 x 1` fixture |
| `scripts/capture-screenshots.mjs` | Modify | only if views are clamped to the device frame |
| `screenshots/**` | Regenerate | the archive and its manifest |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | The file-preview card and artifact details render with their intended layout in the live transcript, not only in a story. | Both surfaces show rows and hierarchy rather than one run-on string; the fix is in the component, not compensated for in a story. |
| REQ-002 | No screenshot shows a host error as its default state. | The push settings, attention inbox and review defaults render their populated surface; each keeps a separate explicit error story. |
| REQ-003 | No screenshot is dead. | Every captured shot shows content a sighted person can see; the ask-question card shows a real question and the session-state icon is visible against its surface. |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-004 | Indistinguishable variants are either differentiated or recorded as the component's real behaviour. | Where ten placeholder states genuinely draw the same thing, that is written down rather than faked apart. |
| REQ-005 | The archive is deterministic and complete. | Two consecutive runs are byte-identical, zero unstable, zero failed, and every story has an image or a justified empty record. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The file-preview and artifact-details surfaces render correctly in the live app.
2. No dead, unstyled, or error-defaulted screenshot remains in the archive.
3. Two capture runs are byte-identical with zero unstable and zero failed.
4. typecheck, eslint, both suites, story coverage and token-identity green from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Risk | Impact | Mitigation |
|------|--------|------------|
| A refinement regresses a surface no one looked at | Medium | The whole archive is re-captured and unrelated shots must stay byte-identical |
| A fix is claimed without visual proof | High | Every accepted change carries a before and after image diff of its own shot |
| Story-level patching hides a real component defect | High | Fixes land in the component; a story changes only when it hid the state |
| Capture nondeterminism produces phantom diffs | Medium | Two runs must be byte-identical with zero unstable before any review is trusted |

**Depends on:** `007-host-liveactivity-fields`.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
No refinement may add a per-frame timer, an unbounded listener, or a second animation loop to a surface that did not have one.

### Security
The markdown sanitization boundary and every fail-closed capability check stay intact; refinement is presentation only.

### Reliability
A refinement must not change what a surface does when its data is absent; a fail-closed empty state stays empty.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. Whether a state that renders identically to another is a defect or the component's honest behaviour is decided per case and recorded, never assumed.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
The longest realistic string, the empty string and a single character each stay inside their container; a number column stays aligned as its digit count grows.

### Error Scenarios
A surface rendering an error keeps that error legible after refinement; an error state is never restyled into looking like success.

### State Transitions
A state that renders identically to its neighbour is either differentiated or recorded as honest sameness; it is never left ambiguous.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. One real component defect plus story repairs and a framing decision.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this phase.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
