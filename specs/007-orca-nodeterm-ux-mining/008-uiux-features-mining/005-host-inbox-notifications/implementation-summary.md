---
title: "Phase 5 implementation summary — inbox and notifications (COMPLETE)"
description: "One shipped device-local read/archive overlay plus twelve host-gated findings built as pure, fixture-tested modules that render nothing until their relay field lands: a cross-session inbox timeline with dedup, supersede and retention, an ack that clears only on the host re-broadcast, inline approvals that refuse a stale ticket, an atomic catch-up watermark, a presence-aware push hold queue, kind gates evaluated before throttling, fail-closed notification tap routing, and flash-free banner retraction."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-28T16:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped CE-5 real; the other twelve ship inert with host fields filed."
    next_safe_action: "Operator picks phase 006; twelve findings here wait on relay fields."
    blockers:
      - "Twelve of the thirteen findings stay dormant until the relay publishes the fields filed as REQ-009 through REQ-013."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 5 implementation summary — inbox and notifications

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | CE-1, CE-2, CE-3, CE-4, CE-5, CE-6, CE-7, HP-3, AN-1, AN-2, AN-3, AN-4, AN-5 (13) |
| **Commits** | `2c1917a` |
| **Executors** | Six file-disjoint lanes in two waves: GPT-5.6 Luna at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **One real feature.** `shared/state/inbox-read-state.ts` layers a device-local read overlay OVER the host's
  own resolved state, so reading a card hides it from this device's badge and list without asserting anything
  about the host. Unreadable storage shows every card rather than hiding what it cannot account for.
- **A cross-session timeline, inert.** `shared/format/inbox-timeline.ts` orders events newest-first across
  sessions, dedups a repeated ask inside a ten-minute window, supersedes an answered or changed ask, and
  retains the newest done plus newest unresolved per node. `screen-attention-inbox.svelte` consumes it behind
  a capability check and keeps today's snapshot list until a stream exists.
- **An acknowledgement that clears everywhere, inert.** `shared/format/inbox-ack.ts` emits an intent on open,
  but only the host's re-broadcast clears the card — a local open alone changes nothing, so this device can
  never disagree with the others.
- **Inline approvals that refuse a stale ticket.** The inbox card re-checks still-blocked before acting, so
  an approval answered elsewhere is refused rather than silently applied.
- **Delivery integrity, inert.** `shared/state/notification-watermark.ts` persists `{seq, epoch}` atomically
  and quarantines an incomplete or epoch-mismatched catch-up instead of advancing past a gap.
- **Notification policy, inert.** `shared/state/push-hold-queue.ts` holds an alert that arrives while the
  person is looking at the app, flushes it in order on background and drops it if it resolved meanwhile;
  `shared/format/push-kind-gate.ts` evaluates the kind gate BEFORE the throttle so a muted kind cannot eat
  the budget.
- **A tap that refuses the unknown.** `shared/format/notification-tap-route.ts` refuses an unknown host and a
  malformed payload outright, with no fallback to whichever host happens to be paired.
- **Retraction without a flash.** `shared/state/banner-retraction.ts` cancels a dismissal that arrives before
  or during the show, so no show-after-dismiss sequence is ever emitted.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Six executor lanes in two waves. Because four separate tasks wanted `attention.ts` and two wanted the inbox
screen, the blocked findings were built as PURE modules owning only new files, each with its own explicitly
host-shaped input type, and wired into components in the second wave. Nineteen negative controls were run by
hand, plus an independent fail-closed probe that called every host-gated module with absent and empty input
and confirmed each produced nothing.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **No module imports or widens `AttentionItemDto`.** Each defines its own input type describing the shape the
  host would publish. Casting a fixture to the protocol type would have made a dormant surface look wired and
  put a fabricated `sessionId` one refactor away from being believed.
- **The ack clears on the host's re-broadcast, not on the local open.** Clearing locally first would make this
  device disagree with every other one until the host caught up, which is the bug the finding describes.
- **The kind gate runs before the throttle.** If a muted kind consumed a throttle slot it would silently
  suppress a kind the person actually asked for, so the ordering is the requirement rather than an
  implementation detail.
- **An unknown host is refused, never redirected.** Falling back to the currently paired host would open the
  wrong host's session from a notification, which is a cross-host leak rather than a convenience.
- **The push and retraction logic is a pure module, not service-worker code.** The tasks named the service
  worker, but nothing in a service worker can be exercised without host push, so wiring it now would have
  produced untestable scaffolding. The logic is built and covered; only its final attachment waits.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1200 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 103 files / 735 passed + 3 skipped, and 73 files / 727 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens matched
  across light/dark/system`.
- `git status packages/` — clean, confirming no protocol type was widened to make a fixture typecheck.
- An independent fail-closed probe called each host-gated module with absent and empty input; all returned
  nothing. Making the screen synthesise a timeline from the snapshot it already holds turns six tests red.
- Nineteen negative controls across the phase's mechanisms, each confirmed red on break and green on restore.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **Twelve of the thirteen findings are dormant.** Only CE-5 is reachable today. The rest are pure logic with
  fixture tests and a capability check; they render nothing and emit nothing until the relay publishes the
  fields filed as REQ-009 through REQ-013. Nothing here should be read as a working inbox timeline.
- **The service-worker attachment is not written.** The push hold queue and banner retraction are complete as
  logic but are not connected to a service worker, because host push does not exist to drive them.
- **The bulk-acknowledgement bar has no RPC.** It is gated on a host callback and issues nothing without one;
  it is explicitly low priority and may be dropped rather than shipped.
- **Two negative controls initially proved nothing and were redone.** Renaming every occurrence of a field
  left the module self-consistent, and replacing an early return with an equivalent expression changed no
  behaviour. Both were replaced with breaks that actually alter the outcome before the mechanisms were
  accepted as covered.
<!-- /ANCHOR:limitations -->
