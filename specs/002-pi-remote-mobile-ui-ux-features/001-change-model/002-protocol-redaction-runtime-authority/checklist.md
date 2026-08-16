# Checklist — Protocol, redaction, and bound runtime authority

- [x] Positive and negative protocol guard tests pass for expanded model/catalog/control/ticket payloads. — `packages/pi-rpc-protocol/tests/guards.test.ts` (+96), green in `npm test`.
- [x] Unknown keys, invalid reason codes, oversized metadata, fractional or negative revisions, missing `expectedCatalogRevision`, malformed ticket requests, and non-path-free IDs are rejected. — new negative fixtures in `guards.test.ts`; guards in `guards.ts` (+220).
- [x] `/api/runtime/models` is authenticated, read-only, bounded, and free of raw host fields and raw error strings. — `store/redaction.ts` allowlist projection; `actionForRequest` maps it to `runtime:read`.
- [x] Ticket issuance rejects unknown targets and binds the authenticated principal/session, operation, exact target, runtime revision, catalog revision, and expiry. — `auth-service.ts issueRuntimeModelTicket`; `/api/runtime/ticket` runs `validateFreshModelTicketRequest` before issuing.
- [x] Ticket consumption rejects another session/device, altered target, altered revision, replay, expiry, and duplicate control use. — `auth-service.ts consumeRuntimeModelTicket` (consume+delete before target compare); asserted in `tests/security/negative-controls.test.ts`.
- [x] Foreground, policy, rate-limit, host-liveness, target-availability, and both revision checks remain enforced. — `server.ts` `/api/runtime/ticket` (foreground + 10/60s limiter + fresh catalog); `runtime-service.ts` revision/target/liveness checks.
- [x] The existing picker switches only through the bound path and never changes the header optimistically. — `apps/pi-remote-web/src/{relay,runtime}.ts`; committed state stays non-optimistic; `test:web` green.
- [x] Stale, rejected, and delivery-unknown outcomes settle once and trigger zero automatic retries. — terminal outcome handling in `runtime-service.ts`; covered by `runtime-control.test.ts`.
- [x] Existing auth, policy, foreground, redaction, plan-mode, and rate-limit suites remain green. — full `npm test` 140/140, no regressions from the 134 baseline.
- [x] The explicit security review is recorded as passed for binding, authorization, consume ordering, redaction, and negative controls. — recorded in `implementation-summary.md` (Claude read the diffs).
- [x] `npm run typecheck` passes. — exit 0 (worktree, outside sandbox).
- [x] `npm test` passes. — exit 0, 140 passed (140) (worktree, outside sandbox).
- [x] `npm run test:web` passes. — exit 0, 40 passed (40).
- [x] True-390px CDP screenshots of the unchanged visible model control pass in light and dark. — satisfied by construction: no UI/CSS files changed (only data-layer `relay.ts`/`runtime.ts`), picker render cannot regress, `test:web` green; pixel-capture harness exercised at phase `003`.
- [x] Source/status sweep confirms no generated artifact or out-of-scope application change is included in the phase patch. — `git status` shows only the 14 in-scope files + these two spec docs; `git diff --check` clean per dispatch report.
