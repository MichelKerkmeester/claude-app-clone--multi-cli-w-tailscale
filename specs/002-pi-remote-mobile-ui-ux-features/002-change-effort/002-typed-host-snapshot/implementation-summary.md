# Implementation Summary — Typed host snapshot, reconciliation, and redacted outcomes

## Final state

Complete and verified. The relay/protocol gained one read-only way to rehydrate authoritative runtime state (`RuntimeSnapshotDto` via `POST /api/runtime/reconcile`) and a bounded runtime issue-code allowlist that replaces raw host/transport text at the browser boundary — without a new visual surface and without changing feature 001's mutation authority. Implemented by Luna 5.6 Max (via the opencode-go gateway); orchestrated and verified by Claude.

## What shipped

- **Protocol** (`packages/pi-rpc-protocol/`): `RuntimeSnapshotDto` (host order/subset of advertised levels + confirmed value + streaming + mode + model + revision); `RUNTIME_ISSUE_CODES` allowlist + `RuntimeIssueCode`/`RuntimeIssueDto` types; the control-response reason codes tightened to a bounded enum. Exact-key guards reject unknown issue codes, extra keys, unbounded strings, invalid revisions/levels, and mismatched session IDs. New public exports + positive/negative fixtures.
- **Relay** (`store/redaction.ts`, `runtime/runtime-service.ts`, `http/server.ts`): allowlisted snapshot projection; `hydrate()` reads state+levels+models together, preserves advertised order/subset, and deduplicates concurrent hydrates. `POST /api/runtime/reconcile` is a `runtime:read` op — consumes no ticket, forwards no intent, never calls `set_thinking_level`, rate-limited with `Retry-After`. Host rejection / unsupported capability / ambiguous transport failures map through `runtimeIssueCode()` to the fixed allowlist; raw Pi reasons and HTTP bodies never reach the browser. Existing `/api/runtime/{state,models,control}` preserved.
- **Web** (`apps/pi-remote-web/src/relay.ts`): minimal adapter to fetch the snapshot and normalize transport errors; current controls stay type-safe. No visual change.

## Verification (Claude, in the worktree — opencode-go dispatches are not sandbox-restricted, so the model's own run already bound loopback)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **147 passed (147)** (baseline 140 → +7, zero regressions).
- `npm run test:web` → exit 0, 74 passed (74).
- Security review (Claude read the handler): reconcile consumes no ticket and only calls `hydrate()`; issue-code projection prevents raw host text; the feature-001 mutation lane (one-use revision-bound ticket, foreground, revision checks) is untouched and its tests remain green.

## Frozen contracts

- Design system untouched (no visual surface this phase).
- Security strengthened, never weakened: read-only default; reconcile is a read; browser sees only bounded issue codes; plan-mode/tool authority unchanged.

## Deferred

- True-390px CDP capture rides the feature-002 visual checkpoint (after the effort-sheet UI phase) — this phase changes no visual surface; "no raw issue text / no new overflow" is already test-proven.
