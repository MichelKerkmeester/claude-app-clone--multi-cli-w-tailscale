---
title: "Child 016/003 tasks — connection lifecycle"
description: "Task ledger for the server heartbeat, the lockout proof, the harness decision and the client close classification."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Land the server heartbeat with an injectable interval."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/003 tasks — connection lifecycle

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

The server half is unblocked. The client half waits on one operator decision, tracked as its own task
rather than as a footnote.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Confirm no liveness mechanism exists today outside the unrelated reaper, so the change
      is an addition rather than a replacement.
- [ ] **T1.2** Confirm what drains the per-device connection set: clean close, error, revocation, and
      the session timer. Every one needs the peer or the clock to cooperate.
- [ ] **T1.3** Capture the backend baseline against the four real test directories explicitly.
- [ ] **T1.4** Confirm the naming packet has not started, so the client half can land ahead of it.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Server heartbeat**

- [ ] **T2.1** Add a periodic ping with one-miss termination to the sync socket.
- [ ] **T2.2** Expose the interval as a constructor option. This is the load-bearing choice: with a
      constant, every test either waits for real time or reaches into internals, and both produce the
      flaky tests that get deleted later.
- [ ] **T2.3** Test with a short injected interval and assert the connection slot is freed.
- [ ] **T2.4** Simulate four abandoned connections and confirm the fifth is accepted once reclaimed.
- [ ] **T2.5** Choose the interval conservatively — the failure to avoid is dropping a healthy phone on
      a slow tailnet, which is worse than reclaiming a slot slightly later.

**Harness decision**

- [ ] **T2.6** Operator decides whether to fund the client-side WebSocket harness. Blocking for the
      client half only; the server half ships regardless.

**Client close classification**

- [ ] **T2.7** Classify a revocation close as permanent: stop retrying and surface re-enrollment.
      Reconnecting forever behind a spinner is the worst option because it looks like progress.
- [ ] **T2.8** Classify a session-expiry close as transient: re-authenticate immediately. It fires on a
      timer, and backing off from a scheduled event only delays the inevitable by a growing interval.
- [ ] **T2.9** Leave ordinary closes on the existing bounded backoff, which is correct for them.
- [ ] **T2.10** Treat a rejected retry against a one-use ticket as expected, so a working reconnect
      does not report an error to the user.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** An abandoned socket is reclaimed with an injected short interval, not by waiting.
- [ ] **T3.2** Four suspends no longer exhaust the device allowance.
- [ ] **T3.3** Three close codes produce three distinct behaviours, asserted separately — asserting
      only that a reconnect happens would pass on today's code.
- [ ] **T3.4** A permanent close surfaces re-enrollment and stops the loop.
- [ ] **T3.5** `npm test` and `npm run test:web` exit 0.
- [ ] **T3.6** `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

A phone that suspends repeatedly can still reach its own relay, and a socket close tells the client
what kind of recovery to attempt.

The child may close with the client half explicitly deferred if the operator declines the harness. In
that case the deferral is recorded as a known gap with its reason, not left as an implied intention.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the lockout mechanism and the unresolved dissent.
- `plan.md` — why the interval is injectable and what each close code means.
- `checklist.md` — barrier sign-off with evidence.
- `../002-route-authority/spec.md` — this child makes those refusals mean a current device proof.
- `../../015-test-lanes/spec.md` — gates any client-side test here.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
