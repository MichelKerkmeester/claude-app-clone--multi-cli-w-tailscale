---
title: "Phase 7 plan - Live-Activity modules now, host DTO fields inert until they land"
description: "Sequenced approach for the Live-Activity and host DTO-field phase: ship the five ready-now Live-Activity pure modules (arbitration, no-tick-rerank, content fallback, stale watchdog, latched dismiss) as reusable logic consumed by the home card today, then scaffold the eight host-gated findings inert behind their relay fields. Proven by fixture tests, token-identity 0-diff, test:web, a11y-parity from the final state."
trigger_phrases:
  - "host liveactivity fields plan approach"
  - "host liveactivity fields phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the Live-Activity and host DTO-field phase plan; ready-now modules first."
    next_safe_action: "Await operator go, then build the five ready-now Live-Activity pure modules."
    blockers:
      - "Eight findings are host-gated on relay fields tracked in ../../007-host-requests/."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 plan - Live-Activity and host DTO fields

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA, service worker + Web Push |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Client-only local first-seen and latched-dismiss state; no host writes |
| **Testing** | Vitest (`test:web`) with fixtures for absent-field paths, token-identity CSS resolver |

### Overview
Build the five ready-now Live-Activity findings as pure modules that the home card and a future in-app running banner consume today, then scaffold the eight host-gated findings so each renders when its relay field lands and is fail-closed inert until then. Nothing here makes the client own session truth; every host-gated affordance reads a new host-published, client-read-only field.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ in spec.md with acceptance criteria and a named host dependency or "none".
- [ ] Each host-gated field is tracked in `../../007-host-requests/`.
- [ ] The touched-surface token-identity and test:web baseline is captured before any change.

### Definition of Done
- [ ] The five ready-now Live-Activity modules pass fixture tests and are consumed by the home card.
- [ ] Each host-gated finding is proven inert with its field absent and renders correctly against a fixture field.
- [ ] token-identity 0-diff, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The five ready-now Live-Activity findings are pure logic with no host dependency, so they land first as reusable modules under `shared/format/` and `shared/state/`, consumed by `card-session.svelte` and available to a future in-app running banner.

**LA-1** is a single-slot arbitration function (needsYou > unread-done > working > idle, ties on first-seen) over `attention` plus a local first-seen map. **LA-2** guards it: an activity tick refreshes the same winner in place and never re-elects. **LA-3** is one clip length plus a 3-tier content fallback (You:prompt > activity > state) reused across the home card, transcript header, and Live Activity so a line reads the same length everywhere. **LA-5** is a client stale watchdog that grays the surface once `updatedAt` exceeds the staleness window, even if the end push is lost. **LA-7** is a latched, state-scoped dismiss that re-shows the row the instant the underlying state genuinely moves.

The eight host-gated findings scaffold their client render against a fixture and stay inert with the field absent. **LA-4** is the typed edge-versus-tick push contract wired through `attention.ts` and the service worker (edges at priority 10 immediately, ticks coalesced at priority 5). **LA-6** gates the done treatment on an end-reason flag, never the text, so a Ctrl-C or a stall is never celebrated. **CI-3** adopts a host-parked launchDraft once into an empty composer over the phase-001 CI-1 keyed store and retires it on the first turn. **MA-3** replaces the dead "Preview unavailable" with a player over a scoped, revocable object URL in `use-artifact-resource.svelte.ts`. **SC-1** is a minute-boundary countdown chip over `cacheExpiresAt`. **SC-3** adds token and tool-call count segments beside the already-shipped elapsed tick (phase-002 SP-2). **SP-3** is an expandable subagent-activity tail in `transcript-list.svelte` over a host stream the client has no concept of today. **HP-6** groups the home over `projectLabel` and auto-collapses every group but the active one.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · ready-now Live-Activity modules
Build LA-1 (arbitration), LA-2 (no-tick-rerank), LA-3 (content fallback), LA-5 (stale watchdog), and LA-7 (latched dismiss) as pure modules under `shared/format/` and `shared/state/`, each with a fixture test. Wire them into `card-session.svelte` so the home card benefits immediately, before any push delivery. Factor the LA-1 arbitration as the same shared attention resolver the phase-003 dock uses. Capture the token-identity and test:web baseline first.

### Phase 2 · host-gated scaffolds
Scaffold each host-gated finding inert behind its field: LA-4 delivery in the service worker and `attention.ts`, LA-6 end-reason gating, CI-3 launchDraft adopt over the CI-1 store, MA-3 player over a revocable object URL, SC-1 countdown chip, SC-3 count segments, SP-3 subagent tail, HP-6 project grouping. Each renders nothing with its field absent and correctly against a fixture field.

### Phase 3 · verification
Run the fixture tests for every ready-now module and every absent-field path, token-identity on the touched CSS, test:web, and the a11y-parity check. Confirm every task traces to a finding and every host-gated finding cross-references `../../007-host-requests/`. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Attention-resolver reuse** - LA-1's arbitration is the same family as the phase-003 SD-2 resolver (working > permission > unread > done). Factor one shared resolver in `shared/format/attention.ts` used by the home card, the phase-003 dock chip, and the Live Activity, so all three can never disagree. Cross-phase with 003.
- **Draft-persistence batch** - CI-3 adopts the phase-001 CI-1 keyed draft store. Build the CI-1 store so CI-3 slots in when `unsentInputDraft` lands. Cross-phase with 001.
- **Ready-now first** - the five LA modules (LA-1, LA-2, LA-3, LA-5, LA-7) ship as reusable pure logic now (home card and a future in-app running banner), independent of Live-Activity delivery; do not block them on LA-4.

| Finding | Depends On | Blocks |
|---------|------------|--------|
| LA-1 | Phase-003 shared resolver (co-built) | LA-2 arbitration reuse |
| LA-2 | LA-1 | None |
| LA-3 | None | None |
| LA-5 | None | None |
| LA-7 | None | Reused by a future in-app running banner |
| LA-4 | Host push contract | LA-6 delivery |
| LA-6 | Host end-reason flag, LA-4 | None |
| CI-3 | Phase-001 CI-1 store, host unsentInputDraft | None |
| MA-3, SC-1, SC-3, SP-3, HP-6 | Their host fields | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Ready-now LA modules | Med | LA-1/2/3/5/7 each S-M pure modules + fixture tests |
| Host-gated scaffolds | Med/High | LA-4/LA-6 push path M, CI-3/MA-3/SC-1/SC-3/SP-3/HP-6 each M inert |
| Verification | Low/Med | fixture, token-identity, test:web, a11y-parity |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | LA-1 tier/tie arbitration; LA-2 tick-vs-edge; LA-3 fallback tiers; LA-5 staleness; LA-7 dismiss-then-move | Vitest fixtures |
| Fail-closed | Each host-gated finding renders nothing with its field absent (LA-4, LA-6, CI-3, MA-3, SC-1, SC-3 counts, SP-3, HP-6) | Vitest fixtures |
| Against-fixture | Each host-gated render is correct against a fixture field | Vitest fixtures |
| Visual | token-identity 0-diff on the touched CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phase-003 shared attention resolver | Internal | Yellow | LA-1 co-builds it; avoid divergence |
| Phase-001 CI-1 keyed draft store | Internal | Yellow | CI-3 adopts it when the host field lands |
| Live-Activity push contract (LA-4) | External (host) | Red | No glanceable delivery until it lands |
| End-reason flag (LA-6) | External (host) | Red | Done treatment stays neutral until it lands |
| unsentInputDraft, video/audio kind, cacheExpiresAt, turn-stat counts, subagent stream, projectLabel | External (host) | Red | CI-3, MA-3, SC-1, SC-3, SP-3, HP-6 inert until each lands |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A token-identity diff on a touched surface, a regression on the home card from the LA modules, or an inadvertent non-inert render of a host-gated affordance.
- **Procedure**: All changes are confined to `app-mobile/src/shared/{format,state,commands}/**`, `app-mobile/src/pages/{home,chat}/**`, `app-mobile/src/shared/format/attention.ts`, and the service worker. `git checkout -- app-mobile` restores the prior state. The local first-seen and latched-dismiss state is client-only; clearing it removes it. No host contract is created by this phase, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
