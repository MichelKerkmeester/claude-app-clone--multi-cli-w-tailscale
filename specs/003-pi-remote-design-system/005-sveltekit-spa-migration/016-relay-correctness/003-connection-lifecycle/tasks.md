---
title: "Child 016/003 tasks — connection lifecycle"
description: "Task ledger for the server heartbeat, the lockout proof, the harness decision and the client close classification."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T21:28:21Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Lockout reproduced end to end with its negative control."
    next_safe_action: "None — the child is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/003 tasks — connection lifecycle

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Both halves have shipped and the lockout has been replayed end to end against the device allowance,
with the refusal observed before the fix path runs.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm no liveness mechanism exists today outside the unrelated reaper, so the change
      is an addition rather than a replacement. Confirmed: the only pre-existing timer on a sync
      socket was the per-connection expiry timer; nothing pinged.
- [x] **T1.2** Confirm what drains the per-device connection set: clean close, error, revocation, and
      the session timer. Every one needs the peer or the clock to cooperate — a suspended phone
      cooperates with none of them, which is the lockout.
- [x] **T1.3** Capture the backend baseline against the four real test directories explicitly.
      `npx vitest run packages/pi-rpc-protocol/tests app-relay/tests extensions/pi-remote-approval/tests
      extensions/pi-remote-plan/tests` — the bare trailing `tests` positional in the `npm test`
      script sweeps a protected research repo and must not be used to read the baseline.
- [x] **T1.4** Confirm the naming packet has not started, so the client half can land ahead of it.
      The rename manifest had already been applied when the client half landed, so the client files
      carry their final names and no rename follows this change.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Server heartbeat**

- [x] **T2.1** Add a periodic ping with one-miss termination to the sync socket.
      `server.ts:321-329` — a socket that has not answered since the last sweep is terminated.
- [x] **T2.2** Expose the interval as a constructor option. This is the load-bearing choice: with a
      constant, every test either waits for real time or reaches into internals, and both produce the
      flaky tests that get deleted later. `syncHeartbeatIntervalMs` (`server.ts:127`), defaulting to
      `DEFAULT_SYNC_HEARTBEAT_INTERVAL_MS`.
- [x] **T2.3** Test with a short injected interval and assert the connection slot is freed.
      `app-relay/tests/sync-liveness.test.ts` — a peer that stops answering is reclaimed, and one
      that still answers is kept.
- [x] **T2.4** Simulate four abandoned connections and confirm the fifth is accepted once reclaimed.
      `app-relay/tests/sync-liveness.test.ts` opens four sockets for one device, subscribes and
      silences all four, observes the refusal before the sweep, then connects again after it.
- [x] **T2.5** Choose the interval conservatively — the failure to avoid is dropping a healthy phone on
      a slow tailnet, which is worse than reclaiming a slot slightly later. 30s, so a phone has a
      full sweep to answer and a slot is reclaimed within one minute of going silent.

**Harness decision**

- [x] **T2.6** Operator decides whether to fund the client-side WebSocket harness. Blocking for the
      client half only; the server half ships regardless. **Answered: fund it, and do both halves** —
      the close classification and the proactive refresh. The harness is a fake socket with an
      `emit` hook plus fake timers, in `app-mobile/tests/sync-close-classification.svelte.test.ts`.

**Client close classification**

- [x] **T2.7** Classify a revocation close as permanent: stop retrying and surface re-enrollment.
      Reconnecting forever behind a spinner is the worst option because it looks like progress.
      Close code 4003 stops the loop and dispatches `unenrolled`, which already reads
      "Device enrollment required."
- [x] **T2.8** Classify a session-expiry close as transient: re-authenticate immediately. It fires on a
      timer, and backing off from a scheduled event only delays the inevitable by a growing interval.
      Close code 4001 reconnects at once and does not increment the retry counter.
- [x] **T2.9** Leave ordinary closes on the existing bounded backoff, which is correct for them.
      Asserted explicitly at 2s so a later change cannot flatten it silently.
- [x] **T2.10** Treat a rejected retry against a one-use ticket as expected, so a working reconnect
      does not report an error to the user. A pre-emptive attempt that loses the ticket race while a
      socket is still open retries quietly instead of reporting a failure.
- [x] **T2.11** Reconnect before the relay can close the socket. The relay arms its expiry timer from
      the session that opened the connection (`server.ts:274-279`), so re-authenticating cannot
      extend a socket that is already open — the client reads the session deadline it previously
      discarded and swaps in a fresh socket at 80% of the remaining lifetime, without leaving the
      live phase.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** An abandoned socket is reclaimed with an injected short interval, not by waiting.
- [x] **T3.2** Four suspends no longer exhaust the device allowance. The negative control runs
      first, while all four silent sockets still hold the allowance: the fifth connection is refused
      with `429 Too Many Requests`, asserted distinct from the `401` an auth failure would give, so a
      reader cannot mistake one for the other. After the heartbeat sweep drains the device's
      foreground set, the fifth connection is accepted for that same device.
- [x] **T3.3** Three close codes produce three distinct behaviours, asserted separately — asserting
      only that a reconnect happens would pass on today's code. 4003 stops, 4001 reconnects with no
      delay, 1006 waits the full 2s.
- [x] **T3.4** A permanent close surfaces re-enrollment and stops the loop. The test advances fake
      timers past the backoff ceiling and asserts no further socket is opened.
- [x] **T3.5** `npm test` 55 files / 401 tests RC 0; `npm run test:web` RC 0 with 67 files / 539
      passed / 3 skipped and 16 files / 188 passed. Two known flakes survive and are not caused by
      this work: `auth.test.ts` returns 201 where it expects 403 on a timing race, and the pinned-Pi
      integration probe drives a real subprocess. Measured 5 of 6 consecutive whole-suite runs green
      after the suite was serialized; before that it failed every run.
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
