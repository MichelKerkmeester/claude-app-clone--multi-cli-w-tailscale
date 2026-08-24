---
round: 1
seat: seat-002
executor: native-explore
lens: critical
status: ok
timestamp: "2026-08-23T09:45:00Z"
simulated: false
---

# Seat 002 — Security

## Headline

One shipped route set contradicts a frozen invariant. Everything else in the security half of the
sweep is either already implemented under a different name, or imports a threat model this
deployment does not have.

## Verdicts

| Claim | Verdict | Decisive evidence |
|---|---|---|
| R-05 "always-allow" as a structured scoped grant | satisfied | `approval-service.ts:323-379` `createAcceptEditsGrant` persists `allowedTools`/`remainingActions`/`expiresAt`/`epoch`; rejects `'*'`, clamps to 10 actions / 10 min (`:65-66`); `:381-434` re-checks per action; `:400` a prior deny of the same digest beats an active grant |
| R-05 risk classifier | **absent** | only hit for `risk\|destructive\|severity` across relay + protocol + client is a comment at `command-service.ts:18`. `MutationPolicy` (`mutation-policy.ts:8-12`) is family-level, not per-call |
| R-05 authenticate grants only, never declines | satisfied | `server.ts:782-790` runs approve and deny through one ungated path; `final-gate.ts:36-66` is consulted only on `consume` |
| R-05 separate Reject from Allow | partial | `Review.svelte:299-304` two adjacent grid cells, colour-differentiated; the blanket grant at `:167-189` is **one tap, no second confirmation** |
| R-07 notification is a hint, not state | satisfied | `push-service.ts:377-383` emits exactly `{lookupId, attentionClass}`; `negative-controls.test.ts:642` asserts content-free bytes; client re-validates key count in `service-worker.js` |
| R-07 `generation` / `nonce` | clarified | `generation` is an enforced monotonic staleness fence (`push-service.ts:222-231`); `nonce` is stored but **never verified** — dedupe is really `INSERT OR IGNORE` on `lookup_id` (`:236-252`); the real anti-replay is the epoch re-check at `:194-202` |
| R-07 re-read before send | moot | there is no notification action; `notificationclick` only navigates |
| R-08 filename / path hostility | **does-not-transfer** | no filename field in the protocol (`types.ts:115-121`); storage names are 32 CSPRNG bytes (`attachment-service.ts:679`); identity is server-minted opaque ids (`:714-722`); images reach pi as base64 in an RPC frame with no shell (`pi-image-bridge.ts:152-160`); any client filename is dropped by `redaction.ts:61` |
| R-08 byte half (jail, caps, re-encode, digests) | satisfied | `attachment-service.ts:767-772`, `:683-684`, `:299-300`; `artifact-store.ts:896-902` symlink reject; `attachment-normalizer.ts:36-113`; negative controls at `tests/security/negative-controls.test.ts:663-711` |
| R-08 best-effort per attachment | deliberately inverted, correctly | `pi-image-bridge.ts:130-150` fails the whole set |
| R-10 context budget / summarizer | not-our-component | `prompt-service.ts:81-140` forwards `{type:'prompt', message, images}`; `compaction_*` are host-emitted and only projected (`transcript-projector.ts:313-329`) |
| Frame cap, Origin check | satisfied | `server.ts:80`, `:219-222`; `:224`, `:1989-1993` (also deletes the four Tailscale identity headers) |
| Per-socket rate limit | moot | the socket accepts exactly one frame (`server.ts:275-278`, `:286`) |

## New defects found

- **A — three authority routes lack the foreground gate.** `/api/approvals` (`server.ts:771-780`),
  `/api/approval/decide` (`:782-790`), `/api/accept-edits` (`:1091-1123`) have no
  `isForegroundDevice` and no rate limiter, while twelve siblings have both (`:1039-1047`,
  `:1069-1077`). A *read* of a plan binding is gated; *approving a mutation* is not. No relay test
  asserts foreground for these routes.
- **D — no WS heartbeat**, so `isForegroundDevice` (`server.ts:190-196`) means "a socket was once
  opened". Independently found by seat-001 as N-3.
- **I — two unrelated things are both called "foreground"** (`server.ts:190-196` vs
  `push-service.ts:154-157` vs `server.ts:332-334`); they can disagree and lose a wake-up.
- **J — unbounded `submissions`/`deliveredSets` maps** at `attachment-service.ts:114-115`;
  `prompt-service.ts:66` bounds its equivalent at 256.

## Declined outright

All of R-10; R-08's filename/path half in full; R-08's casing normalization (actively
counterproductive against `redaction.ts:139`); per-socket rate limiting; "re-read before send";
R-05's structured-grant half as new work; and the `startsWith`-before-`timingSafeEqual` serveSecret
comparison (`server.ts:1985-1988`) — unreachable at this posture, and not to be laundered as
defence in depth.
