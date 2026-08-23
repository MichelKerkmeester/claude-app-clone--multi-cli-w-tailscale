---
title: "Child 017 tasks — ask-question activation"
description: "Task ledger for tracing the producer path, constructing the service, connecting both ends and proving the round trip."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/017-ask-question-activation"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Trace the host event that should raise a question."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 017 tasks — ask-question activation

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

This packet is done when a question raised by the host reaches the phone and its answer reaches the
host — not when the routes stop returning unavailable.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Trace the host event that should raise a question and confirm its shape. Blocking: if
      no such event exists, the packet grows to include the host side, which is the operator's call
      rather than a mid-flight decision.
- [ ] **T1.2** Confirm the dependency list the service declares, and that the relay entry point
      already holds each one for its other services.
- [ ] **T1.3** Read the existing service tests to see which assumptions they encode. They have only
      ever run against a hand-constructed instance, so some may not survive real wiring.
- [ ] **T1.4** Capture the backend baseline against the four real test directories explicitly.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** Write the round-trip test: raise a question where the host raises them, assert it
      reaches the phone, submit an answer, assert it reaches the handoff. **Watch it fail.**
- [ ] **T2.2** Construct the service in the relay entry point, alongside the seven already there.
- [ ] **T2.3** Pass it to the HTTP layer so the three routes stop branching to unavailable.
- [ ] **T2.4** Connect the producer: the traced host event calls the presenter. This is the half most
      easily forgotten, because the service compiles perfectly without a caller and the routes will
      already have stopped erroring.
- [ ] **T2.5** Connect the consumer: a submitted answer reaches the declared handoff.
- [ ] **T2.6** Confirm eligibility is enforced by the relay rather than trusted from the client,
      consistent with every other mutation surface here.
- [ ] **T2.7** Report, do not absorb, any client change the round trip turns out to need. The phone
      side is complete and should stay untouched by this packet.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** The round-trip test fails on the pre-wiring commit and passes after — both observed.
- [ ] **T3.2** A grep confirms the service is constructed in the relay entry point.
- [ ] **T3.3** No route answers unavailable when the relay is healthy.
- [ ] **T3.4** The presenter has a real caller, verified by grep rather than by the routes working.
- [ ] **T3.5** `npm test` exit 0 against the four real directories; `npm run build` exit 0.
- [ ] **T3.6** No file under `app-mobile/src/` changed.
- [ ] **T3.7** `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

A question raised by the host reaches the phone, and the answer reaches the host.

Routes returning something other than unavailable is not completion. A feature that is visible but
never delivers a question is a worse outcome than the honest error it replaced, because it looks like
it should work.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the wiring gap and the requirements.
- `plan.md` — why tracing precedes wiring, and the two-ended nature of the path.
- `checklist.md` — barrier sign-off with evidence.
- `../016-relay-correctness/001-projection-integrity/spec.md` — land first so a wiring mistake is audible.
- `../003-feature-dirs/spec.md` — where the client side was correctly ported.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
