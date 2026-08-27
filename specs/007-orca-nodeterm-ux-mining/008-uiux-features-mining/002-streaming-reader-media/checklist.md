---
title: "Verification Checklist: Phase 2 streaming/reader/media"
description: "Verification Date: TBD. Level-2 QA items mapping to the SP/MA/TE/MI acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/002-streaming-reader-media"
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

- [ ] CHK-001 [P0] All 13 findings documented as REQs in spec.md with acceptance criteria
- [ ] CHK-002 [P0] Streaming-clarity batch and build order (MI-4 before MI-2, MA-1 first) defined in plan.md
- [ ] CHK-003 [P1] Transcript/artifact token-identity + test:web baseline captured; mermaid engine decision made
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Every renderer fails closed (diff, image, mermaid degrade to a safe inert view)
- [ ] CHK-013 [P1] Changes follow the existing rich-content and artifact-preview patterns
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [ ] CHK-020 [P0] REQ-001 (SP-1): thinking renders as an always-visible muted-prose row before the activity branch
- [ ] CHK-021 [P0] REQ-002 (SP-2): live "Working - m:ss" ticks per second from stallClock; no host field
- [ ] CHK-022 [P0] REQ-003 (SP-4): Stop hides working immediately; new transcript.epoch re-arms
- [ ] CHK-023 [P0] REQ-004 (MA-1): diff shows file header, per-hunk line numbers, correct +N/-M; raw branch shares parse
- [ ] CHK-024 [P0] REQ-005 (MA-4): W×H chip shown, checkerboard behind a transparent PNG
- [ ] CHK-025 [P0] REQ-006 (MA-2): valid mermaid renders under CSP; invalid falls back to the code block
- [ ] CHK-026 [P1] REQ-007 (TE-1): pinch scales 0.8x-1.8x transient, does not hijack scroll
- [ ] CHK-027 [P1] REQ-008 (TE-2): bare-prose and code-span file paths detected, URL not misclassified
- [ ] CHK-028 [P1] REQ-009 (TE-4): scheme table routes web/mailto/file/scheme-less and rejects javascript:/tel:/custom
- [ ] CHK-029 [P1] REQ-010 (TE-5): tapped URL opens the in-app overlay, chat not backgrounded
- [ ] CHK-030 [P1] REQ-011 (MA-5): {i}/{count} and next/prev stepper over findParts, highlight-all preserved
- [ ] CHK-031 [P1] REQ-012 (MI-2): injection-guard const prepended at each transcript-re-feed site
- [ ] CHK-032 [P1] REQ-013 (MI-4): excerpt keeps tail, marks omission with exact N, unchanged under budget
- [ ] CHK-033 [P0] token-identity 0-diff on unchanged transcript/artifact CSS; test:web green from the final state
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (SP/MA rendering: instance-only or class-of-bug; TE-4: algorithmic/security)
- [ ] CHK-FIX-003 [P0] Consumer inventory: every diff-render caller audited for the MA-1 parse; every transcript-re-feed site audited for MI-2
- [ ] CHK-FIX-004 [P0] TE-4 scheme classifier has adversarial table tests (unsafe scheme, scheme-less, joined-input, no-op, fallback)
- [ ] CHK-FIX-006 [P1] MA-2 negative control: an invalid mermaid fence reproduced and proven to fall back by the same check
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] MA-2 mermaid runs in a sandboxed iframe under the strict CSP; no external network, no eval outside the bundled engine
- [ ] CHK-041 [P0] TE-4 rejects javascript:/custom schemes before any open; TE-5 in-app browser never elevates a rejected scheme
- [ ] CHK-042 [P1] TE-2 detection never opens a path on its own (open action is host-gated TE-3)
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] spec/plan/tasks synchronized; TE-3 open action and MI-1 cross-referenced to phase 006
- [ ] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code); TE-5 PWA caveat documented
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes confined to `pages/chat/**` and `shared/{state,primitives,commands,format}/**`
- [ ] CHK-061 [P1] No task-created residue in the diff
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
