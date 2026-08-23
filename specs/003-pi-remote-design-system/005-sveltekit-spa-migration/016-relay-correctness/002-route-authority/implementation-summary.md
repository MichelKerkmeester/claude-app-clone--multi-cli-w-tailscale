---
title: "Child 016/002 implementation summary — route authority and rate-limit honesty"
description: "Continuity anchor. Nothing is implemented yet: this records the route audit, the effort shape, and the claim this child is allowed to make."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from a route-table audit; no code changed."
    next_safe_action: "Build the route-level harness."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/002 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `016-relay-correctness` |
| Level | 2 |
| Status | **Scoped, not started** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No route has been changed.

The audit that produced the scope:

| Finding | State |
|---|---|
| Routes in `app-relay/src/http/server.ts` proving foreground before acting | 12 |
| Mutation-exercising routes not proving it | 2 |
| Routes proving it conditionally on payload shape | 1 |
| Rate-limited response sites sending a retry hint | 1 |
| Sites sending no hint | 9 |
| Route-level tests covering the ungated routes | 0 |
| Names for "foreground" | 3, covering 2 distinct semantics |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Harness first, then one pass through the route table. Per-phase commits.

The executor writes the HTTP layer. Claude verifies both directions on every gated route and owns git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The line is exercises-versus-observes, not sensitive-versus-not.** Deciding an approval exercises
authority; listing approvals observes state. That is the line the twelve existing routes already draw,
and following it keeps this child from over-gating.

**The listing route is deliberately left open, with a permanent test saying so.** Gating it would
refuse a phone whose socket has not finished re-opening — a real regression bought for no invariant.
The test exists so a future well-meaning pass does not "finish the job".

**The claim is consistency, not security.** The approval surface is already principal-scoped and
revocation-aware, and the caller newly refused holds the user's own enrolled phone. Overselling this
as a security fix would be the kind of claim that erodes trust in the next one.

**Harness first, and it stays route-agnostic.** Three quarters of the effort is the harness, and its
value is that the next route's test costs almost nothing.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Route-level harness | not built |
| Mutation-route gates | not added |
| Prompt gate unconditionalised | not done |
| Retry hint at every site | not done |
| Foreground rename | not done |
| Backend suite (`npm test`, four real dirs) | baseline not captured |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**This child stops no attacker.** It makes an invariant uniform so the next reader can rely on it. The
security lens ranked it higher than that; the skeptic lens established it is hygiene. Both agreed it
should ship, and this document takes the weaker, more defensible claim.

**The rate limiter is a new refusal path** on a surface that previously had none. Its window is a
guess until real approval traffic tests it, and a limiter that fires wrongly is worse than no limiter.

**A rename cannot prevent the underlying confusion.** Two facts about "foreground" will still exist;
naming one of them honestly makes the confusion detectable, not impossible.
<!-- /ANCHOR:limitations -->
