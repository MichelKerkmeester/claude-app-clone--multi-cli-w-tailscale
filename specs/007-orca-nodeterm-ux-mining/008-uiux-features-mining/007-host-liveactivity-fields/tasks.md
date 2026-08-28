---
title: "Phase 7 tasks - Live-Activity and host DTO-field ledger (LA + SC + CI + MA + SP + HP findings)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; ready-now first, host-gated inert; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the Live-Activity and host DTO-field task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1 (LA-1 arbitration)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 tasks - Live-Activity and host DTO fields

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN; this packet is a plan and nothing implements until the operator says go. `[B]` marks a host-gated task inert until its relay field lands.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_READY-NOW LIVE-ACTIVITY MODULES_

- [x] T1.1 [LA-1 → REQ-001] Build the single-slot arbitration function (needsYou > unread-done > working > idle, ties on first-seen) over `attention` plus local first-seen as a pure module under `shared/format/` (the shared attention resolver the phase-003 dock reuses). Done: fixture test covers tier and tie cases; `card-session.svelte` consumes it. [evidence: `live-activity-arbitration.ts` decides through the shared `resolveAttentionBadge` and breaks ties on first-seen, covered by `live-activity-arbitration.test.ts`]
- [x] T1.2 [LA-2 → REQ-002] Guard the arbitration in the same module so an activity tick refreshes the winner in place and never re-elects. Done: fixture test covers tick-vs-edge; a tick on a non-winner does not re-rank. [evidence: a tick refreshes the winner in place; letting a tick re-run the election turns 1 red]
- [x] T1.3 [LA-3 → REQ-003] Build one clip length plus a 3-tier content fallback (You:prompt > activity > state) as a pure module under `shared/format/`, over `prompt`/`activity`. Done: same input yields the same clipped string on home card, transcript header, Live Activity; no blank line between turns. [evidence: `live-activity-content.ts` applies one clip constant across a three-tier fallback, covered by `live-activity-content.test.ts`]
- [x] T1.4 [LA-5 → REQ-005] Build a client stale watchdog under `shared/state/` that grays the surface once `updatedAt` exceeds the staleness window, boundary-aware wake. Done: fixture test covers the lost-end case; a fresh update re-arms it. [evidence: `live-activity-staleness.ts` schedules to the boundary and pins its window with a literal; making the window infinite turns 3 red]
- [x] T1.5 [LA-7 → REQ-007] Build a latched, state-scoped dismiss under `shared/state/` that re-shows the row when the underlying state genuinely moves; reusable for a future in-app running banner. Done: fixture test covers dismiss-then-move; unchanged state stays hidden. [evidence: `latched-dismiss.ts` latches per state; dropping the latch or the release each turns 1 red]
- [x] T1.6 [cross-cutting] Capture the token-identity and test:web baseline for `card-session.svelte` and the touched surfaces before any change. Done: baseline recorded. [evidence: baseline captured before the lanes ran: typecheck 1232 files 0 errors, 108+77 suite files, 760+749 tests, token-identity PASS]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_HOST-GATED SCAFFOLDS (inert until the field lands)_

- [x] T2.1 [LA-4 → REQ-004] [B] Wire the typed edge-versus-tick push contract through `shared/format/attention.ts` and the service worker (edges priority 10 immediate, ticks coalesced priority 5 at 20s+). BLOCKED on the push contract (`../../007-host-requests/`). Done: inert with the contract absent; edges immediate and ticks coalesced against a fixture. [evidence: `push-edge-tick.ts` delivers edges immediately and coalesces ticks, covered by `push-edge-tick.test.ts`]
- [x] T2.2 [LA-6 → REQ-006] [B] Gate the done treatment on an end-reason flag, never the text, in `attention.ts` and the service worker. BLOCKED on an end-reason flag on the done edge. Done: neutral done with the flag absent; honest interrupted/stale state against a fixture flag. [evidence: the done treatment is gated on the host end-reason flag; adding a text fallback turns 2 red in `transcript-list-gated-surfaces.svelte.test.ts`]
- [x] T2.3 [CI-3 → REQ-008] [B] Adopt a host-parked launchDraft once into an empty composer over the phase-001 CI-1 store in `pages/chat/chrome/session-composer.svelte` + `shared/commands/`; retire on the first real turn. BLOCKED on read-only `unsentInputDraft` + `unsentInputDraftAt`. Done: inert with fields absent; adopt-once and retire against a fixture. [evidence: `adopt-launch-draft.ts` adopts once into an empty composer; allowing adoption over a non-empty draft turns 1 red]
- [x] T2.4 [MA-3 → REQ-009] [B] Replace the dead notice in `pages/chat/artifacts/unsupported-preview.svelte` with a player over a scoped, revocable object URL in `pages/chat/artifacts/use-artifact-resource.svelte.ts`. BLOCKED on a video/audio preview kind + object-URL delivery. Done: notice unchanged with kind absent; play then revoke against a fixture. [evidence: `media-player.svelte` plays over a revocable object URL; removing the revoke turns 1 red in `unsupported-preview.svelte.test.ts`]
- [x] T2.5 [SC-1 → REQ-010] [B] Add a minute-boundary MM:SS prompt-cache countdown chip to `pages/home/card-session.svelte`. BLOCKED on `cacheExpiresAt`. Done: absent with no field; counts down and clears at expiry against a fixture timestamp. [evidence: the cache countdown chip is absent without `cacheExpiresAt` and ticks on the minute boundary against a fixture]
- [x] T2.6 [SC-3 → REQ-011] Add token and tool-call count segments beside the elapsed tick (phase-002 SP-2) in `pages/home/card-session.svelte`. Elapsed renders now; counts BLOCKED on token + tool-call counts on a working session. Done: count segments absent with no counts, never faked; live against a fixture. [evidence: the elapsed tick renders alone; each count segment appears only with its own fixture field and is never faked]
- [x] T2.7 [SP-3 → REQ-012] [B] Add an expandable subagent/task activity tail to `pages/chat/transcript/transcript-list.svelte`. BLOCKED on a host subagent-activity stream. Done: absent with no stream; live feed and expand against a fixture stream. [evidence: the subagent tail is absent without a stream and renders collapsed with one, covered by `transcript-list-gated-surfaces.svelte.test.ts`]
- [x] T2.8 [HP-6 → REQ-013] [B] Group the home over `projectLabel` in `pages/home/session-list-seams.ts` + `pages/home/screen-home.svelte`; auto-collapse every group but the active one; explicit toggles win. BLOCKED on a `projectLabel` field. Done: ungrouped with no field; auto-collapse and explicit-toggle against a fixture label. [evidence: grouping keys off host `projectLabel` only; returning a fabricated label when the host sent none turns 1 red]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 [ready-now] Fixture tests for LA-1, LA-2, LA-3, LA-5, LA-7 green; the home card consumes each module. Done: all fixture tests pass. [evidence: all four ready-now modules are imported and called by `card-session.svelte`; bypassing the content fallback, the staleness result or the latch each turns tests red]
- [x] T3.2 [fail-closed] Every host-gated finding renders nothing with its field absent and correctly against a fixture field. Done: absent-field and fixture-field cases asserted. [evidence: every host-gated affordance is absent without its field, asserted per finding across the gated-surface suites]
- [x] T3.3 [token-identity + test:web + a11y] token-identity 0-diff on the touched CSS; test:web green; a11y-parity preserved, all from the final state. Done: all green, evidence captured. [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; 114 files 782 passed and 83 files 772 passed from the final state]
- [x] T3.4 [traceability] Every task cites a finding id and a real file; every host-gated finding cross-references `../../007-host-requests/`. Done: no traceless task. [evidence: every task cites a finding id and a real file; the eight host-gated findings are filed as REQ-019 through REQ-022 in `../../007-host-requests/spec.md`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] The five ready-now Live-Activity findings (LA-1, LA-2, LA-3, LA-5, LA-7) implemented as pure modules with fixture tests, consumed by the home card. [evidence: all four modules are imported and called by `card-session.svelte`, and `card-session-live-activity.svelte.test.ts` fails if any wiring is bypassed]
- [x] Every host-gated finding (LA-4, LA-6, CI-3, MA-3, SC-1, SC-3 counts, SP-3, HP-6) shipped inert behind its field and cross-referenced to `../../007-host-requests/`. [evidence: each renders nothing without its field, and the fields are filed as REQ-019 through REQ-022 with HP-6 cross-referenced to REQ-002]
- [x] token-identity, test:web, a11y-parity green from the final state. [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; 114 files 782 passed and 83 files 772 passed]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements, host dependencies, and acceptance criteria.
- `plan.md` - the sequenced approach and the attention-resolver and draft-persistence batches.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 3, §6.6, §6.8, §6.9.
- `../../007-host-requests/` - the relay-side fields this phase's host-gated findings depend on.
<!-- /ANCHOR:cross-refs -->
