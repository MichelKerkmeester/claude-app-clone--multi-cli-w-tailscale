---
title: "Child 016/003 plan — connection lifecycle"
description: "Why the heartbeat interval is a constructor option, what each close code means for recovery, and the harness decision that gates the client half."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T21:28:21Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Both halves executed as planned; the client half followed the operator decision."
    next_safe_action: "None — the child is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/003 plan — connection lifecycle

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Land the server heartbeat first — it needs no decision from anyone and it fixes the lockout on its
own. Then take the client half, which is ten lines of classification sitting behind an open question
about whether to fund its test harness.

Splitting them this way means the everyday failure is fixed while the harness question is still being
answered.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The heartbeat's gate is a reclaimed slot, demonstrated with an injected short interval. A test that
waits thirty seconds is a test nobody runs, which is exactly why the interval is a constructor option
rather than a constant.

The client's gate is three distinct behaviours from three close codes, each asserted separately.
Asserting only that "reconnect happens" would pass on today's code, which reconnects for everything.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

A connection allowance without a liveness proof is a resource leak with a timer on it. The relay caps
connections per device and drains that set on close, error, revocation or session expiry — every one
of which requires either the peer or the clock to cooperate. A suspended phone cooperates with
neither, so its socket occupies a slot until the session timer fires. Four suspends, and the device is
refused by its own relay.

A heartbeat closes that loop by making the server the party that decides whether a peer is alive. One
missed round is enough; the point is not to measure latency but to notice absence.

**Making the interval a constructor option is the load-bearing design choice in this child.** With a
constant, every test either waits for real time or reaches into module internals, and both produce the
flaky timing tests that get deleted six months later. With an option, the test injects milliseconds
and the assertion is deterministic.

On the client, the three close codes describe three different worlds. A revocation means the
credential is gone and no amount of retrying will help — the correct response is to stop and tell the
user to re-enroll. A session expiry means the ticket aged out on a schedule; the correct response is
to get a new one immediately, since backing off from a scheduled event just delays the inevitable by a
growing interval. Everything else is an ordinary network drop where bounded backoff is right.

One detail worth respecting: tickets are single-use, so a retry that races another and loses gets
rejected. That is expected, not a failure, and surfacing it as one would make a working reconnect look
broken.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Server heartbeat

Periodic ping with one-miss termination, interval injected through the constructor. Test with a short
injected interval and assert the connection slot is freed.

### Phase 2: Prove the lockout is gone

Simulate four abandoned connections and confirm the fifth is accepted once the heartbeat has reclaimed
them.

### Phase 3: Harness decision

The operator decides whether to fund the client-side WebSocket harness. Everything after this point
depends on that answer, which is why it is a phase rather than a footnote.

### Phase 4: Client close classification

Three codes, three recoveries. Permanent stops and surfaces re-enrollment; transient re-authenticates
immediately; ordinary keeps bounded backoff.

### Phase 5: Racing-ticket tolerance

Treat a rejected retry against a one-use ticket as expected, so a working reconnect does not report an
error.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The server half is straightforward once the interval is injectable, and that is the whole argument for
injecting it.

The client half is the expensive one, and honestly so: there is no WebSocket-level test in the app
suite, so the harness is built from nothing — a controllable socket global, fake timers, a host
component. It comes to roughly fifteen times the size of the fix.

The argument for paying it anyway is that it is not really this child's harness. The next several
client-side connection defects need the same thing, and the second test written against it costs
almost nothing. The argument against is that this fix is ten lines and demonstrably correct by
inspection. Both are recorded rather than resolved here.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The server half depends on nothing and can land immediately.
- The client half should land before the naming packet, so its content change rides the scripted
  rename through as a plain move.
- Any client test depends on the test-lane repair landing first.
- The sibling route child benefits from this one but neither blocks the other.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-phase commits. The heartbeat reverts to today's behaviour with no residue — no state, no schema,
no protocol change.

The client classification is equally reversible, but it changes what the user is told, so a revert
should be paired with checking that the reconnect indicator returns to its previous copy rather than
being left in a half-migrated state.
<!-- /ANCHOR:rollback -->
