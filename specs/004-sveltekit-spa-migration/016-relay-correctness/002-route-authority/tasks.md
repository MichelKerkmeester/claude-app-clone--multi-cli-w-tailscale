---
title: "Child 016/002 tasks — route authority and rate-limit honesty"
description: "Task ledger for the route-level harness, the mutation-route gates, the unconditional prompt gate, the retry header and the foreground rename."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Build the harness before touching a route."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/002 tasks — route authority and rate-limit honesty

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

A gated route is done when both directions are asserted: the background device refused, the foreground
device unchanged.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Inventory every route and mark whether it exercises mutation authority or observes
      state. That distinction, not data sensitivity, decides gating.
- [x] **T1.2** Confirm the twelve already-gated routes to establish the pattern being matched.
- [x] **T1.3** Build the route-level test harness by merging glue from the two suites that already
      stand up a server. Roughly three quarters of this child's effort lives here.
- [x] **T1.4** Keep the harness route-agnostic — stand up a server, mint a session for a device in a
      chosen foreground state, issue a request. A harness that knows about approvals will not be
      reused by the next route.
- [x] **T1.5** Capture the backend baseline against the four real test directories explicitly.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Add foreground proof and a rate limiter to the approval-decide route, copying the
      adjacent route's pattern rather than inventing a second one.
- [x] **T2.2** Same for the accept-edits route.
- [x] **T2.3** Assert both directions on each: background refused, foreground unchanged.
- [x] **T2.4** Remove the payload-shape condition from the prompt-submit gate, so a plain prompt and an
      attachment-carrying prompt are gated identically.
- [x] **T2.5** Add a permanent assertion that the approval **listing** route still answers a background
      device. This is the guard against a future pass "finishing the job" and regressing a phone
      mid-reconnect.
- [x] **T2.6** Send the retry hint at every rate-limited response site, matching the one path that
      already does.
- [x] **T2.7** Verify by grep that no bare rate-limited response remains.
- [x] **T2.8** Rename the push service's client-asserted foreground flag to say it is asserted.
- [x] **T2.9** Prefer the socket-derived foreground set where push already receives it, leaving the
      authority predicate itself untouched.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Background device refused by all three mutation routes.
- [x] **T3.2** Foreground device accepted by all three, behaviour unchanged.
- [x] **T3.3** Listing route still answers a background device.
- [x] **T3.4** Plain and attachment-carrying prompts gated identically.
- [x] **T3.5** Every rate-limited site carries the hint.
- [x] **T3.6** `npm test` exit 0 against the four real directories; `npm run build` exit 0.
- [x] **T3.7** `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The foreground invariant is universal across mutation-exercising routes, reads stay open, and the
client's shipped retry parser receives a value instead of nothing.

The claim this child is allowed to make is consistency, not new security. The approval surface was
already principal-scoped and revocation-aware; what changes is that the next reader can assume the
invariant holds everywhere instead of auditing to find out.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the route audit and requirements.
- `plan.md` — the exercises-versus-observes distinction and harness-first ordering.
- `checklist.md` — barrier sign-off with evidence.
- `../spec.md` — the relay-correctness phase parent.
- `../003-connection-lifecycle/spec.md` — makes these refusals mean a current device proof.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
