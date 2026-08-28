---
title: "Phase 3 - Home, in-session switcher, navigation, and client search"
description: "Plan the home/roster surface, a net-new in-session switcher dock, the navigation coordinator, and the client-side search upgrade over the real app-mobile home and routes files, host-authoritative and fail-closed. Ships the Wave-1 PWA app-badge quick-win plus 18 pure-client findings: smart sort, card density, tool glyph, the MRU dock with its correctness guardrails, stack-aware navigation, background-pause polling, reconnect refetch, and preview/fuzzy search over fields already on the DTO."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped all nineteen findings; dock now mounted and on the shared resolver."
    next_safe_action: "Await operator go, then implement the HP-4 PWA app-badge quick-win first."
    blockers:
      - "SH-3 repo:/path: operator half needs host cwd/branch (phase 006); free-term half ships now."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 - Home, in-session switcher, navigation, and client search

> **Phase links**: Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (Wave 1, §5.1, §5.6, §5.7, §5.8) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-08-27 |
| **Findings owned** | HP-1, HP-4, HP-5, SC-2, SC-4, SD-1, SD-2, SD-3, SD-4, SD-5, SD-6, NL-1, NL-2, NL-4, NL-5, SH-2, SH-3, SH-4, SH-5 (19) |
| **Constraint** | Host-authoritative, fail-closed; the client owns no editable session truth |
| **Client vs host** | 19 client-ready-now; SH-3 has a host-gated repo:/path: operator half deferred to phase 006 |
| **Phase chain** | after `002-streaming-reader-media` · before `004-a11y-onboarding` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The home surface has no OS-level "N waiting" signal, one flat sort that cannot say a just-finished session outranks a still-churning one, and a search that matches only the opaque id and never preview text. There is no way to hop between concurrent sessions without a Home round-trip, deep-link entry points can race into a double-push or a blank route, and polling keeps running while the tab is hidden then shows a stale screen on return. These are all pure-client gaps over fields already on the DTO.

### Purpose
Give home a PWA app badge, a smart ordinal sort, tunable card density, and a fuzzy preview search; add a client-local MRU switcher dock with the correctness guardrails it needs; and make navigation stack-aware, background-friendly, and reconnect-fresh. Every change reads existing DTO fields or is pure interaction and local state. The one host-gated slice, the SH-3 repo:/path: operators, waits on cwd/branch from phase 006 while its free-term half ships now.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- HP-4: OS-level PWA app badge over the count of attention-flagged sessions.
- HP-1, HP-5: smart 4-class ordinal sort, and force-expand collapsible sections while filtering.
- SC-2, SC-4: device-local card density plus per-signal chip visibility, and a tool-to-glyph lookup on a working card.
- SD-1 through SD-6: a net-new client-local MRU switcher dock, its shared attention-badge resolver, status-dot CSS, overflow strip, remove/confirm funnel, and recency-stack sanitisation.
- NL-1, NL-2, NL-4, NL-5: single-slot navigation coordinator, stack-aware exit-to-home, background-pause polling, and reconnect-edge refetch plus pull-to-refresh cache-bypass.
- SH-2, SH-3 (free-term half), SH-4, SH-5: preview-text search, structured free-term operators, explainable-hits rule, and scored fuzzy ranking over fields already rendered.

### Out of Scope
- The host cwd/branch fields behind the SH-3 repo:/path: operators (phase 006 usage/search/review); that half ships inert until they land.
- The cross-session transcript-search RPC SH-1 (phase 006); this phase's SH work reuses the same UI harness.
- Notification and inbox surfaces (phase 005), which consume NL-1 for deep-linking.
- Any client-owned or client-edited session truth; the dock "close" only removes a local chip.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/routes/+layout.svelte` | Modify | HP-4 badge lifecycle; NL-1 `navigate` (~L90-92) and `handleInboxOpen`; NL-2 `onHome`; NL-4 roster fetch (~L220-241) and visibility (~L205-217); NL-5 online/offline (~L248-265) |
| `app-mobile/src/shared/format/card-projection.ts` | Modify | HP-4 `attentionBadgeFor`; SC-4 `tool`; SD-2 shared resolver home-card side |
| `app-mobile/src/shared/state/unread-overlay.ts` | Modify | HP-4 device-local unread fallback |
| `app-mobile/src/shared/format/seen-marker.ts` | Modify | HP-4 seen/unread count |
| `app-mobile/src/shared/format/attention.ts` | Modify | HP-4 push wiring; SD-2 shared attention-badge resolver |
| `app-mobile/src/pages/home/session-list-seams.ts` | Modify | HP-1 smart sort; HP-5 force-expand; SH-2/SH-3/SH-4/SH-5 search in `matchesClientHeldQuery` (~L317-328) and `filterRoster` |
| `app-mobile/src/pages/home/screen-home.svelte` | Modify | HP-1 grouping toggle; HP-5 section render; SH-2 search input; NL-5 `refreshRoster` (~L190-206) |
| `app-mobile/src/pages/home/card-session.svelte` | Modify | SC-2 inline-detail block (~L163-203); SC-4 `activityLine` (~L92-99); SD-2 badge; SH-4 preview render |
| `app-mobile/src/shared/format/roster-view-preference.ts` | Modify | HP-1 grouping pref; SC-2 density pref |
| `app-mobile/src/shared/chrome/session-state-icon.svelte` | Modify | SC-4 glyph table beside it |
| `app-mobile/src/pages/chat/chrome/dock-recent-sessions.svelte` | Create | SD-1 through SD-5 the MRU switcher dock component and its `<style>` |
| `app-mobile/src/shared/state/` (recency + scroll-metrics helpers) | Create | SD-1 recency stack, SD-4 scroll-metrics, SD-6 sanitisation |
| `app-mobile/src/app.css` | Modify | SD-3 status-dot ring tokens |
| `app-mobile/src/shared/primitives/menu/` | Reuse | SD-5 remove/confirm menu |
| `app-mobile/src/shared/state/favorite-preference.ts` | Modify | SD-5 pinned-chip guard |
| `app-mobile/src/shared/state/reconcile-seams.ts` | Reuse | SD-6 reconcile the recency stack against `app.sessions.items` |
| `app-mobile/src/pages/chat/screen-chat.svelte` | Modify | NL-2 `onBack`; NL-4 foreground refresh (~L281-300) |
| `app-mobile/src/routes/session/[id]/+page.svelte` | Modify | NL-1 typed session entry |
| `app-mobile/src/routes/attention/[lookupId]/+page.svelte` | Modify | NL-1 typed attention entry |
| `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` | Modify | NL-4 pause/resume; NL-5 reconnect-edge refetch |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (Wave-1 verified quick-wins)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [HP-4] Aggregate the count of attention-flagged cards and call `navigator.setAppBadge(n)` / `clearAppBadge()`; the cheapest variant uses the device-local seen/unread count already kept. | The badge equals the attention-flagged count and clears at zero; where `attention` is absent it falls back to the device-local unread count; where the badge API is unavailable it is a silent no-op; a test covers the count, clear, and no-op cases. |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-002 | [HP-1] A "Smart" single-comparator sort with four ordinal classes (needs-you > done-not-stale > working > idle/stale) over existing `status` plus `updatedAt`, offered as a grouping option beside Recency and Status. | Selecting Smart orders a just-finished session above a still-working one; the option persists per device; a test asserts the four-class ordering. |
| REQ-003 | [HP-5] When a filter or search is active, force-expand any collapsible section so a hit is never hidden. Conditional: only bites once the roster earns collapsible sections. | With a query active, no matching card is hidden inside a collapsed section; when there are no collapsible sections the rule is a no-op. |
| REQ-004 | [SC-2] Device-local card density (Compact / Detailed) plus per-signal chip visibility over whichever optional fields exist. Pure preference. | Toggling density changes the inline-detail block only for this device; hidden chips do not render; no host field is read or written. |
| REQ-005 | [SC-4] Map the `tool` field to an icon glyph on a working card via a pure lookup, replacing the text `activity (tool)` line. | A known tool renders its glyph; an unknown tool falls back to text; the glyph table is a pure lookup with no host call. |
| REQ-006 | [SD-1] An MRU quick-switcher dock hops between visited live sessions, most-recent-first, over session ids already held. | Opening the dock lists visited sessions newest-first and navigating selects one via `getAppActions().navigate`; the recency stack is client-local. |
| REQ-007 | [SD-2] One shared attention-badge resolver (working > permission > unread > done) as a pure function feeds BOTH the dock chip and the home card, so they never disagree. | The home card and dock chip render the same badge for the same session in every state; the resolver is a single pure function; a test covers the precedence order. |
| REQ-008 | [SD-3] Composited status-dot CSS: a ring keyed to the local surface colour, swapped per state, avoiding the dark-mode halo. | The dot reads cleanly on idle and selected backgrounds in both themes; no halo in dark mode; token-identity accounts for the new `app.css` tokens. |
| REQ-009 | [SD-4] Overflow strip: a fade mask only on real overflow, a slim thumb, and stick-to-end auto-reveal only when already at the end. | The fade shows only when the strip overflows; a new chip auto-reveals only if the user was at the end; a mid-scroll thumb is never yanked. |
| REQ-010 | [SD-5] Remove-others / remove-this (disabled when a no-op) plus a single confirm funnel before removing a pinned chip. | A no-op remove action is disabled; removing a pinned chip routes through one confirm; a fat-fingered swipe cannot silently drop a pin. |
| REQ-011 | [SD-6] Sanitize the client recency stack against the host's CURRENT session set before render, dropping ids the host stopped reporting. The fail-closed guardrail SD-1 needs. | A stale, unopenable id never appears in the dock; the stack reconciles against `app.sessions.items` before every render; a test covers the drop case. |
| REQ-012 | [NL-1] A single-slot navigation coordinator for competing deep-link entry points: retarget same-host, cancel-and-restart otherwise, two-phase push. | A notification tap racing a manual tap never double-pushes or lands on a blank route; same-host retargets, cross-host cancels-and-restarts; a test covers the race. |
| REQ-013 | [NL-2] Smart exit-to-home: pop-if-on-stack, replace-if-root (a `dismissTo('/')` equivalent), so back feels native whether chat was entered via a card or a deep link. | Back from a card-entered chat pops; back from a deep-link-entered chat replaces to home; neither leaves a dangling nested route. |
| REQ-014 | [NL-4] Background-pause / instant-resume polling: fully stop periodic refreshes while the tab is hidden, fire an immediate catch-up read on refocus. | Hidden-tab polling stops; refocus fires one immediate read; no momentarily-stale screen on return; a test covers pause and catch-up. |
| REQ-015 | [NL-5] Forced refetch on the offline-to-connected edge, plus pull-to-refresh cache-bypass. Pull-to-refresh partly exists on home; add the reconnect-edge refetch. | Reconnecting after an offline gap refetches rather than showing the pre-background snapshot; pull-to-refresh bypasses the cache; a test covers the reconnect edge. |
| REQ-016 | [SH-2] Live cross-session "found in preview" search over `previewMessages` / `lastMessagePreview` (both on the DTO), with honest "matched in preview" labelling. | Typing a term surfaces sessions whose preview contains it, labelled "matched in preview"; only DTO-present preview fields are searched. |
| REQ-017 | [SH-3] Structured query operators in one box: a free-term MVP over `title` / `agent` / `model` ships now; the `repo:` / `path:` operators are inert until the host publishes `cwd` / `branch`. | Free terms match title/agent/model immediately; a `repo:` / `path:` token is parsed but inert with the host fields absent. Host dependency: `cwd` / `branch` on the card DTO (phase 006 §6.2). Client-ready-now: the free-term parse and match; blocked-on-host: the repo/path operators. |
| REQ-018 | [SH-4] Only match text the preview UI actually shows (`previewMessages`), so every hit is explainable and highlightable; never match hidden text. | Every search hit corresponds to visible preview text and can be highlighted; no hit lands on text the card does not render. |
| REQ-019 | [SH-5] Scored fuzzy subsequence ranking (gap penalty plus word-boundary and full-match bonuses, "clde" to "claude") over fields already rendered. | A fuzzy fragment ranks the intended session first; the ranker applies gap penalty and boundary bonuses; a test covers the "clde" case. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: The HP-4 Wave-1 P0 finding ships as pure local-state over `attention` with a regression test, and none of the 19 findings makes the client own session truth.
- **SC-003**: The dock ships with SD-2 and SD-6 as its correctness guardrails; the search upgrade lands as one unit in `session-list-seams.ts`; SH-3's repo:/path: half is inert and points at phase 006.
- **SC-004**: token-identity accounts for the SD-3 `app.css` tokens with 0 unexpected diffs, test:web is green, and the a11y contract (roster roles, dock focus order, dismissal) is preserved from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | SD-1 stale chip | High: a dock chip for a session the host dropped is unopenable | SD-6 sanitises the stack against `app.sessions.items` before every render |
| Risk | SD-2 / home-card disagreement | Med: two surfaces showing different badges erodes trust | One shared pure resolver feeds both; unit-test the precedence |
| Risk | NL-1 deep-link race | High: a double-push or blank route on cold start | Single-slot coordinator, two-phase push, retarget-or-restart; test the race |
| Dependency | Host cwd/branch (SH-3 operators) | SH-3 repo:/path: half inert until phase 006 lands them | Ship the free-term half now; parse the operators inert |
| Risk | SD-3 dark-mode halo | Low: a naive ring halos in dark mode | Composite the ring against the local surface colour; verify in both themes |
| Risk | NL-4 pause misses an edge | Med: a paused poll could miss a state change | Fire an immediate catch-up read on refocus; NL-5 refetches on reconnect |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The fuzzy ranker and preview search run over the already-loaded roster without a host round-trip and stay responsive on a large roster (debounced input, no per-keystroke re-fetch).

### Security
- **NFR-S01**: The recency stack, density preference, and grouping preference are client-only and never reach the host; the dock never asserts session ownership.

### Reliability
- **NFR-R01**: Every preference and recency read is try/catch guarded; SD-6 fail-closes any id absent from the host's current session set before render.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty roster: the badge clears to zero and search returns nothing without error.
- Missing optional field: SC-4 falls back to text and SC-2 hides the absent chip.

### Error Scenarios
- Badge API unavailable: HP-4 is a silent no-op.
- Host drops a session mid-session: SD-6 removes it from the dock before render.

### State Transitions
- Deep-link tap racing a manual tap: NL-1 single-slot coordinator serialises them.
- Tab hidden then refocused: NL-4 stops then fires one immediate catch-up read.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 20/25 | 19 findings across home, a new dock, routes, and search; ~18 files |
| Risk | 13/25 | Navigation coordinator and dock guardrails are behavioural; no schema/breaking change |
| Research | 8/20 | Paths grounded; SH-3 operator half needs a host field decision |
| **Total** | **41/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Does the roster earn collapsible sections in this phase (HP-5 is conditional on them), or does HP-5 ship as a dormant rule?
- Should the MRU dock be a persistent chrome strip or an on-demand overlay, given the small-screen budget and the SD-4 overflow contract?
<!-- /ANCHOR:questions -->
