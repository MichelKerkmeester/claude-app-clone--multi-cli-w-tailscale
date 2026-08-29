---
title: "Verification Checklist: Phase 2 streaming/reader/media"
description: "Verification Date: TBD. Level-2 QA items mapping to the SP/MA/TE/MI acceptance criteria; all open at 0%."
trigger_phrases:
  - "streaming reader media verification checklist"
  - "streaming reader media phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/002-streaming-reader-media"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the streaming/reader/media Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 2 streaming/reader/media

---

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] All 13 findings documented as REQs in spec.md with acceptance criteria [evidence: 13 REQs with acceptance criteria in `spec.md` §4]
- [x] CHK-002 [P0] Streaming-clarity batch and build order (MI-4 before MI-2, MA-1 first) defined in plan.md [evidence: `plan.md` sequences the batch; `excerpt.ts` shipped before its guard consumer]
- [x] CHK-003 [P1] Transcript/artifact token-identity + test:web baseline captured; mermaid engine decision made [evidence: baseline 85+51 files / 662+610 tests recorded in `78beb1c`; the diagram decision is a hand-rolled compiler, see limitations]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file; only the repo-wide `.svelte.ts` parse gap remains, proven pre-existing]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: no console errors in either suite; typecheck warnings unchanged at the 6-warning baseline]
- [x] CHK-012 [P1] Every renderer fails closed (diff, image, mermaid degrade to a safe inert view) [evidence: `sandboxed-diagram.svelte` falls back to the code block, `diff-preview.svelte` to the plain block, `prose-link.ts` to an inert span]
- [x] CHK-013 [P1] Changes follow the existing rich-content and artifact-preview patterns [evidence: changes follow the existing rich-content and artifact-preview seams; `findParts` reused, not duplicated]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [x] CHK-020 [P0] REQ-001 (SP-1): thinking renders as an always-visible muted-prose row before the activity branch [evidence: `streaming-clarity.svelte.test.ts` asserts the thinking branch precedes the activity frame]
- [x] CHK-021 [P0] REQ-002 (SP-2): live "Working - m:ss" ticks per second from stallClock; no host field [evidence: elapsed label derives from the existing `stallClock`; no second timer, verified by grep across all 6 lane files]
- [x] CHK-022 [P0] REQ-003 (SP-4): Stop hides working immediately; new transcript.epoch re-arms [evidence: `screen-chat.svelte` clears on send and on session identity; `streaming-clarity.svelte.test.ts` 8 pass, each reversion turns 1 red]
- [x] CHK-023 [P0] REQ-004 (MA-1): diff shows file header, per-hunk line numbers, correct +N/-M; raw branch shares parse [evidence: `diff-preview.svelte.test.ts` multi-hunk gutters + stat; hunk-restart and independent advancement each turn 2 red]
- [x] CHK-024 [P0] REQ-005 (MA-4): W×H chip shown, checkerboard behind a transparent PNG [evidence: `image-preview-dimensions.svelte.test.ts` asserts the intrinsic chip; checkerboard is unconditional, see limitations]
- [x] CHK-025 [P0] REQ-006 (MA-2): valid mermaid renders under CSP; invalid falls back to the code block [evidence: `sandboxed-diagram.svelte.test.ts` valid renders, invalid falls back, label markup escaped]
- [x] CHK-026 [P1] REQ-007 (TE-1): pinch scales 0.8x-1.8x transient, does not hijack scroll [evidence: `pinch-scale.test.ts` bounds, one-pointer, release, cancel, destroy — 6 pass]
- [x] CHK-027 [P1] REQ-008 (TE-2): bare-prose and code-span file paths detected, URL not misclassified [evidence: `file-path-classification.test.ts` covers prose and code-span paths and the URL guard]
- [x] CHK-028 [P1] REQ-009 (TE-4): scheme table routes web/mailto/file/scheme-less and rejects javascript:/tel:/custom [evidence: `href-scheme-gate.test.ts` 13 pass; unknown schemes rejected by default]
- [x] CHK-029 [P1] REQ-010 (TE-5): tapped URL opens the in-app overlay, chat not backgrounded [evidence: `in-app-link-overlay.svelte.test.ts` frames only vetted schemes; chat stays mounted behind the dialog]
- [x] CHK-030 [P1] REQ-011 (MA-5): {i}/{count} and next/prev stepper over findParts, highlight-all preserved [evidence: `preview-find-stepper.svelte.test.ts` count, both wrap directions, highlight-all preserved]
- [x] CHK-031 [P1] REQ-012 (MI-2): injection-guard const prepended at each transcript-re-feed site [evidence: `prompt-injection-guard.ts` defines it once; DEFERRED — grep over `app-mobile/src` finds no re-feed consumer, see limitations]
- [x] CHK-032 [P1] REQ-013 (MI-4): excerpt keeps tail, marks omission with exact N, unchanged under budget [evidence: `excerpt.test.ts` 7 pass: unchanged under budget, exact N, whole-result cap, surrogate-safe]
- [x] CHK-033 [P0] token-identity 0-diff on unchanged transcript/artifact CSS; test:web green from the final state [evidence: `token-identity.mjs verify` PASS 35 goldens; `test:web` 88+52 / 670+616 from the final state]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each finding classed (SP/MA rendering: instance-only or class-of-bug; TE-4: algorithmic/security) [evidence: rendering findings classed instance-only; TE-4 classed algorithmic and unified into `classifyHrefScheme` in `prose-link.ts`]
- [x] CHK-FIX-003 [P0] Consumer inventory: every diff-render caller audited for the MA-1 parse; every transcript-re-feed site audited for MI-2 [evidence: both diff-render callers now share `parseUnifiedDiff`; no transcript-re-feed consumer exists to audit]
- [x] CHK-FIX-004 [P0] TE-4 scheme classifier has adversarial table tests (unsafe scheme, scheme-less, joined-input, no-op, fallback) [evidence: `href-scheme-gate.test.ts` is table-driven over unsafe, scheme-less, joined and unknown inputs]
- [x] CHK-FIX-006 [P1] MA-2 negative control: an invalid mermaid fence reproduced and proven to fall back by the same check [evidence: injecting a parse failure into `sandboxed-diagram.svelte` turns `sandboxed-diagram.svelte.test.ts` red; restoring turns it green]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] MA-2 mermaid runs in a sandboxed iframe under the strict CSP; no external network, no eval outside the bundled engine [evidence: empty `sandbox` attribute plus a frame CSP of `script-src 'none'`/`connect-src 'none'`; no network path, no bundled engine]
- [x] CHK-041 [P0] TE-4 rejects javascript:/custom schemes before any open; TE-5 in-app browser never elevates a rejected scheme [evidence: `classifyHrefScheme` rejects before any open; the overlay re-checks independently and frames nothing on a rejection]
- [x] CHK-042 [P1] TE-2 detection never opens a path on its own (open action is host-gated TE-3) [evidence: `safe-markdown.svelte` renders a classified path as an inert span; `file-path-classification.test.ts` asserts no href]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized; TE-3 open action and MI-1 cross-referenced to phase 006 [evidence: `spec.md` / `plan.md` / `tasks.md` synchronized; the open action stays cross-referenced to `006-host-usage-search-review`]
- [x] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code); TE-5 PWA caveat documented [evidence: hygiene grep over `git diff` and all new files returns zero ids; the PWA caveat is in `in-app-link-overlay.svelte`]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to `pages/chat/**` and `shared/{state,primitives,commands,format}/**` [evidence: diff spans `pages/chat/**`, `shared/{state,primitives,commands,format}/**`, and `tests/**` only — the toast host landed earlier, in `75f27a5`]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `git diff --name-only` across both commits shows no probe, backup or temp file; working tree clean after each commit]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 14 | 0/14 |
| P1 Items | 13 | 0/13 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
