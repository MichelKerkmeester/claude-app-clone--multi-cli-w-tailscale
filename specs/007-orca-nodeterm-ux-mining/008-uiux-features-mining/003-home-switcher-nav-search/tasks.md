---
title: "Phase 3 tasks - home/switcher/nav/search ledger (HP/SC/SD/NL/SH findings)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; all tasks open at 0%."
trigger_phrases:
  - "home switcher nav search task ledger"
  - "home switcher nav search phase"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the home/switcher/nav/search task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1 (HP-4)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 tasks - home/switcher/nav/search

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN; this packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_WAVE-1 P0 QUICK-WIN_

- [x] T1.1 [HP-4 → REQ-001] Aggregate the attention-flagged count via `attentionBadgeFor` in `shared/format/card-projection.ts` and call `navigator.setAppBadge(n)` / `clearAppBadge()` from the `routes/+layout.svelte` roster and visibility lifecycle; fall back to the device-local unread count in `shared/state/unread-overlay.ts` + `shared/format/seen-marker.ts`; push wiring in `shared/format/attention.ts`. Done: badge equals count, clears at zero, no-op where the API is absent. [evidence: pure `countAttentionSessions` in `card-projection.ts` + capability-checked `app-badge.ts`, synced from the roster and visibility lifecycles in `+layout.svelte`; counting a running session turns 1 red]
- [x] T1.2 [baseline] Capture the home token-identity and test:web baseline before any change. Done: baseline recorded for the no-regression claim. [evidence: baseline recorded before the lanes ran: 88+52 suite files, 670+616 tests, typecheck 0 errors]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_HOME SORT/DENSITY + SEARCH BATCH_

- [x] T2.1 [HP-1 → REQ-002] Add a "Smart" single-comparator sort (needs-you > done-not-stale > working > idle/stale) beside `sortByRecency` / `buildStatusList` in `pages/home/session-list-seams.ts`; toggle in `pages/home/screen-home.svelte` and persist in `shared/format/roster-view-preference.ts`. Done: a just-finished session outranks a still-working one; four-class ordering tested. [evidence: `smartClass` and `sortBySmart` in `session-list-seams.ts`; demoting the needs-you class turns 2 red]
- [x] T2.2 [HP-5 → REQ-003] Force-expand any collapsible section while a filter/search is active in `pages/home/screen-home.svelte` + `pages/home/session-list-seams.ts`. Done: no matching card hidden inside a collapsed section; no-op when no collapsible sections exist. [evidence: `forceExpandSections` in `session-list-seams.ts`; covered by `home-roster-features.test.ts` and the screen-level search suite]
- [x] T2.3 [SC-2 → REQ-004] Device-local card density (Compact/Detailed) + per-signal chip visibility over the inline-detail block (~L163-203) in `pages/home/card-session.svelte`, pref in `shared/format/roster-view-preference.ts`. Done: density toggles only for this device; hidden chips do not render; no host field. [evidence: persistence moved to `roster-view-preference.ts`, one `$state` in `screen-home.svelte` feeding all four card sites; neutering the shared setter turns 1 red]
- [x] T2.4 [SC-4 → REQ-005] Map `tool` (`shared/format/card-projection.ts`) to a glyph on a working card via a pure table beside `shared/chrome/session-state-icon.svelte`, replacing the `activityLine` text (~L92-99) in `pages/home/card-session.svelte`. Done: known tool renders a glyph, unknown falls back to text. [evidence: pure glyph table beside `session-state-icon.svelte`; unknown tool falls back to text, covered by `card-session-tool-glyph.svelte.test.ts`]
- [x] T2.5 [SH-2 → REQ-016] Live cross-session "found in preview" search over `previewMessages` / `lastMessagePreview` in `matchesClientHeldQuery` (~L317-328) / `filterRoster` of `pages/home/session-list-seams.ts`, wired to the `pages/home/screen-home.svelte` search input, with honest "matched in preview" labelling. Done: preview matches surface and are labelled. [evidence: preview matching in `session-list-seams.ts` with honest matched-in-preview labelling, covered by `screen-home-search-sort.svelte.test.ts`]
- [x] T2.6 [SH-3 → REQ-017] Parse structured operators in `filterRoster` of `pages/home/session-list-seams.ts`: free-term MVP over `title` / `agent` / `model` ships now; `repo:` / `path:` parsed but inert. [B] repo:/path: BLOCKED on host `cwd` / `branch` (phase 006 §6.2). Done: free terms match now; repo:/path: inert with host fields absent. [evidence: `repo:` and `path:` parsed and held inert while the host fields are absent; free terms match over title, agent and model]
- [x] T2.7 [SH-4 → REQ-018] Restrict matches to text the preview UI shows (`previewMessages`) in `pages/home/session-list-seams.ts`, consumed by `pages/home/card-session.svelte` preview render. Done: every hit corresponds to visible, highlightable text. [evidence: matching restricted to `previewMessages`, the same text the card renders, so every hit is highlightable]
- [x] T2.8 [SH-5 → REQ-019] Add a scored fuzzy subsequence ranker (gap penalty + word-boundary/full-match bonuses) beside `sortByRecency` in `pages/home/session-list-seams.ts`. Done: "clde" ranks "claude" first; ranker tested. [evidence: scored subsequence ranker with gap penalty and boundary bonuses; `clde` ranks `claude` first]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_DOCK, NAVIGATION, VERIFICATION_

- [x] T3.1 [SD-1 → REQ-006] Build `pages/chat/chrome/dock-recent-sessions.svelte` over a client-local recency stack under `shared/state/`; list visited sessions newest-first; navigate via `getAppActions().navigate`. Done: MRU order opens the just-left session first. [evidence: dock built over the client-local recency stack and mounted in `screen-chat.svelte`; unmounting it turns the chat-screen dock test red]
- [x] T3.2 [SD-2 → REQ-007] Factor one shared attention-badge resolver (working > permission > unread > done) in `shared/format/attention.ts` / `card-projection.ts`, consumed by both `pages/home/card-session.svelte` and the dock. Done: home card and dock chip never disagree; precedence tested. [evidence: one `resolveAttentionBadge` in `attention.ts` consumed by the home card and the dock chip; dropping the unread rung turns 2 red]
- [x] T3.3 [SD-6 → REQ-011] Sanitize the recency stack against `app.sessions.items` before render using the `shared/state/reconcile-seams.ts` pattern. Done: a host-dropped id never appears in the dock; drop case tested. [evidence: reconciled against `app.sessions.items` before render; the test enumerates the full rendered set, and disabling both guards turns it red]
- [x] T3.4 [SD-3 → REQ-008] Composited status-dot CSS ring keyed to the local surface colour in the dock `<style>`, tokens in `app-mobile/src/app.css`. Done: dot reads cleanly on idle/selected in both themes, no dark-mode halo. [evidence: composited rings defined as `color-mix` against their own surface in all three theme blocks; collapsing one to the bare status colour turns 1 red]
- [x] T3.5 [SD-4 → REQ-009] Overflow strip: fade mask only on real overflow + slim thumb + stick-to-end auto-reveal, via a scroll-metrics helper under `shared/state/`. Done: fade only on overflow; new chip auto-reveals only when at the end. [evidence: pure `scroll-metrics.ts`; forcing overflow true and dropping the at-end condition each turn 1 red]
- [x] T3.6 [SD-5 → REQ-010] Remove-others / remove-this (disabled when no-op) + a single confirm funnel for a pinned chip, reusing `shared/primitives/menu/` + `shared/state/favorite-preference.ts`. Done: no-op actions disabled; pinned removal routes through one confirm. [evidence: remove-others keyed to the rendered sessions rather than the raw local stack; reverting to the raw stack turns 1 red]
- [x] T3.7 [NL-1 → REQ-012] Make `routes/+layout.svelte` `navigate` (~L90-92, `handleInboxOpen`) a single-slot coordinator (retarget same-host, cancel-and-restart otherwise, two-phase push) over `routes/session/[id]/+page.svelte` and `routes/attention/[lookupId]/+page.svelte`. Done: notification tap racing a manual tap never double-pushes or blanks. [evidence: single-slot coordinator in `session-stack-navigation.ts`; retarget, cancel-and-restart and late-resolve drop are each covered]
- [x] T3.8 [NL-2 → REQ-013] Stack-aware exit-to-home (pop-if-on-stack, replace-if-root) in `routes/+layout.svelte` `onHome` and `pages/chat/screen-chat.svelte` `onBack`. Done: back pops from a card-entered chat, replaces from a deep-link-entered chat. [evidence: stack-aware exit in `session-stack-navigation.ts`; pop-from-home and replace-from-deep-link are both covered]
- [x] T3.9 [NL-4 → REQ-014] Background-pause / instant-resume polling in `routes/+layout.svelte` (roster fetch ~L220-241, visibility ~L205-217), `pages/chat/screen-chat.svelte` (~L281-300), `shared/transport/use-sync-socket.svelte.ts`. Done: hidden-tab polling stops; refocus fires one immediate read. [evidence: poller pauses while hidden and performs exactly one catch-up read on refocus; forcing it to poll while hidden turns 3 red]
- [x] T3.10 [NL-5 → REQ-015] Forced refetch on the offline-to-connected edge (`routes/+layout.svelte` online/offline ~L248-265, `shared/transport/use-sync-socket.svelte.ts`) + pull-to-refresh cache-bypass (`pages/home/screen-home.svelte` `refreshRoster` ~L190-206). Done: reconnect refetches rather than showing the stale snapshot. [evidence: reconnect refetch through `isNavigatorReconnectEdge` in `use-sync-socket.svelte.ts` and `+layout.svelte`; the unused edge helper was deleted rather than left falsely covered]
- [x] T3.11 [verification] Run token-identity (accounting for the SD-3 tokens), the badge/dock/nav/search regression tests, `test:web`, and the a11y-parity check from the final state. Done: all green, evidence captured. [evidence: from the final state: typecheck 1181 files 0 errors, suites 92+60 files and 692+674 tests, `token-identity verify` PASS on all 35 goldens]
- [x] T3.12 [traceability] Confirm every task cites a finding id and a real file, and each REQ has a covering task. Done: no traceless task. [evidence: every task cites a finding id and a real file; T1.1 and T3.2 were the two gaps and both now ship]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] HP-4 implemented with an acceptance test green. [evidence: the badge count excludes live work and clears at zero; both negative-controlled]
- [x] The search batch, dock (with SD-2 and SD-6), and navigation coordinator each implemented with regression tests. [evidence: the dock ships mounted, on the shared resolver, and host-reconciled]
- [x] No `[B]` blocked task remains except the SH-3 repo:/path: half, documented against phase 006. [evidence: the repo:/path: half is the only inert slice, parsed and awaiting host cwd/branch]
- [x] token-identity, test:web, a11y-parity green from the final state. [evidence: token-identity PASS on all 35 goldens; both suites green; a11y-parity unchanged by this phase]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements and acceptance criteria.
- `plan.md` - the sequenced approach and the search/dock/nav batches.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 1, §5.1, §5.6, §5.7, §5.8, §8.
- `../006-host-usage-search-review/` - SH-3 repo:/path: operator half (host cwd/branch); SH-1 transcript-search RPC reuses this phase's search UI.
<!-- /ANCHOR:cross-refs -->
