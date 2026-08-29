---
title: "Child 017 plan — ask-question activation"
description: "Trace the producer path before wiring anything, then construct, connect and prove the round trip."
trigger_phrases:
  - "ask question activation plan approach"
  - "ask question activation packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/017-ask-question-activation"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; tracing sequenced before wiring."
    next_safe_action: "Trace the host event that should raise a question."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 017 plan — ask-question activation

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Trace first, wire second. The construction is a dozen lines; the producer path is the part nobody has
looked at, and it determines whether this packet is small or large.

Nothing is turned on until the round trip is proven, because a visible feature that never delivers a
question is worse than an honest unavailable response.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

One gate matters: a round trip that fails on today's code and passes after. Everything else — the
construction, the routes no longer answering unavailable — is visible in a grep and proves only that
the wiring exists, not that it carries anything.

The backend suite runs at each step against the four real test directories explicitly.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The relay has eight services. Seven are constructed in the entry point and handed to the HTTP layer.
The eighth is constructed only inside its own test file.

That single fact explains the whole failure. The routes are written defensively — they branch on
whether the service was supplied and answer unavailable when it was not — so the gap produces a clean,
plausible error rather than a crash. Nothing looks broken. The client asks, the relay politely says
the feature is unavailable, and both are behaving exactly as written.

The second half is subtler and easier to miss. The service exposes a presenter that creates and
publishes a question, and **nothing calls it**. Constructing the service and passing it to the routes
would make the read and answer endpoints functional while no question ever existed to read or answer.
The code would compile, the routes would stop returning unavailable, and the feature would still not
work — which is precisely the failure mode this plan is ordered to avoid.

So the work has three parts in a fixed order: find the host event that should raise a question,
construct the service with the dependencies the entry point already holds, and connect both ends.
Everything the middle needs — demultiplexing, projection, redaction, replay, storage, auth policy —
already exists and already knows about this feature.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Trace the producer

Find the host event that should raise a question and confirm its shape. If none exists, stop and
report — the packet's size changes materially and that is the operator's call, not a mid-flight
decision.

### Phase 2: Write the failing round trip

A test that raises a question from the host side and asserts it reaches the phone, plus an answer that
reaches the handoff. It must fail today.

### Phase 3: Construct and hand over

Instantiate the service in the entry point with the dependencies already available there, and pass it
to the HTTP layer.

### Phase 4: Connect both ends

Producer into the presenter, answer into the handoff. The round trip turns green.

### Phase 5: Confirm eligibility is server-side

The answer path must enforce who may answer rather than trusting the client, consistent with every
other mutation surface in this relay.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The service already has unit tests, and they pass — against an instance the test constructs itself.
That is exactly the coverage shape that let this gap survive, so no additional unit test is the answer
here.

What is missing is an integration assertion: a question raised where the host raises them, arriving
where the phone reads them. That test is the packet's deliverable as much as the wiring is, because it
is the only thing that would catch this regressing.

Watch it fail first. A round-trip test that passes before the wiring exists is testing its own
fixtures.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Independent of the naming, comment and documentation queue.
- Benefits from the projection-integrity child landing first, so a wiring mistake is audible instead of
  swallowed.
- No client dependency — the phone side is complete.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Reverting the construction restores today's behaviour exactly: the routes return to answering
unavailable and the client shows what it shows now. No state is created that would outlive a revert.

The one caveat is that questions raised and stored while the feature was live remain in the store
after a revert. They are inert — nothing reads them once the service is gone — but they exist, so a
revert should note it rather than assume a clean slate.
<!-- /ANCHOR:rollback -->
