---
title: "Child 016/002 implementation summary — route authority"
description: "Foreground proof is universal across mutation routes, every rate-limited refusal carries a retry hint, and the two routes that had no HTTP coverage now have both directions asserted."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "route authority implementation summary"
  - "route authority packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-24T17:58:13.878Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Foreground gates, retry hints and the observed-foreground preference shipped."
    next_safe_action: "Start 016/003, which carries an operator question about its client half."
    blockers: []
    completion_pct: 100
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
| Status | **Shipped** |
| Requirements shipped | REQ-001 … REQ-007 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

**Foreground is now universal.** Approval-decide and accept-edits exercised mutation authority with
no foreground proof and no rate limit. Prompt-submit checked only when the payload carried an
attachment, so a plain steering prompt from a background device was accepted while the same prompt
carrying an image was refused — the invariant holding for the wrong reason. All three now prove
foreground the way their twelve siblings do.

**The approval listing route stays ungated**, deliberately and now permanently asserted. Listing is
a read; gating it would refuse a phone whose socket has not yet re-opened.

**Every rate-limited refusal says when to come back.** Eleven sites answered with a bare status
while the client shipped a parser for the hint, a clamp on it and a consumer acting on it. Each
already had the number in hand and discarded it. One helper owns the clamp; the artifact path and
the socket refusal reuse it.

**Foreground stopped meaning two things.** The push service held a set the phone asserts about
itself and combined it with the set the server observes from live sockets using an `or`. The
observed set now decides wherever one is supplied, and the field says it is asserted.

**The two routes got their first HTTP-level tests**, plus a foreground connection in the two prompt
suites that had been authorising over HTTP alone.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Five steps, each committed and typechecked before the next, after two attempts at one large patch
died partway through and left the tree not compiling. The failure mode was patch size against a
2400-line file, not model capability: the same model on the same surface finished every step once
the steps were small.

Step one made the limiter's reset time reachable without changing a single refusal decision, which
is what let the four behavioural steps be reviewed one at a time.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The prompt suites were changed, and it is worth being explicit about why.** Making prompt-submit
unconditional turned ten existing tests red, which is exactly the shape of a change that should be
reverted rather than absorbed. The invariant was checked instead of the tests: foreground means an
open sync socket, the real client holds one for the whole session because the transcript streams
over it, and both suites authorised over HTTP and never opened one. They had been asserting the
background contract without meaning to. Against the previous code a background device submitting a
plain prompt receives 202 — that was the hole, and one case now stays background to hold the refusal.

**Two 429 sites deliberately send no hint.** The socket-capacity refusal is not a rate limit and has
no reset time, so any number there would be invented. Runtime reconcile keeps the static hint it
already had, because a test pins that contract and changing it is not this packet's business.

**The asserted foreground value was kept as a fallback**, not deleted. A caller that observes
nothing still needs a signal, and the assertion is the only one available to it.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Background refused on all three mutation routes | PASS — 403 `foreground_required` on decide, accept-edits and submit |
| Pre-gate control, approval-decide | FAIL as expected — the background caller reached the service and got 409 |
| Pre-gate control, prompt-submit | FAIL as expected — the background caller received 202 |
| Foreground unaffected | PASS — no route answers `foreground_required` to a device holding a socket |
| Listing still answers a background device | PASS — asserted permanently |
| Retry hint coverage | PASS — 11 of 11 limiter-backed refusals carry it, from one shared clamp |
| Push stranding control | PASS — pre-fix the stale-assertion device received 0 pushes, now 1 |
| `npm run typecheck` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 |
| Backend, four real directories | PASS — exit 0, 52 files / 390 tests |
| `npm run test:web` | PASS — exit 0, unaffected by this child |

`auth.test.ts` and `integration/pinned-pi-image-probe.test.ts` failed intermittently throughout and
are the documented load-sensitive flakes: the probe passed 3 of 3 both with and without the change
under test, and the auth assertion failed identically on both arms of a scoped-stash comparison.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The rate-limit windows are copied, not measured.** Thirty per minute matches the adjacent mutation
route and was chosen because a limiter that never fires costs nothing. Nothing here establishes what
a normal approval burst looks like.

**Two error strings disagree.** Runtime reconcile answers `rate-limited` while every other refusal
answers `rate_limited`. Both reach the client; nothing here changes either, but a reader greping for
one will miss the other.

**The attachment service's own limiter still exposes only a boolean**, so its 429 mappings carry no
hint. It is a different limiter with a different signature and was out of scope.
<!-- /ANCHOR:limitations -->
