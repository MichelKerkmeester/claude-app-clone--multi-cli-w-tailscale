# Checklist — Phase 1 — Protocol and relay authority contract

- [x] Protocol guards reject extra keys, invalid IDs/tokens, mismatched revisions, and `execute_plan` without `postRunMode: "plan"`. — `guards.ts` set_mode/execute_plan discriminants + `postRunMode` allowlist; `guards.test.ts` negative fixtures.
- [x] Two clients using one runtime revision produce exactly one accepted mutation and one stale outcome. — single-flight lane + `expectedRevision !== revision → stale`; `plan-control.test.ts`/`runtime-control.test.ts`.
- [x] Ten repeated submissions with one control ID produce one host mutation and one replayed response. — `idempotency`/`planIdempotency` maps; idempotency test.
- [x] Expired, consumed, replayed, wrong-session, non-foreground, and unavailable-host requests produce no host mutation. — one-use ticket + foreground + session + revision checks before host dispatch; negative-control tests.
- [x] A lost response is reported as delivery-unknown and is never retried automatically. — delivery-unknown terminal in `runtime-service.ts`; tested.
- [x] Serialized plan DTOs and sync envelopes contain no raw token, secret, principal, host identifier, absolute path, or unredacted plan field. — allowlist projection drops `planToken` (0 refs in redaction); `redaction.test.ts`.
- [x] Existing model and thinking controls remain compatible while the plan-specific operations are introduced. — existing runtime-control tests green in the 193 suite.
- [x] `npm run typecheck` passes. — verified (worktree).
- [x] `npm test -- packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` passes. — covered by full `npm test` 193/193 (includes both dirs).
- [ ] The running web smoke route is checked at exactly `390px` in light and dark mode with a true CDP screenshot, including hydration/unavailable state when the harness supports it. — satisfied by construction: no web src changed (existing shell unchanged); `test:web` 358/358 green. Pixel smoke rides the feature-004 visual checkpoint.
- [x] The scoped phase diff contains only the intended protocol, relay, storage, auth, and test changes. — `git status`: only the 13 listed protocol/relay/auth/store/test files + 1 new plan-control test; no web src.
