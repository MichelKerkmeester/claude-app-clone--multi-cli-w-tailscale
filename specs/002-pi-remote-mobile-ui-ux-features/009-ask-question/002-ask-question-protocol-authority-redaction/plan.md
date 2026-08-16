# Plan — Ask-question protocol, host authority, and redaction

## Approach

Build the mutation lane from the existing typed envelope, authentication, ticket, redaction, sync, push, and extension-boundary patterns. Define the DTOs and guards first, then connect host lifecycle ownership, exact ticket binding, callback confirmation, and metadata-only projections. Reuse the canonical digest helpers and keep all browser-visible and durable representations allowlisted and content-free where required.

## Steps

1. Define the presentation, lifecycle, transcript metadata, answer, ticket, and result DTOs while preserving the existing envelope.
2. Add strict guards, exports, canonical answer digest coverage, and malformed-payload tests.
3. Implement host-owned pending-question identity, revision lifecycle, validation, idempotency, redaction, and accepted-result publication.
4. Extend authenticated policy and one-use ticket binding for exact session, question, revision, device, scope, digest, and expiry checks.
5. Add authenticated ticket and answer routes with request-shape validation, safe reason mapping, rate limiting, and fail-closed consumption.
6. Route the real Pi event and confirmed answer callback through the existing RPC supervisor, demux, and extension boundary.
7. Enforce allowlisted redaction before persistence and broadcast, metadata-only transcript projection, fresh redacted replay, and content-free push.
8. Run protocol, relay, extension-boundary, security, and serialized-boundary verification from the final state.

## Files to change

- `packages/pi-rpc-protocol/src/types.ts`
- `packages/pi-rpc-protocol/src/guards.ts`
- `packages/pi-rpc-protocol/src/index.ts`
- `packages/pi-rpc-protocol/src/approval.ts` — only if a generic typed answer digest adapter is required
- `packages/pi-rpc-protocol/tests/guards.test.ts`
- `packages/pi-rpc-protocol/tests/ask-question.test.ts`
- `apps/pi-remote-relay/src/auth/policy.ts`
- `apps/pi-remote-relay/src/auth/auth-service.ts`
- `apps/pi-remote-relay/src/http/server.ts`
- `apps/pi-remote-relay/src/ask-question/ask-question-service.ts`
- `apps/pi-remote-relay/src/store/redaction.ts`
- `apps/pi-remote-relay/src/store/relay-store.ts`
- `apps/pi-remote-relay/src/store/transcript-projector.ts`
- `apps/pi-remote-relay/src/replay/sync.ts`
- `apps/pi-remote-relay/src/push/push-service.ts`
- `apps/pi-remote-relay/src/rpc/demux.ts`
- `apps/pi-remote-relay/src/rpc/supervisor.ts`
- `apps/pi-remote-relay/tests/ask-question.test.ts`
- `apps/pi-remote-relay/tests/mutation-lane.test.ts`
- `apps/pi-remote-relay/tests/redaction.test.ts`
- `apps/pi-remote-relay/tests/sync.test.ts`
- `apps/pi-remote-relay/tests/push.test.ts`
- `apps/pi-remote-relay/tests/authority-loop.test.ts`
- `extensions/pi-remote-approval/src/index.ts`
- `extensions/pi-remote-approval/tests/final-boundary.test.ts`

## Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- `npx vitest run extensions/pi-remote-approval/tests/final-boundary.test.ts` exits 0.
- Security review confirms one-use ticketing, exact revision and digest binding, device binding, fail-closed behavior, redaction before persistence and broadcast, content-free push, host/extension plan-mode enforcement, and phone-inaccessible `--full-access`.
- The serialized transcript, push payload, logs, telemetry fixtures, and extension handoff fixtures contain no question content, answer text, ticket, digest, or raw callback data.
