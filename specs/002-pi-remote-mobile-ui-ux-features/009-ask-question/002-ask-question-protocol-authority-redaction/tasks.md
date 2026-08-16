# Tasks — Ask-question protocol, host authority, and redaction

- [ ] Update `packages/pi-rpc-protocol/src/types.ts` with presentation, lifecycle, metadata-only transcript, answer, ticket, and result DTOs.
- [ ] Update `packages/pi-rpc-protocol/src/guards.ts` and `packages/pi-rpc-protocol/src/index.ts` with strict guards and exports for every DTO.
- [ ] Reuse `packages/pi-rpc-protocol/src/approval.ts` canonicalization and digest helpers, and cover typed answer binding in `packages/pi-rpc-protocol/tests/ask-question.test.ts`.
- [ ] Extend `packages/pi-rpc-protocol/tests/guards.test.ts` and `packages/pi-rpc-protocol/tests/ask-question.test.ts` for duplicate IDs, invalid revisions, free-text constraints, redaction metadata, unknown reasons, and serializer exclusion.
- [ ] Add `apps/pi-remote-relay/src/ask-question/ask-question-service.ts` for host-owned identity, revision lifecycle, redaction, validation, idempotency, and confirmed handoff.
- [ ] Extend `apps/pi-remote-relay/src/auth/policy.ts` and `apps/pi-remote-relay/src/auth/auth-service.ts` with explicit answer actions and exact one-use ticket bindings.
- [ ] Add authenticated ticket and answer handling in `apps/pi-remote-relay/src/http/server.ts` with pre-consumption shape validation and safe status metadata.
- [ ] Route the confirmed callback through `apps/pi-remote-relay/src/rpc/demux.ts`, `apps/pi-remote-relay/src/rpc/supervisor.ts`, and `extensions/pi-remote-approval/src/index.ts`.
- [ ] Update `apps/pi-remote-relay/src/store/redaction.ts`, `apps/pi-remote-relay/src/store/relay-store.ts`, and `apps/pi-remote-relay/src/store/transcript-projector.ts` to enforce metadata-only persistence and allowlisted projections.
- [ ] Update `apps/pi-remote-relay/src/replay/sync.ts` and `apps/pi-remote-relay/src/push/push-service.ts`, then extend `apps/pi-remote-relay/tests/ask-question.test.ts`, `apps/pi-remote-relay/tests/mutation-lane.test.ts`, `apps/pi-remote-relay/tests/redaction.test.ts`, `apps/pi-remote-relay/tests/sync.test.ts`, `apps/pi-remote-relay/tests/push.test.ts`, `apps/pi-remote-relay/tests/authority-loop.test.ts`, and `extensions/pi-remote-approval/tests/final-boundary.test.ts` with security and content-free negative controls.
