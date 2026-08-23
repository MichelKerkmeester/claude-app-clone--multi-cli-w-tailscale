---
title: "Child 016/003 checklist — connection lifecycle"
description: "Barrier sign-off for the heartbeat and close classification. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Land the server heartbeat; it needs no decision."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 016/003 — Connection lifecycle

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Timing behaviour is only testable if the timing is injectable, so the protocol depends on one design
choice landing first. Everything downstream of a constructor-injected interval is deterministic;
everything downstream of a constant is a test that waits or a test that cheats.

For the client, each close code is asserted separately. An assertion that "a reconnect happened" would
pass against today's code, which reconnects for every close indiscriminately.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Confirmed no liveness mechanism exists today. [deferred: pending execution — no ping, pong or interval in the relay outside one unrelated reaper]
- [ ] **CHK-PRE-02** [P0] The drains on the per-device connection set are enumerated. [deferred: pending execution — clean close, error, revocation, session timer; all need the peer or the clock]
- [ ] **CHK-PRE-03** [P0] The harness decision is recorded before the client half starts. [deferred: pending operator — the fix is ~10 lines, the harness roughly 15× that]
- [ ] **CHK-PRE-04** [P1] The naming packet has not started. [deferred: pending execution — the client change should ride the scripted rename as a plain move]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] The heartbeat interval is a constructor option. [deferred: pending execution — the load-bearing choice; a constant makes every test wait or cheat]
- [ ] **CHK-CQ-02** [P1] One missed round terminates. [deferred: pending execution — the goal is noticing absence, not measuring latency]
- [ ] **CHK-CQ-03** [P1] Close classification is explicit, not a chain of conditions. [deferred: pending execution — three codes, three named recoveries the next reader can follow]
- [ ] **CHK-CQ-04** [P1] A rejected racing retry is not surfaced as an error. [deferred: pending execution — tickets are single-use, so losing a race is expected behaviour]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] A reclaimed slot is demonstrated with an injected short interval. [deferred: pending execution — a test that waits 30 seconds is a test nobody runs]
- [ ] **CHK-TEST-02** [P0] Four abandoned connections no longer exhaust the allowance. [deferred: pending execution — the everyday failure this child exists to fix]
- [ ] **CHK-TEST-03** [P0] Three close codes assert three distinct behaviours. [deferred: pending execution — asserting only that a reconnect happens passes on today's code]
- [ ] **CHK-TEST-04** [P1] A healthy phone on a slow link is not dropped. [deferred: pending execution — the interval must be conservative; dropping a good connection is worse than a late reclaim]
- [ ] **CHK-TEST-05** [P0] `npm test` and `npm run test:web` exit 0. [deferred: pending execution — verify web by content, not by a piped exit status]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] A permanent close stops retrying and surfaces re-enrollment. [deferred: pending execution — reconnecting forever behind a spinner is the worst option because it looks like progress]
- [ ] **CHK-FIX-02** [P0] A session-expiry close re-authenticates rather than backing off. [deferred: pending execution — it fires on a timer, so backoff delays the inevitable by a growing interval]
- [ ] **CHK-FIX-03** [P1] Ordinary closes keep bounded backoff. [deferred: pending execution — correct behaviour that must survive the change]
- [ ] **CHK-FIX-04** [P1] If the client half is deferred, the gap is recorded with its reason. [deferred: pending operator — a deferral with a reason is a decision; one without is an oversight]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] The heartbeat makes foreground refusals mean a current device proof. [deferred: pending execution — rather than a socket that was once opened]
- [ ] **CHK-SEC-02** [P1] Re-enrollment copy does not disclose why a credential was revoked. [deferred: pending execution — the user needs the action, not the reason]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] The reason the interval is injectable is written at the constructor. [deferred: pending execution — durable WHY only; comment hygiene is a hard block]
- [ ] **CHK-DOC-02** [P2] Each close code's recovery is named in the code. [deferred: pending execution — a bare numeric comparison teaches the next reader nothing]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Server and client halves are separate commits. [deferred: pending execution — they have different blockers and may land weeks apart]
- [ ] **CHK-ORG-02** [P2] Any new client harness is placed where the next connection test will use it. [deferred: pending execution — its whole justification is reuse]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

This child carries the council's one unresolved dissent. The server half is uncontested and fixes an
everyday failure on its own; the client half is ten obviously-correct lines behind a harness that
costs fifteen times as much. Splitting them is what lets the uncontested half ship while the question
is still open.
<!-- /ANCHOR:summary -->
