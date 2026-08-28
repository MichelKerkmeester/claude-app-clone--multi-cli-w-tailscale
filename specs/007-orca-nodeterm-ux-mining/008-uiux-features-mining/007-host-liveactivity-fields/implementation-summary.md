---
title: "Phase 7 implementation summary — Live Activity and host fields (COMPLETE)"
description: "Five ready-now Live-Activity findings shipped as pure modules and wired into the home card — single-slot arbitration on the shared attention resolver, a tick that refreshes rather than re-elects, one clip length with a three-tier content fallback, a boundary-aware stale watchdog, and a state-scoped latched dismiss — alongside eight host-gated findings that render nothing until their relay field lands, including a media player, a prompt-cache countdown, a subagent tail and project grouping."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-28T20:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped five ready-now findings wired into the home card; eight ship inert."
    next_safe_action: "All seven phases are complete; the parent packet can be closed."
    blockers:
      - "Eight findings stay dormant until the relay publishes the fields filed as REQ-019 through REQ-022."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 implementation summary — Live Activity and host fields

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | LA-1..7, CI-3, MA-3, SC-1, SC-3, SP-3, HP-6 (13) |
| **Commits** | `c44587d` |
| **Executors** | Six file-disjoint lanes plus a wiring pass: GPT-5.6 Luna at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **One session holds the slot, chosen by the shared resolver.**
  `shared/format/live-activity-arbitration.ts` picks needs-you before unread-done before working before idle,
  breaking ties on a device-local first-seen so the slot cannot flicker between equals. It decides through the
  existing `resolveAttentionBadge`, joining the home card and the recent-sessions dock on one authority so the
  three can never disagree.
- **A tick refreshes the winner; only an edge re-elects.** Re-running the election on every progress report
  would let a busy session repeatedly steal the slot from one that genuinely needs the person.
- **One clip length and a three-tier fallback.** `shared/format/live-activity-content.ts` prefers the turn's
  own prompt, then the activity line, then the plain state, clipping every tier identically.
- **A stale watchdog that admits it does not know.** `shared/state/live-activity-staleness.ts` grays the
  surface once the session stops reporting, scheduling to the boundary rather than polling.
- **A dismiss that latches to its state.** `shared/state/latched-dismiss.ts` keeps the row hidden across
  repeated ticks of the same state and brings it back when the state genuinely moves.
- **All four are consumed by `pages/home/card-session.svelte`**, so the behaviour is reachable rather than
  sitting as tested-but-unused logic.
- **Eight host-gated affordances, inert.** A typed edge-versus-tick push contract, a done treatment gated on
  a host end-reason flag rather than message text, adopt-once launch drafts, a media player over a revocable
  object URL, a prompt-cache countdown, token and tool-call segments beside the existing elapsed tick, an
  expandable subagent tail, and project grouping — each rendering nothing without its field.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Five file-disjoint lanes built the modules and gated surfaces, then a sixth pass wired the four ready-now
modules into the home card. That wiring pass was not optional: a check after the first five lanes found all
four modules had ZERO consumers in `app-mobile/src`, the same defect an earlier phase hit with an unmounted
dock. Eleven negative controls were then run by hand, each breaking a source and confirming the owning suite
went red before restoring it.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The Live Activity joins the existing resolver rather than adding a fourth.** The master plan called for
  one shared precedence across the home card, the dock and the Live Activity; a second table would have let
  the same session read differently on two surfaces.
- **Done is decided by a flag, never by text.** Matching message text would fire on any message that merely
  mentions finishing, and would break silently whenever wording changed.
- **The object URL is revoked in `onDestroy`, not an effect cleanup.** An effect cleanup runs before every
  re-run, so revoking there would tear down a URL still in use; a URL never revoked leaks the whole blob for
  the life of the page.
- **A tick is not an election.** This is the whole substance of the second finding and the easiest thing to
  implement incorrectly, so the guard is asserted directly.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1240 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 114 files / 782 passed + 3 skipped, and 83 files / 772 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens matched
  across light/dark/system`.
- `git status packages/` — clean; no protocol type was widened.
- The composer fences were checked line by line: every edit lands well before the mutation-path fence and no
  send, steer, stop, snapshot or keyboard-anchor path appears in the diff.
- A consumer check confirmed all four ready-now modules are imported and called by the home card.
- Eleven negative controls, each confirmed red on break and green on restore.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **Eight of the thirteen findings are dormant.** The push contract, the done flag, launch-draft adoption,
  the media player, the cache countdown, the count segments, the subagent tail and project grouping all
  render nothing until the relay publishes the fields filed as REQ-019 through REQ-022.
- **The content fallback will almost always land on its lowest tier.** Both `prompt` and `activity` are host
  fields that do not exist, so in practice the line shows the plain state today. That is correct rather than
  broken, but it means the tier logic is largely unexercised in production.
- **Four modules shipped unwired in the first pass.** They were built correctly and fully tested, yet nothing
  consumed them until a follow-up pass; a green suite said nothing about whether a person could see any of
  it. The consumer check that caught it is now part of this phase's verification.
- **Two negative controls initially proved nothing and were redone.** One targeted a function name that did
  not exist and another a field read through a helper, so both left the source unchanged. They were replaced
  with breaks that actually alter behaviour before the mechanisms were accepted as covered.
<!-- /ANCHOR:limitations -->
