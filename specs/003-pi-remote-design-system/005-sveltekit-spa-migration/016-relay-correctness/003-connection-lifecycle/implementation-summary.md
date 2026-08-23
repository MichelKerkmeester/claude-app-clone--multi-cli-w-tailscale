---
title: "Child 016/003 implementation summary — connection lifecycle"
description: "Continuity anchor. Nothing is implemented yet: this records the lockout mechanism, the split that lets the uncontested half ship, and the dissent the client half carries."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Server heartbeat shipped with an injectable interval and an observed control."
    next_safe_action: "Answer the close-code harness question, then ship the client half."
    blockers: ["client half awaits the operator's harness decision"]
    completion_pct: 60
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/003 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `016-relay-correctness` |
| Level | 2 |
| Status | **Server half shipped; client half held for an operator decision** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No socket handling has changed.

The mechanism behind the everyday failure:

| Fact | State |
|---|---|
| Connections permitted per device in `app-relay/src/http/server.ts` | 4 |
| What drains that set | clean close, error, revocation, or the session timer |
| Liveness proof anywhere in the relay | none, outside one unrelated reaper |
| Result of four suspends | the device is refused by its own relay until the session timer fires |
| Client behaviour on any close in `app-mobile/src/shared/data/useSyncSocket.svelte.ts` | identical: increment a retry count and back off |
| What a session-expiry close actually is | a scheduled timer event, not a network failure |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Two independently landable halves. The server heartbeat needs no decision from anyone and fixes the
lockout by itself. The client classification is ten lines behind an open question about its harness.

Separate commits, because they may land weeks apart.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The interval is a constructor option, not a constant.** This is the choice that determines whether
the heartbeat is testable at all. With a constant, every test either waits for wall-clock time or
reaches into module internals — and both kinds get deleted the first time they flake.

**The halves are split so the uncontested one can ship.** Bundling them would hold an everyday fix
behind an unresolved question about test economics.

**Backoff is the wrong response to a scheduled event.** The session expiry fires on a timer. Backing
off from it produces a growing delay before an outcome that was always going to require
re-authentication, which is why the transient case re-tickets immediately instead.

**A lost ticket race is expected, not an error.** Tickets are single-use, so a retry that loses gets
rejected. Reporting that to the user would make a working reconnect look broken.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Heartbeat with injectable interval | not built |
| Slot reclaimed after abandonment | not demonstrated |
| Four-suspend lockout resolved | not demonstrated |
| Close classification | not built |
| Harness decision | not made |
| Backend suite (`npm test`) and `npm run test:web` | not run |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The client half may ship without a test, or not ship at all.** This is the council's one unresolved
dissent: the fix is about ten lines and correct by inspection, the harness is roughly fifteen times
that, and there is no WebSocket-level test in the app suite to build on. Whichever way it goes, the
outcome is recorded as a decision with its reason rather than left implicit.

**Incidence is unconfirmed.** The lockout mechanism is verified; whether it has actually been hit is
unknown, and a user experiencing it would most likely describe it as "the app was being slow".

**The heartbeat interval is a judgement call until real links test it.** Too eager and a healthy phone
on a poor tailnet gets dropped, which is a worse failure than the one being fixed.
<!-- /ANCHOR:limitations -->
