---
title: "Child 016/003 checklist — connection lifecycle"
description: "Barrier sign-off for the heartbeat and close classification. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T21:28:21Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Every checklist item signed with evidence; the child is complete."
    next_safe_action: "None — the child is complete."
    blockers: []
    completion_pct: 100
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

- [x] **CHK-PRE-01** [P0] Confirmed no liveness mechanism exists today. [evidence: the only pre-existing timer on a sync socket was the per-connection expiry timer; nothing pinged, and `server.ts` now adds the first]
- [x] **CHK-PRE-02** [P0] The drains on the per-device connection set are enumerated. [evidence: `activeSockets` is drained only by a clean close, an error, a revocation or the per-socket expiry timer, and `countDeviceSockets` reads it for the allowance; a suspended phone triggers none of them]
- [x] **CHK-PRE-03** [P0] The harness decision is recorded before the client half starts. [evidence: the operator answered both — the close classification and the proactive refresh; the harness is a fake socket with an `emit` hook plus fake timers in `sync-close-classification.svelte.test.ts`]
- [x] **CHK-PRE-04** [P1] The naming packet has not started. [evidence: `rename-manifest.json` had already been applied, so the client files carry their final kebab-case names and no rename follows this change]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] The heartbeat interval is a constructor option. [evidence: `syncHeartbeatIntervalMs` in `ReadOnlyServerOptions`, defaulting to `DEFAULT_SYNC_HEARTBEAT_INTERVAL_MS`, with the reason written at the field]
- [x] **CHK-CQ-02** [P1] One missed round terminates. [evidence: the sweep terminates any socket whose `isAlive` was not set by a pong since the previous round, then clears the flag and pings again]
- [x] **CHK-CQ-03** [P1] Close classification is explicit, not a chain of conditions. [evidence: three named recoveries in `use-sync-socket.svelte.ts` — `stopForRevocation()`, `connect('expired')` and the existing bounded backoff — each keyed on one code]
- [x] **CHK-CQ-04** [P1] A rejected racing retry is not surfaced as an error. [evidence: a pre-emptive attempt that loses the `requestTicket()` single-use race while a socket is still open retries quietly instead of reporting a failure]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] A reclaimed slot is demonstrated with an injected short interval. [evidence: `sync-liveness.test.ts` injects a 25ms and a 100ms interval; the whole file runs in under a second]
- [x] **CHK-TEST-02** [P0] Four abandoned connections no longer exhaust the allowance. [evidence: four silent sockets for one device, the fifth refused with `429 Too Many Requests` before the sweep and accepted after it]
- [x] **CHK-TEST-03** [P0] Three close codes assert three distinct behaviours. [evidence: `sync-close-classification.svelte.test.ts` — 4003 leaves the connection unenrolled and opens no further socket past the backoff ceiling, 4001 reconnects with no delay and no backoff growth, 1006 waits the full 2s]
- [x] **CHK-TEST-04** [P1] A healthy phone on a slow link is not dropped. [evidence: `keeps a socket whose peer still answers` passes, and the shipped interval is 30s, so a phone has a full sweep to answer]
- [x] **CHK-TEST-05** [P0] `npm test` and `npm run test:web` exit 0. [evidence: `npm test` 55 files / 401 tests RC 0; `npm run test:web` verified by content — 67 files / 539 passed / 3 skipped and 16 files / 188 passed — not by a piped exit status]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] A permanent close stops retrying and surfaces re-enrollment. [evidence: 4003 clears both timers, stops the loop and dispatches `unenrolled`]
- [x] **CHK-FIX-02** [P0] A session-expiry close re-authenticates rather than backing off. [evidence: 4001 calls `connect('expired')` immediately and does not increment the retry counter; `openSyncSocket` re-establishes the session on every connect]
- [x] **CHK-FIX-03** [P1] Ordinary closes keep bounded backoff. [evidence: the 1006 case in `sync-close-classification.svelte.test.ts` asserts the delay at exactly 2s so a later change cannot flatten it silently]
- [x] **CHK-FIX-04** [P1] If the client half is deferred, the gap is recorded with its reason. [evidence: not deferred — the operator funded the harness, and both `use-sync-socket.svelte.ts` and its test suite shipped, so there is no gap to record]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] The heartbeat makes foreground refusals mean a current device proof. [evidence: the lockout test asserts `foregroundDeviceIds` drains to empty once the silent sockets are reclaimed, so a refusal reflects a live socket rather than one that was merely opened once]
- [x] **CHK-SEC-02** [P1] Re-enrollment copy does not disclose why a credential was revoked. [evidence: the `unenrolled` phase carries `Device enrollment required.` and states no cause]
- [x] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [evidence: no commit in this child names a path under `specs/context`; the five research repositories remain untracked and unmodified, and the root test config now excludes them from discovery]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The reason the interval is injectable is written at the constructor. [evidence: `Keep liveness timing injectable so heartbeat checks stay deterministic.` sits at the `syncHeartbeatIntervalMs` field, durable WHY with no artifact pointer]
- [x] **CHK-DOC-02** [P2] Each close code's recovery is named in the code. [evidence: `use-sync-socket.svelte.ts` states at each comparison that 4003 is a revocation retrying cannot restore, and that 4001 is the relay's session timer where backoff only delays the inevitable refresh]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Server and client halves are separate commits. [evidence: the server heartbeat landed in `b8cab41`, the client classification and refresh in `d6dda30`, the lockout reproduction in `bb9fda6`]
- [x] **CHK-ORG-02** [P2] Any new client harness is placed where the next connection test will use it. [evidence: the fake socket and fake-timer harness lives in `app-mobile/tests/sync-close-classification.svelte.test.ts` beside the other client suites]
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
