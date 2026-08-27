---
title: "Phase 3 plan - home/switcher/nav/search over real files, quick-win first, fail-closed"
description: "Sequenced approach for the home, dock, navigation, and search findings: land the HP-4 PWA app-badge quick-win first, then the search batch as one unit in session-list-seams.ts, the dock with its SD-2/SD-6 guardrails, and the navigation coordinator that unblocks later host-gated deep-linking. Proven by token-identity, test:web, a11y-parity from the final state."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the home/switcher/nav/search phase plan; badge quick-win first."
    next_safe_action: "Await operator go, then build HP-4, then the search batch."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 plan - home/switcher/nav/search

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Client-only preferences and recency stack; no host writes |
| **Testing** | Vitest (`test:web`), token-identity CSS resolver |

### Overview
Land the PWA app badge first, then upgrade home in three coherent batches: the client-side search over fields already on the DTO, the net-new MRU dock with its correctness guardrails, and the navigation coordinator plus lifecycle polling fixes. Every change reads existing DTO fields or is pure interaction and local state.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ in spec.md with acceptance criteria.
- [ ] The home token-identity and test:web baseline is captured before any change.
- [ ] The SH-3 repo:/path: host dependency (cwd/branch) is cross-referenced to phase 006.

### Definition of Done
- [ ] HP-4 passes its acceptance test; the search batch, dock, and navigation coordinator each pass their tests.
- [ ] SD-1 ships with SD-2 and SD-6; SH-3's repo:/path: half is inert with the host fields absent.
- [ ] token-identity accounts for the SD-3 tokens, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The home surface already derives its roster through `session-list-seams.ts` (`sortByRecency`, `buildStatusList`, `matchesClientHeldQuery`, `filterRoster`) and renders cards via `card-session.svelte`. Navigation runs through `routes/+layout.svelte` `navigate`. These findings sit on those seams.

**HP-4** aggregates the count of `attention`-flagged cards via `attentionBadgeFor` in `card-projection.ts` and calls `navigator.setAppBadge(n)` / `clearAppBadge()` from the `routes/+layout.svelte` roster and visibility lifecycle; the cheapest variant reuses the device-local seen/unread count in `unread-overlay.ts` and `seen-marker.ts`, with push wiring in `attention.ts`. Absent the badge API it is a no-op.

**Home sort and density (HP-1, HP-5, SC-2, SC-4).** HP-1 adds a single-comparator smart sort beside `sortByRecency` / `buildStatusList`, toggled from `screen-home.svelte` and persisted in `roster-view-preference.ts`. HP-5 force-expands any collapsible section while a query is active. SC-2 adds a device-local density preference over the `card-session.svelte` inline-detail block. SC-4 maps `tool` to a glyph via a pure table beside `session-state-icon.svelte`.

**Search batch (SH-2, SH-3 free-term, SH-4, SH-5).** All live in `session-list-seams.ts` `filterRoster` / `matchesClientHeldQuery`. SH-2 searches `previewMessages` / `lastMessagePreview` with "matched in preview" labelling; SH-4 restricts matches to text the card actually renders; SH-5 adds a scored fuzzy subsequence ranker beside `sortByRecency`; SH-3's free-term half parses operators over `title` / `agent` / `model`, leaving `repo:` / `path:` inert until phase 006 lands `cwd` / `branch`. They land as one search upgrade.

**Dock batch (SD-1 through SD-6).** A net-new `pages/chat/chrome/dock-recent-sessions.svelte` over a client-local recency stack under `shared/state/`. SD-1 lists visited sessions newest-first and navigates via `getAppActions().navigate`. SD-2 factors one shared attention-badge resolver (working > permission > unread > done) in `attention.ts` used by both the dock chip and the home card. SD-6 reconciles the recency stack against `app.sessions.items` before render, using the `reconcile-seams.ts` pattern. SD-3 composites the status-dot ring against the local surface colour with tokens in `app.css`; SD-4 adds a scroll-metrics helper for the overflow strip; SD-5 reuses `shared/primitives/menu/` and `favorite-preference.ts` for the remove/confirm funnel. SD-1 must ship with SD-2 and SD-6.

**Navigation and lifecycle (NL-1, NL-2, NL-4, NL-5).** NL-1 makes `routes/+layout.svelte` `navigate` a single-slot coordinator (retarget same-host, cancel-and-restart otherwise, two-phase push) over the `session/[id]` and `attention/[lookupId]` entries. NL-2 makes exit-to-home stack-aware in `onHome` / `screen-chat.svelte` `onBack`. NL-4 pauses the roster poll while hidden and fires an immediate catch-up on refocus. NL-5 refetches on the offline-to-connected edge and adds pull-to-refresh cache-bypass. NL-1 is a prerequisite for clean deep-linking into the host-gated surfaces of phases 005 and 006.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · Wave-1 P0 quick-win
Land HP-4 (aggregate the attention count, call `setAppBadge` / `clearAppBadge`, fall back to the device-local unread count, no-op where the API is absent). Capture the home token-identity and test:web baseline first.

### Phase 2 · home sort/density and the search batch
Add HP-1, HP-5, SC-2, SC-4 over the home seams, then the SH-2 / SH-3-free-term / SH-4 / SH-5 search upgrade as one unit in `session-list-seams.ts`. The SH-3 repo:/path: operators are parsed but inert pending phase 006.

### Phase 3 · dock, navigation, and verification
Build the dock (SD-1 with SD-2 and SD-6 as guardrails, then SD-3/SD-4/SD-5 polish). Land the navigation coordinator NL-1 before NL-2, then the lifecycle fixes NL-4 and NL-5. Run token-identity (accounting for the SD-3 tokens), the badge/dock/nav/search regression tests, test:web, and the a11y-parity check. Confirm every task traces to a finding. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Search batch** - SH-2, SH-4, SH-5, and the SH-3 free-term half all live in `session-list-seams.ts` `filterRoster` / `matchesClientHeldQuery`; land as one search upgrade. Phase-006 SH-1 (the transcript-search RPC) reuses the same UI harness.
- **Dock batch** - SD-1 must ship with SD-2 (shared badge resolver) and SD-6 (recency sanitisation) as its correctness guardrails; SD-3, SD-4, SD-5 are polish on top.
- **Attention-resolver reuse** - SD-2's working > permission > unread > done resolver and phase-007 LA-1 arbitration are the same family; factor one shared resolver in `shared/format/attention.ts` used by the home card, the dock chip, and later the Live Activity, so all three can never disagree.
- **Nav coordinator** - NL-1 is a prerequisite for clean deep-linking into phase-006 CR-9 (source-control hub) and phase-005 AN-4 (notification to session); build NL-1 before those host-gated surfaces render.

| Finding | Depends On | Blocks |
|---------|------------|--------|
| HP-4 | None | None |
| SH-2, SH-4, SH-5 | None | Reused by phase-006 SH-1 UI harness |
| SH-3 (repo:/path:) | Host cwd/branch (phase 006) | None |
| SD-1 | SD-2, SD-6 | None |
| SD-2 | None | Phase-007 LA-1 shares the resolver family |
| SD-6 | None | SD-1 correctness |
| NL-1 | None | Phase-006 CR-9, phase-005 AN-4 deep-linking |
| NL-2 | NL-1 | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Wave-1 P0 quick-win | Low | HP-4 S |
| Home sort/density + search batch | Med | HP-1/SC-2/SC-4 M each, HP-5 S, search batch M |
| Dock + navigation + verify | Med/High | SD-1 M, SD-2 M, SD-3 S, SD-4 S/M, SD-5 S/M, SD-6 M, NL-1 M/L, NL-2/NL-4/NL-5 M |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | HP-1 four-class ordering; SD-2 badge precedence; SD-6 stale-id drop; SH-5 fuzzy ranking | Vitest |
| Interaction | HP-4 badge count/clear/no-op; NL-1 deep-link race; NL-4 pause/catch-up; NL-5 reconnect refetch | `test:web` |
| Fail-closed | SH-3 repo:/path: inert with host fields absent; dock never shows a host-dropped id | Vitest fixture |
| Visual | token-identity accounting for the SD-3 `app.css` tokens | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `session-list-seams.ts` roster seams | Internal | Green | HP-1, HP-5, all SH work |
| `attention` / `previewMessages` / `lastMessagePreview` DTO fields | Internal | Green | HP-4, SH-2, SH-4 |
| Host `cwd` / `branch` (SH-3 operators) | External (host) | Red | Repo/path operators inert until phase 006 lands them |
| `reconcile-seams.ts`, `favorite-preference.ts`, `shared/primitives/menu/` | Internal | Green | SD-5, SD-6 |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A navigation regression (double-push, blank route), a dock chip that opens nothing, or an unexpected token-identity diff on home CSS.
- **Procedure**: Changes are confined to `app-mobile/src/pages/home/**`, `app-mobile/src/routes/**`, `app-mobile/src/pages/chat/chrome/dock-recent-sessions.svelte`, `app-mobile/src/shared/{format,state}/**`, and `app-mobile/src/app.css`. `git checkout -- app-mobile` restores the prior home. Preferences and the recency stack are client-only; clearing their keys removes them. No host contract is created, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
