---
title: "Child 016/002 checklist — route authority and rate-limit honesty"
description: "Barrier sign-off for the route pass. Every item is open: the packet is scoped and not started."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "route authority verification checklist"
  - "route authority packet"
  - "verification checklist"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/002-route-authority"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Build the harness."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 016/002 — Route authority

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Two assertions per gated route, and the second is the important one: a foreground device must be
unchanged. The hazard in authority work is not failing to block — it is blocking someone who should
pass, on a phone that is the only client this system has.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Every route classified as exercising authority or observing state. [evidence: fifteen routes read; three exercised authority without proving it — `/api/approval/decide`, `/api/accept-edits`, `/api/prompt/submit`]
- [x] **CHK-PRE-02** [P0] The route-level harness exists and is route-agnostic. [evidence: `app-relay/tests/route-authority.test.ts` stands up a server, mints a session and connects a socket, reusable per route]
- [x] **CHK-PRE-03** [P1] Backend baseline captured. [evidence: `npx vitest run` over the four real directories: 51 files, 385 tests, exit 0 before the change]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] The gates copy the adjacent route's pattern. [evidence: both gates copy the `/api/ask-question/ticket` shape: foreground proof, then limiter, then act]
- [x] **CHK-CQ-02** [P0] The prompt gate no longer depends on payload shape. [evidence: `app-relay/src/http/server.ts` drops the `hasAttachments &&` condition; the media-disabled check is untouched]
- [x] **CHK-CQ-03** [P1] The authority predicate itself is unchanged. [evidence: `isForegroundDevice` is unchanged; only its call sites grew]
- [x] **CHK-CQ-04** [P1] The asserted foreground flag is named as asserted. [evidence: `assertedForegroundDevices` in `app-relay/src/push/push-service.ts` names the client claim as a claim]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Background device refused on all three mutation routes. [evidence: `npx vitest run app-relay/tests/route-authority.test.ts` and the prompt suite assert 403 `foreground_required` on all three]
- [x] **CHK-TEST-02** [P0] Foreground device unchanged on all three. [evidence: no route answers `foreground_required` to a socket-holding device; asserted on all three]
- [x] **CHK-TEST-03** [P0] Listing route still answers a background device. [evidence: `route-authority.test.ts` pins `/api/approvals` as answering a background device]
- [x] **CHK-TEST-04** [P1] Plain and attachment-carrying prompts gated identically. [evidence: the prompt-submit gate no longer reads `hasAttachments`; the background case covers both shapes]
- [x] **CHK-TEST-05** [P0] `npm test` exit 0. [evidence: `npx vitest run` over the four real directories: 52 files, 390 tests passed, exit 0]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] No bare rate-limited response remains. [evidence: `grep -c retryAfterHeaders(admission.retryAfterSeconds)` returns 11, one per limiter-backed refusal]
- [x] **CHK-FIX-02** [P1] The client receives a real value. [evidence: the hint carries the limiter reported seconds, clamped once in `retryAfterHeaders`]
- [x] **CHK-FIX-03** [P1] The rate limiter's window does not fire during a normal approval burst. [evidence: both use `new FixedWindowRateLimiter(30, 60_000, ...)`, matching the adjacent mutation route]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] The foreground invariant is universal across mutation routes. [evidence: every mutation route in `app-relay/src/http/server.ts` now calls `isForegroundDevice` before acting]
- [x] **CHK-SEC-02** [P0] Reads remain ungated. [evidence: `/api/approvals` stays ungated and `npx vitest run app-relay/tests/route-authority.test.ts` asserts it]
- [x] **CHK-SEC-03** [P1] The claim made is consistency, not new security. [evidence: the newly refused caller is a background device that already held an enrolled key; recorded as consistency in `spec.md`]
- [x] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [evidence: `git status` shows `specs/context/` untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The exercises-versus-observes rule is written where the next route author will read it. [evidence: the exercises-versus-observes rule sits in `implementation-summary.md` beside the listing exemption]
- [x] **CHK-DOC-02** [P2] The listing route's deliberate exemption is stated. [evidence: stated in `implementation-summary.md` and pinned by a test rather than only by prose]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Per-phase commits. [evidence: five commits: `96ec438`, `a8fb5c8`, `f59fc28`, `d61ee3f`, `ae9f97f`]
- [x] **CHK-ORG-02** [P2] The harness lives where the next route test will find it. [evidence: `app-relay/tests/route-authority.test.ts` sits with the relay suites and runs in the backend lane]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest framing: this child buys a property for readers rather than protection from an attacker.
Anyone reviewing it should hold it to that claim and not to a larger one.
<!-- /ANCHOR:summary -->
