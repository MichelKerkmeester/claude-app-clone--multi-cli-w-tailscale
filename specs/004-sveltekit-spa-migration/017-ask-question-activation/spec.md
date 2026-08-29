---
title: "Child 017 — Ask-question activation"
description: "Wire the one relay service that was never constructed. The client ships the whole feature and every route answers 503, because the service is instantiated only inside its own test and nothing ever calls its presenter."
trigger_phrases:
  - "ask question service unwired relay"
  - "503 ask_question_unavailable"
  - "present question producer path"
importance_tier: "critical"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/017-ask-question-activation"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped after the operator confirmed every feature is meant to be live."
    next_safe_action: "Trace the host-event shape that should reach the presenter."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 017 — Ask-question activation

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../016-relay-correctness/spec.md |
| **Successor** | ../018-transcript-affordances/spec.md |
| **Level** | 2 |
| **Layer** | relay — independent of the client rename queue |
| **Writer** | executor (`app-relay/src/**`) + Claude (verification, git) |
| **Barrier** | a question raised by the host reaches the phone and its answer reaches the host |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The ask-question feature is fully built on the phone and completely dark on the relay.

`app-relay/src/ask-question/ask-question-service.ts` is the only service in the relay that
`app-relay/src/index.ts` never imports — the other seven are all constructed and wired. Its three HTTP
routes therefore branch on an undefined option and answer `503 ask_question_unavailable` every time.
Its presenter method has no caller anywhere outside the service file itself, so even if the service
were constructed, nothing would ever ask it to present a question.

Meanwhile the client ships the entire experience: a card component with six sub-components, seven
stories, a test, and roughly fifteen protocol types.

**This is not a migration regression.** The client was ported correctly during the feature-directory
work; the relay wiring never existed at any point. The operator has confirmed every feature is meant
to be live, which turns this from an open question into scope.

The supporting plumbing is already in place — the demultiplexer, the transcript projector, redaction,
replay, the supervisor, the store and the auth policy all know about ask-question. What is missing is
the construction and the two ends of the path: host event in, answer out.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Construct the service in the relay entry point with the dependencies it declares — the store, the
  sync hub, the stream identity, the answer handoff and the eligibility predicate — all of which the
  entry point already holds for other services.
- Pass it to the HTTP layer so the three routes stop branching to unavailable.
- Connect the producer path: a host event that raises a question reaches the presenter.
- Connect the consumer path: an answer submitted from the phone reaches the host.
- Cover the round trip with a test that fails today.

**Out of scope:** any client change — the phone side is complete; any protocol change; any change to
the service's internal logic, which is already tested; the relay defects covered by the sibling
packet.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The service is constructed in the relay entry point, alongside the seven that already
  are. A service that exists only inside its own test is indistinguishable from one that does not
  exist.
- **REQ-002** — The three routes serve real responses. `503` is reserved for a genuine runtime
  condition, not for a wiring gap.
- **REQ-003** — A question raised by the host reaches the phone. The presenter needs a caller, which is
  the half most likely to be forgotten because the service compiles perfectly without one.
- **REQ-004** — An answer submitted from the phone reaches the host through the declared handoff.
- **REQ-005** — The round trip has a test that fails against today's code before it passes.
- **REQ-006** — Eligibility is enforced by the relay rather than assumed from the client, consistent
  with how every other mutation surface here works.
- **REQ-007** — No client file changes. If the round trip needs a client change to work, that is a
  finding to report, not to absorb.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. A grep for the service's construction in the relay entry point returns a hit.
2. None of the three routes answers unavailable when the relay is healthy.
3. A host-raised question appears on the phone, demonstrated end to end in a test.
4. An answer submitted from the phone reaches the host handoff.
5. The round-trip test fails on the pre-wiring commit — observed, not assumed.
6. `npm test` exit 0 against the four real test directories; `npm run build` exit 0.
7. `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The producer path is the unknown.** Constructing the service is mechanical; finding the host event
  that should raise a question, and confirming its shape, is genuine tracing work of unsure size.
- **Turning on a dark feature is a behaviour change.** Every other packet in this program is
  behaviour-preserving. This one deliberately is not, and it should be reviewed as a feature landing
  rather than as a fix.
- **The existing service tests may encode assumptions** the real wiring violates, since they have only
  ever run against a hand-constructed instance.
- Independent of the naming and comment queue. Benefits from the sibling packet's error listener
  landing first, so a wiring mistake is audible rather than silent.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **What raises a question?** The host event that should reach the presenter has not been traced yet.
   If no such event exists, this packet grows to include the host side, and that is a materially larger
   scope worth knowing before starting rather than discovering midway.
2. **Should the feature be visible before the round trip is proven?** Recommendation: no. Shipping the
   routes without the producer path would replace a clean `503` with a card that never arrives, which
   is a worse failure because it looks like it should work.
<!-- /ANCHOR:questions -->
