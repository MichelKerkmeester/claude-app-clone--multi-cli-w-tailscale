---
title: "Child 016/002 — Route authority and rate-limit honesty"
description: "Make the foreground invariant universal across mutation-exercising routes, send the retry hint the client already parses, and give foreground one meaning computed in one place."
trigger_phrases:
  - "foreground gate approval decide route"
  - "retry after header 429 relay"
  - "foreground naming push asserted"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from the route-table audit."
    next_safe_action: "Build the route-level test harness that does not exist yet."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/002 — Route authority and rate-limit honesty

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../001-projection-integrity/spec.md |
| **Successor** | ../003-connection-lifecycle/spec.md |
| **Level** | 2 |
| **Layer** | relay — one pass through the route table |
| **Writer** | executor (`app-relay/src/http/**`) + Claude (verification, git) |
| **Barrier** | uniform gating, header at every rate-limited site, backend suite green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Twelve routes prove foreground before acting. Three do not, and one of those proves it only sometimes.

The approval-decide and accept-edits routes exercise mutation authority without the check their twelve
siblings apply. The prompt-submit route applies it **conditionally on the request carrying an
attachment** — so a plain steering prompt from a background device is accepted, while the same prompt
carrying an image is refused. That is the invariant holding for the wrong reason.

**This is consistency work, and it should be sold as consistency rather than as security.** The
approval surface is already principal-scoped and revocation-aware independently of any foreground
gate: listing filters by principal, deciding rejects a principal mismatch, and a revoked principal
throws. The caller this would newly block already holds an enrolled device key on the tailnet — the
user's own phone. What it buys is that the next reader can assume the invariant is universal, which
today they cannot without auditing twenty-two routes.

Separately, nine sites answer a rate-limited request with a bare status and no retry hint — while the
client has a parser for that hint, a clamp on it, and a consumer acting on it, all shipped. One
server path already sends it. The other nine simply tell the client nothing, and it falls back to a
guess.

And "foreground" means two things under three names: a value the phone asserts, and a value the server
observes from live sockets. When they disagree, the damaging direction is that a device whose socket
dropped loses authority while push still suppresses its wake-up hint — it can neither act nor be told
to come back.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Foreground proof plus a rate limiter on the approval-decide and accept-edits routes, copying the
  pattern an adjacent route already uses.
- Make the prompt-submit gate unconditional rather than attachment-conditional.
- Send the retry hint on every rate-limited response, matching the one path that already does.
- Rename the push service's client-asserted foreground flag to say that it is asserted, and prefer the
  socket-derived set where push already receives it.
- Build the route-level test harness these routes have never had.

**Explicitly out of scope: the approval *listing* route.** Listing is a read. Gating it would start
refusing a phone whose socket has not yet re-opened — a behaviour regression bought for no invariant.
Also out: any change to the authority predicate itself, any new wire field, any client change.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every route that exercises mutation authority proves foreground first. An invariant
  that holds on twelve of fifteen routes is a convention, not an invariant.
- **REQ-002** — The prompt-submit gate does not depend on payload shape. Whether a prompt carries an
  image has nothing to do with whether the device may steer.
- **REQ-003** — Reads stay ungated. The listing route keeps working for a phone whose socket is still
  re-opening.
- **REQ-004** — Every rate-limited response carries the retry hint, so the client's shipped parser
  receives a value instead of nothing.
- **REQ-005** — The client-asserted foreground flag is named as asserted, and the observed value is
  preferred where both are available.
- **REQ-006** — These routes gain their first route-level tests, covering both the allowed and the
  refused path.
- **REQ-007** — No behaviour changes for a foreground device. The only newly refused caller is a
  background one, which is the point.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. A background device is refused by approval-decide, accept-edits and prompt-submit alike.
2. A foreground device is accepted by all three, unchanged.
3. The listing route still answers a background device.
4. A plain prompt and an attachment-carrying prompt are gated identically.
5. Every rate-limited site sends the retry hint, verified by grep over the response sites.
6. `npm test` exit 0 against the four real test directories.
7. `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The test harness is most of the cost.** No route-level test exists for these routes, so roughly
  three quarters of the work is harness glue merged from two existing suites. That is the honest
  effort shape and it should not be discovered halfway through.
- **Over-gating is the real hazard.** Gating the listing route would be an easy, plausible mistake that
  regresses a phone mid-reconnect. It is called out in scope precisely so it is not made.
- **A rate limiter is a new refusal path.** Its window needs a value that will not fire during normal
  approval bursts.
- Independent of the sibling children and of the client queue.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **What rate-limit window suits the approval routes?** The adjacent pattern's values were chosen for
   a different traffic shape. Recommendation: match the adjacent route initially and revisit if it
   ever fires, since a limiter that never fires costs nothing and one that fires wrongly is a bug.
<!-- /ANCHOR:questions -->
