---
title: "Child 016/003 — Connection lifecycle"
description: "A server heartbeat with an injectable interval so a suspended phone stops locking itself out of its own relay, and a client that classifies a socket close by the recovery it implies rather than backing off from all of them."
trigger_phrases:
  - "websocket heartbeat relay terminate"
  - "close code classification reconnect"
  - "connection slot lockout device"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/003-connection-lifecycle"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped; carries the council's one unresolved dissent."
    next_safe_action: "Operator decides whether the client half ships with or without its harness."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/003 — Connection lifecycle

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../002-route-authority/spec.md |
| **Successor** | ../../017-ask-question-activation/spec.md |
| **Level** | 2 |
| **Layer** | relay and client — the client half lands before the naming packet |
| **Writer** | executor (`app-relay/src/**`, one client file) + Claude (verification, git) |
| **Barrier** | heartbeat reclaims a slot; close classification distinguishes three recoveries |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

A phone that suspends on a train can lock itself out of its own relay for up to fifteen minutes.

Each device may hold four connections. That set drains only on a clean close, an error, a revocation,
or the fifteen-minute session timer. A suspended phone leaves a socket the server still believes is
alive, so four suspends exhaust the allowance and the fifth connection is refused. There is no
liveness proof anywhere in the relay — no ping, no pong, no interval — outside one unrelated reaper.

The client half is the mirror image. Every socket close is treated identically: increment a retry
count and reconnect with backoff. But the closes mean different things. A revocation close is
permanent, and backing off from it means reconnecting forever behind a "connecting" indicator while
the user is never told to re-enroll. A session-expiry close is transient and fires on a **timer**, not
on a network event — which makes the fifteen-minute expiry the routine backgrounded-phone case, met
today with exponential backoff instead of re-authentication. For a phone-first single-user app that is
a daily papercut rather than an edge case.

Both halves are one design conversation: deciding the heartbeat interval and deciding the re-auth path
are the same decision about what "connected" means.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- A server heartbeat on the sync socket: periodic ping, terminate after one missed round.
- **The interval exposed as a constructor option**, which is the single choice that turns a day of
  flaky timing tests into about forty lines.
- Client close classification: permanent, transient, and ordinary, each with its own recovery.
- Surfacing re-enrollment when a close is permanent, instead of reconnecting silently forever.
- Respecting one-use tickets, so a rejected racing retry is treated as expected rather than as failure.

**Out of scope:** any change to the authority predicate; the route work in the sibling child; a
protocol change; a full WebSocket test harness, unless the operator decides to fund it — see the open
question.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Connection liveness is proven rather than assumed. A socket the peer has abandoned is
  reclaimed within roughly a minute, not fifteen.
- **REQ-002** — The heartbeat interval is injectable, so its tests do not depend on wall-clock timing.
- **REQ-003** — A permanent close stops the reconnect loop and tells the user what to do. Reconnecting
  forever behind a spinner is the worst available behaviour: it looks like progress.
- **REQ-004** — A session-expiry close re-authenticates immediately rather than backing off, because it
  fires on a timer and backoff is the wrong response to a scheduled event.
- **REQ-005** — Ordinary closes keep the existing bounded backoff, which is correct for them.
- **REQ-006** — A rejected racing retry against a one-use ticket is expected behaviour, not an error
  surfaced to the user.
- **REQ-007** — The heartbeat makes the sibling child's refusals mean a current device proof rather
  than a socket that was once opened.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. An abandoned socket is reclaimed and its connection slot freed, demonstrated with an injected
   short interval rather than by waiting.
2. Four suspends no longer exhaust a device's allowance.
3. A permanent close surfaces re-enrollment and stops retrying.
4. A session-expiry close re-authenticates without backoff.
5. An ordinary close still backs off as before.
6. `npm test` exit 0 against the four real test directories; `npm run test:web` exit 0.
7. `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The client half has no test harness to land in.** There is no WebSocket-level test in the app
  suite at all, so a controllable socket global, fake timers and a host component would be built from
  scratch — roughly fifteen times the size of the fix itself. This is the council's one unresolved
  dissent and it is an operator decision, not an engineering one.
- **A heartbeat that terminates too eagerly disconnects a healthy phone** on a slow tailnet. One
  missed round is the documented pattern; the interval is the thing to be conservative about.
- **The client half must land before the naming packet.** A content change ahead of the rename rides
  through as a plain move; the same change during a 148-file batch collides with it.
- Depends on the test-lane repair for anything it does test on the client side.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

Answered by the operator, and the answer reframed the problem.

**Was: ship the client close-code classification without a test, or build the harness?**

The operator asked why the credential expires so quickly at all. Investigating that changed the
shape of the fix: the fifteen-minute session life is not a login timeout. The device key lives in
browser storage and never expires, so re-authenticating is entirely silent — no rescan, no tap. The
expiry was never meant to be visible, and the spinner exists only because the client mistakes a
scheduled event for a dropped connection.

**Answered: do both halves.**

1. **Refresh before expiry**, at roughly four fifths of the session's life, so the expiry path is
   normally never reached and nothing is visible at all.
2. **Classify the close correctly** as the safety net for when early refresh cannot run — a sleeping
   phone, a lost network — so the recovery is immediate rather than backed off.

Raising the fifteen minutes was considered and rejected: it hides the defect and lengthens the window
in which a stolen session cookie stays useful. The window is deliberate and stays as it is.

<!-- /ANCHOR:questions -->
