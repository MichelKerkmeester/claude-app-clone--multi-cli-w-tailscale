---
title: "Child 016 — Relay correctness"
description: "Phase parent for the relay-side defects the cross-repo council surfaced: a silent projection data loss, an epoch that never rotates on host restart, three routes that skip the foreground invariant, a rate-limit header the client already parses, and a socket with no liveness proof."
trigger_phrases:
  - "relay correctness projection epoch"
  - "foreground invariant route gap"
  - "relay heartbeat close codes"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Phase parent created with three children scoped."
    next_safe_action: "Start child 001; its first task is the verified silent data loss."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 016 — Relay correctness

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../015-test-lanes/spec.md |
| **Successor** | ../017-ask-question-activation/spec.md |
| **Level** | phase parent |
| **Layer** | relay — runs in parallel with the client queue |
| **Phase score** | 40/50 — architectural, files > 15, LOC > 800, three risk flags |
| **Barrier** | all three children green; backend suite green throughout |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The relay is the strongest part of this system. It registers a subscriber before building a snapshot
plan and queues live envelopes until the flush completes, which designs out the reconnect loss window
that a sibling product was proven to have. It refuses to persist a non-contiguous append at all.

That strength is why the defects here are worth fixing precisely: they are narrow, and each one hides
inside a system that is otherwise correct.

One is live and silent. A projection sequence counter is cached locally while the store drops
control-plane projections without consuming a sequence, so the next block in the same batch throws —
and the throw is caught by the framing layer, relabelled as a parse failure, and handed to an error
listener that is never registered. The user sees a block referenced in the transcript and never
rendered, with no error anywhere.

The rest are consistency and liveness: an epoch that rotates for the command catalog but not for the
transcript, twelve routes honouring a foreground invariant while three do not, a rate-limit header the
client is already built to parse and never receives, and a socket with no proof its peer is alive.

**This packet excludes `app-mobile/src/` almost entirely**, so it runs today, in parallel with the
naming and comment queue, and is unaffected by their blocked state.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope**, distributed across three children:

- **Projection integrity** — make the swallowed error audible, allocate sequences from the store, and
  rotate the stream epoch on host restart with the garbage collection that rotation obliges.
- **Route authority** — prove foreground on the routes that exercise mutation authority, send
  `Retry-After` on every rate-limited response, and give "foreground" one meaning computed in one
  place.
- **Connection lifecycle** — a server heartbeat with an injectable interval, and a client that
  classifies a socket close by the recovery it implies.

**Out of scope:** the ask-question wiring, which is its own packet; any token, a11y or routing change;
the E2EE layer stack, since no relay carrier is in scope; a relay-side risk classifier, which the
council ruled out on the grounds that a wrong risk label is worse than none.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — No error path is unobservable. An error the code deliberately raises must reach
  somewhere a human or a test can read it.
- **REQ-002** — A sequence is allocated by the component that owns the sequence. No caller keeps its
  own copy of a counter another component may decline to advance.
- **REQ-003** — A host generation change is visible in the transcript stream, as it already is in the
  command catalog, todos and attachments.
- **REQ-004** — Every route that exercises mutation authority proves foreground first. The invariant is
  either universal or it is not an invariant.
- **REQ-005** — Every rate-limited response carries the retry hint its client is already built to read.
- **REQ-006** — Connection liveness is proven, not assumed, and the proof interval is injectable so its
  tests are not timing-flaky.
- **REQ-007** — The backend suite stays green throughout, run against the four real test directories
  explicitly rather than through the bare positional that sweeps a protected research repo.
- **REQ-008** — No child ships a fix without a check that fails before it and passes after.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All three children pass `validate.sh --strict` through the script's realpath.
2. `npm run build` and `npm test` exit 0 at each child's barrier.
3. The projection defect has a regression test that fails against today's code.
4. Foreground gating is uniform across every mutation-exercising route.
5. Every 429 site carries the retry header.
6. The heartbeat's interval is injectable, and its test does not depend on wall-clock timing.
7. The client's close handling distinguishes permanent from transient from ordinary.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Epoch rotation is delicate.** The store throws on a reused epoch and demands a first sequence of
  one. Getting it wrong lands in exactly the swallowed-throw path child 001 fixes first — which is why
  it is sequenced first rather than bundled.
- **Rotation without collection makes storage worse.** There is no cross-epoch garbage collection
  anywhere in the relay, so rotating per host restart multiplies orphaned partitions. The two ship
  together or neither ships.
- **One client file is touched** by the connection-lifecycle child, so that half lands before the
  naming packet rather than during it.
- Independent of 012, 013 and 014. Gated only by the test-lane repair for its client half.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:phase-map -->
## 7. PHASE DOCUMENTATION MAP

| Child | Level | Carries | Runs |
|---|---|---|---|
| `001-projection-integrity` | 3 | Audible errors, store-allocated sequences, epoch rotation, cross-epoch GC, unbounded-map bounds | First — the rest can land in its swallowed-throw path |
| `002-route-authority` | 2 | Foreground gating on mutation routes, `Retry-After` everywhere, one meaning for foreground | Parallel with 001 — different file, one route-table pass |
| `003-connection-lifecycle` | 2 | Server heartbeat with injectable interval, client close-code classification | Client half before 012; server half any time |

Heavy documentation lives in the children. This parent documents root purpose only.
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:questions -->
## 8. OPEN QUESTIONS

1. **Is the epoch rotation worth its retention obligation?** The mechanism is confirmed; the incidence
   of a mid-session host restart is not. One council lens would defer the whole item until one is
   actually observed. Recommendation: ship it, because the failure it prevents — a fresh process with
   no context appending silently to the previous conversation — is undetectable after the fact.
2. **Is `retentionEvents = 1000` still the right window?** A phone offline through a long session
   exceeds it and takes a full resync. Nothing is wrong; the number was simply never revisited.
<!-- /ANCHOR:questions -->
