# Checklist — Authoritative rich-block contract and redacted projection

- [x] Shell-capable blocks expose stable `callId`, shell genre, authoritative lifecycle/checkpoint, completeness, block identity, and monotonic revision. — new bounded fields in `types.ts`; projector carries `callId` across events/revisions.
- [x] Legacy blocks remain valid, safe, and non-rich inputs for old clients and cached data. — legacy shapes stay guard-valid but non-rich-eligible; web cache leaves incomplete entries on the legacy path.
- [x] Concurrent, out-of-order, duplicate, lower-revision, result-before-call, and terminal-without-result fixtures retain enough identity without adjacency matching. — projector tests cover these; safe unmatched-result path.
- [x] `isTranscriptBlock` and all new guards reject malformed rich fields and unknown rich variants before rendering. — strict guards (opaque `callId`, lifecycle enum set, `TextArtifactBlock`); guard tests for bounds/unknown-discriminant/wrong-type.
- [x] Redaction markers, not fixture sentinels, are the only sensitive values present in persistence, page responses, sync messages, cache fixtures, logs, and errors. — `redaction.test.ts` asserts `not.toContain(sentinel)` at serialization/boundary/log listeners; paths/tokens/secrets redacted.
- [x] Existing transcript and `/api/sync` paths remain read-only with no new mutation ticket, host-file operation, endpoint, or filesystem lookup. — `server.ts` unchanged (verification-only); negative-control asserts no new route/ticket.
- [x] The legacy Activity/prose renderers remain the visible path before Phase 2. — no rich UI added; `test:web` 511 unchanged; CDP legacy-activity unchanged.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — exit 0, 256 passed (32 files) outside sandbox.
- [x] `npm run test:web` passes. — exit 0, 511 passed (34 files).
- [x] `npm run build` passes. — exit 0.
- [x] The legacy-Activity CDP light capture reports exactly 390 CSS pixels, zero page horizontal overflow, unchanged transcript/composer geometry. — exit 0, PNG inspected.
- [x] The legacy-Activity CDP dark capture reports exactly 390 CSS pixels, zero page horizontal overflow, unchanged geometry/contrast. — exit 0, PNG inspected.
- [x] Security/privacy review approves rich-field propagation, redaction ordering, identity propagation, terminal/truncation semantics, fixture hygiene, and negative controls before enablement. — Claude read the diffs; PASS (see implementation-summary).
