---
title: Deep Research Strategy — Orca UX Mining
description: Persistent strategy for the detached Luna research lineage.
version: 1.0
---

# Deep Research Strategy — Orca UX Mining

## 1. OVERVIEW

This lineage mines the checked-in Orca React Native and Electron renderer surfaces for patterns that can improve the SvelteKit mobile client. Findings must stay evidence-backed and must distinguish view-only affordances from host-owned truth.

## 2. TOPIC

Mine `specs/context/orca-main` for portable chat and home session-selection UX and logic, with a host-authoritative, fail-closed portability filter.

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)

- [ ] What does Orca surface and how does it organize parallel sessions for fast selection?
- [ ] Which session-card fields and derived previews can our client render from current DTOs, and which require host fields?
- [ ] Which message-level and composer interactions materially improve chat while preserving server authority?
- [ ] Which streaming, draft, retry, and reconciliation patterns are safe to port without client-owned session truth?
- [ ] Which navigation, tab, peek, refresh, and attention patterns improve the home-to-chat transition?
<!-- /ANCHOR:key-questions -->

## 4. NON-GOALS

- Do not implement code or modify the app or Orca checkout.
- Do not port desktop-only filesystem, process, terminal, persistence, or mutation authority into the mobile client.
- Do not recommend client-owned editable session metadata, optimistic truth, or fail-open behavior.

## 5. STOP CONDITIONS

- Run all 20 configured iterations; convergence before the cap is telemetry only.
- Each iteration must add a distinct evidence-backed pattern or explicitly record a ruled-out direction.
- Synthesis must retain source paths, portability verdicts, and host-field implications.

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS

None yet; reducer updates this section after each iteration.
<!-- /ANCHOR:answered-questions -->

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED

The first iteration will establish source clusters and concrete entry points.
<!-- /ANCHOR:what-worked -->

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED

No failed approach recorded yet.
<!-- /ANCHOR:what-failed -->

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)

None yet.
<!-- /ANCHOR:exhausted-approaches -->

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS

None yet.
<!-- /ANCHOR:ruled-out-directions -->

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER

- Completed pivots: 0
- Failed pivots: 0
- Saturated: none yet
- Remaining frontier: session cards, chat actions, composer, streaming, navigation, and transport boundaries.
<!-- /ANCHOR:divergence-frontier -->

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS

None yet.
<!-- /ANCHOR:carried-forward-open-questions -->

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS

Iteration 1: map Orca mobile home/session-selection surfaces and the renderer's parallel-session/sidebar model.
<!-- /ANCHOR:next-focus -->

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT

- Research angles: `specs/007-orca-ux-mining/research-angles.md`.
- Orca mobile: `specs/context/orca-main/mobile/src/session`, `mobile/src/worktree`, `mobile/src/cache`, `mobile/src/transport`.
- Orca renderer: `specs/context/orca-main/src/renderer/src/components/sidebar`, `components/activity`, `components/dashboard-popout`, `runtime`, and `store/slices`.
- Current client: `app-mobile/src/pages/home`, `app-mobile/src/pages/chat`, `app-mobile/src/shared/state`, and `app-mobile/src/shared/transport`.
- Resource map: absent at initialization; no coverage gate is applied.
- Scope guard: root spec seeding, validation, continuity saves, and repository writes are intentionally skipped because this detached lineage may write only below its artifact directory.

## 13. RESEARCH BOUNDARIES

- Max iterations: 20
- Convergence threshold: 0.05 (telemetry only under max-iterations policy)
- Per-iteration budget: 12 tool calls maximum
- Executor: cli-codex / gpt-5.6-luna
- Session: fanout-luna-1787717167874-ti5kfp
