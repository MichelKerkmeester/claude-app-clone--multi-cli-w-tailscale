---
title: "Child 016/002 plan — route authority and rate-limit honesty"
description: "One pass through the route table, the harness that has to be built first, and why the listing route is deliberately left alone."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "route authority plan approach"
  - "route authority packet"
  - "plan approach"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; harness-first ordering."
    next_safe_action: "Build the route-level harness, then gate one route."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/002 plan — route authority and rate-limit honesty

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Build the route-level harness that does not exist, then make one pass through the route table applying
three small changes: gate the mutation routes, unconditionalise the prompt gate, and add the retry
header everywhere it is missing.

Bundling them is deliberate. They live in one large file and share one harness, so splitting them
means reading the same route table three times.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Two assertions per gated route: a background device is refused, a foreground device is unchanged. The
second matters more — the risk here is not failing to block, it is blocking someone who should pass.

One negative assertion for the listing route: a background device still gets its list. That check
exists to stop a future well-meaning pass from "finishing the job".

For the header, a grep over the rate-limited response sites is sufficient and honest.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The authority predicate already exists and is correct. This child does not touch it; it changes which
routes call it.

The distinction that decides each route is whether the request *exercises* authority or merely
*observes* state. Deciding an approval and accepting edits exercise it. Listing approvals observes.
That line, not the sensitivity of the data, is what determines gating — and it is the line the
existing twelve routes already draw.

The prompt-submit route is the interesting case, because it demonstrates how an invariant erodes: the
gate is present but bound to whether the payload carries an attachment. Someone reasoned about
attachment risk rather than about authority, and the result reads as gated while admitting exactly the
request the gate exists to refuse.

For naming: one value is asserted by the phone, another is observed from live sockets. The observed
one is the authority. The asserted one is a hint used by push. Naming the asserted one for what it is
costs a rename and removes a class of reasoning error where a reader assumes both are the same fact.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Harness

Build the route-level test harness by merging the glue from the two existing suites that already stand
up a server. This is roughly three quarters of the child's total effort and it comes first, because
every subsequent change is verified through it.

### Phase 2: Gate the mutation routes

Foreground proof plus a rate limiter on approval-decide and accept-edits, copying the adjacent
pattern. Assert both directions on each.

### Phase 3: Unconditionalise the prompt gate

Remove the payload-shape condition so a plain prompt and an attachment-carrying prompt are gated
identically.

### Phase 4: Retry header

Add the hint at every rate-limited response site, matching the one path that already sends it.

### Phase 5: Name the asserted flag

Rename the push service's client-asserted foreground flag and prefer the socket-derived set where push
already receives it.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The harness is the deliverable that outlasts this child. It should stand up a server, mint a session
for a device in a chosen foreground state, and issue a request — nothing more, because a harness that
knows about approvals specifically will not be reused by the next route.

Each gated route gets the allowed and the refused path. The listing route gets a permanent assertion
that it stays open, which is the cheapest possible guard against a future over-correction.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Independent of the sibling relay children; different files.
- Independent of the client queue — no client change here.
- The connection-lifecycle child makes this child's refusals mean more, but neither blocks the other.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-phase commits, each independently revertable. Nothing migrates and no state changes shape.

The one change worth watching after deploy is the rate limiter, since it is a new refusal path: if it
fires during normal approval bursts, revert that phase alone and widen the window before re-landing.
<!-- /ANCHOR:rollback -->
