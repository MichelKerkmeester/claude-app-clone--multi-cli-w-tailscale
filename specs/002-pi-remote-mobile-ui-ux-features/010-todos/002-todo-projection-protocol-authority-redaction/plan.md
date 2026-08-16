# Plan — Todo projection protocol, host authority, and redaction

## Approach

Define the projection contract and fail-closed guards first, then adapt the authoritative host source into redacted snapshots and deltas. Wire the result through the existing relay persistence, replay, capability, and push boundaries without adding a mutation lane or deriving state from transcript content.

## Steps

1. Add snapshot, delta, task, closed-state, and capability types.
2. Add exact-key and value guards for all projection fields and malformed-shape cases.
3. Export the new types and guards and add protocol fixtures.
4. Implement the host projection adapter with stable opaque IDs, host ordering, redaction, and detail disposal.
5. Wire the adapter to the host lifecycle and existing `SyncHub` publication path.
6. Preserve canonical redaction across persistence, replay, logging, and broadcast.
7. Reuse authenticated snapshot, replay-barrier, reconnect, and live-delivery behavior.
8. Advertise the capability, preserve content-free push, extend security coverage, and prove no mutation path exists.

## Files to change

- `packages/pi-rpc-protocol/src/types.ts`
- `packages/pi-rpc-protocol/src/guards.ts`
- `packages/pi-rpc-protocol/src/index.ts`
- `packages/pi-rpc-protocol/tests/guards.test.ts`
- `apps/pi-remote-relay/src/store/todo-projector.ts`
- `apps/pi-remote-relay/src/index.ts`
- `apps/pi-remote-relay/src/store/redaction.ts`
- `apps/pi-remote-relay/src/store/relay-store.ts`
- `apps/pi-remote-relay/src/replay/sync.ts`
- `apps/pi-remote-relay/src/http/server.ts`
- `apps/pi-remote-relay/src/rpc/supervisor.ts`
- `apps/pi-remote-relay/src/push/push-service.ts`
- `apps/pi-remote-relay/tests/todo-projection.test.ts`
- `apps/pi-remote-relay/tests/redaction.test.ts`
- `apps/pi-remote-relay/tests/sync.test.ts`
- `apps/pi-remote-relay/tests/security/negative-controls.test.ts`
- `apps/pi-remote-relay/tests/push.test.ts`

## Verification gate

Run `npm run typecheck` and `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`; both commands must exit 0. The gate also requires proof that no task-created mutation command, HTTP route, ticket, approval, or phone-originated RPC exists and that the projection is strictly read-only.
