# Implementation Summary — Phase 1 — Protocol and relay authority contract

## Final state

Complete and verified. The typed, redacted, revision-checked contract for host-confirmed mode and reviewed-plan control is in place: distinct `set_mode`/`execute_plan` operations, independent runtime and plan revisions, single-flight idempotent mutation, terminal delivery-unknown, and allowlisted plan-artifact redaction — with the existing model/thinking controls unchanged. No visual surface. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (protocol + relay)

- **Protocol** (`packages/pi-rpc-protocol/`): bounded plan-artifact / plan snapshot+event / validity-value DTOs; `set_mode` and `execute_plan` command discriminants + guarded outcomes; independent runtime + plan revisions. Guards reject extra keys, invalid IDs/opaque tokens, mismatched revisions, and `execute_plan` without `postRunMode: "plan"`. New exports + fixtures.
- **Relay runtime** (`runtime-service.ts`, `plan-status.ts`): authoritative runtime + `planRevision`; one single-flight mutation lane; dual control-ID idempotency maps (one mutation + one replay for 10 repeats); stale rejection (two clients on one revision → one accepted + one stale); terminal delivery-unknown (lost response → no auto-retry). `parsePlanStatus` accepts only the pinned host mode/status contract and maps malformed/unhealthy → `unknown`, **never Build**.
- **Relay HTTP/auth** (`server.ts`, `rate-limit.ts`, `policy.ts`): both operations authenticated, foreground-only, single-flight, rate-limited, idempotent-by-control-ID, one-use-ticketed, and bound to session + foreground principal + host context + expected runtime revision; `execute_plan` also carries the plan binding + `postRunMode`. Guards/stale run before host dispatch; timeout → delivery-unknown. `/api/runtime/state` stays read-only. Ticket expiry/replay/wrong-session/non-foreground/unavailable → no mutation.
- **Relay storage/sync** (`redaction.ts`, `relay-store.ts`, `replay/sync.ts`): allowlist projectors redact plan artifacts before persistence/replay/sync/broadcast/DTO; raw `planToken` is never persisted or placed in transcript projections (0 refs in redaction).

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **193 passed (193)** (+25 new: protocol guards, plan-status, redaction, `plan-control`, runtime-control). Zero regressions.
- `npm run test:web` → exit 0, 358 passed (358) — no web src changed.
- Security review (Claude read the diffs): independent revisions; dual idempotency + single-flight; delivery-unknown terminal; malformed status → unknown never Build; `execute_plan` requires `postRunMode`; `planToken` dropped by the allowlist.

## Frozen contracts

- Design untouched (no visual change).
- Security strengthened: both control ops authenticated/foreground/single-flight/rate-limited/idempotent/one-use-ticketed/revision-bound; guards+stale before host dispatch; timeout→delivery-unknown (no retry); plan artifacts redacted at every boundary; no client authority shortcut.

## Deferred

- True-390px CDP smoke rides the feature-004 visual checkpoint (later phases add the composer control + review UI); this phase changes no web surface.
