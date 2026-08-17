# Tasks — Protocol Contracts and Fail-Closed Capability Gate

- [x] Define the bounded media policy DTO with the fixed source, output, count, and related limits.
- [x] Define authoritative active-model `imageIn`, runtime media capability, attachment-set manifest, part ticket/status, cancellation, submission result, prompt attachment-reference, normalized image, and metadata-only `RedactedAttachmentBlock` types in `packages/pi-rpc-protocol/src/types.ts`.
- [x] Add exact-key, bounded guards in `packages/pi-rpc-protocol/src/guards.ts` for every new DTO and normalized Pi image block; reject pixels, base64, filenames, paths, unknown keys, bad ordinals, invalid digests, and out-of-range limits.
- [x] Export the new protocol types and guards from `packages/pi-rpc-protocol/src/index.ts`.
- [x] Add guard and boundary tests in `packages/pi-rpc-protocol/tests/guards.test.ts` for unknown-key rejection, attachment-reference-only submission, redacted-block allowlisting, and safe unknown transcript kinds.
- [x] Extend `apps/pi-remote-relay/src/runtime/runtime-service.ts` and host/Pi model mapping so the runtime snapshot carries `imageIn` and the host media policy, with false for text-only models.
- [x] Add the attachment action vocabulary and default-off gate in `apps/pi-remote-relay/src/auth/policy.ts`, `apps/pi-remote-relay/src/http/server.ts`, and `apps/pi-remote-relay/src/index.ts`; keep route lookup fail-closed unless `PI_REMOTE_MEDIA_ENABLED` is `1`.
- [x] Update `apps/pi-remote-web/src/relay.ts` and `apps/pi-remote-web/src/state.ts` to parse capability data and preserve unknown transcript blocks without assuming media fields.
- [x] Run the shared typecheck/test suites, focused protocol guards, relay/web regression suites, and the 390 px light/dark CDP check with media disabled.

