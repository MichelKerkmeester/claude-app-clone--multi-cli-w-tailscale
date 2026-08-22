# Iteration 004 — streaming identity under segments, failure, and sync races

## Focus

Angle 1 [logic]: deepen the streaming-reply state machine beyond iteration 1's UUID-at-start and ephemeral-before-durable basics. The pass traced persistence boundaries, multi-segment resets, receiver projection behavior, resend tombstones, and stop/error paths that decide whether a partial becomes durable or an empty stream is retired.

## Actions Taken

1. Read the full streaming lifecycle in `src/stores/chatStore.ts`, including the typed forming-state value, segment reset, finalization, clear path, and persistence `partialize` boundary.
2. Read `src/stores/chatStoreReplyFinalization.ts` and `src/stores/chatPersistence.ts` to verify conversation matching, reasoning/answer parsing, durable UUID preservation, and empty-stream behavior.
3. Read `src/screens/ChatScreen/types.ts`, `src/stores/remoteChatStreamStore.ts`, `src/services/sync/supersedeSyncedReplies.ts`, and their focused tests for receiver replacement, deduplication, and resend races.
4. Read `src/services/generationService.ts` and `src/services/generationServiceHelpers.ts` for stop/error cleanup, token-buffer flushing, reasoning-only partials, and tool-segment resets.

## Findings

### F1 — Treat reload/crash recovery as durable-transcript recovery, not stream resurrection

OGAM persists only `conversations` and `activeConversationId`; all forming-reply fields are excluded by `partialize` (`specs/context/OGAM-main/src/stores/chatStore.ts:489-498`). The focused test explicitly asserts that streaming text, flags, and streaming conversation identity are absent from persisted state (`specs/context/OGAM-main/__tests__/unit/stores/chatStore.test.ts:1163-1185`). The remote preview store is likewise documented as non-durable: the chat-stream service owns frames, ordering, and expiry, while the finished message arrives separately through the op-log and previews vanish (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:17-24`).

Adoptable Pi Remote rule: after a tab/device crash, restore only finalized transcript records; never hydrate an in-flight assistant bubble as if it were authoritative. Make the remote stream lease/expiry explicit in the transport service, and let a fresh session start a new turn identity. This avoids resurrecting stale partial text or producing a second durable row from an abandoned stream.

### F2 — Use a pure finalization predicate as the orphan gate

`finalizeStreamedReply` parses the stream once into clean answer and reasoning fields, then sets `persisted` only when the stream's conversation matches the target and at least one of those fields is non-empty (`specs/context/OGAM-main/src/stores/chatStoreReplyFinalization.ts:52-64`). The store records that result in `lastReplyEnd` while clearing all forming fields (`specs/context/OGAM-main/src/stores/chatStore.ts:380-403`). A clear with an active streaming conversation records `{ persisted: false }` instead of silently dropping the end state (`specs/context/OGAM-main/src/stores/chatStore.ts:417-428`).

This gives a receiver-facing state transition stronger than “the socket closed”: `persisted=true` means retire the preview and expect the durable upsert; `persisted=false` means retire it with no record expected. Pi Remote should carry this explicit end disposition in its stream protocol, including for a stop-before-first-token case.

### F3 — Partial output survives stop, provider failure, and reasoning-only turns

The generation service flushes pending tokens before deciding what to do, and uses the chat store's shown content as the source of truth rather than its own service buffer (`specs/context/OGAM-main/src/services/generationService.ts:220-239`). If a conversation is streaming, it always calls finalization—even when only reasoning is visible—and calls clear only when there is no streaming conversation (`specs/context/OGAM-main/src/services/generationService.ts:231-243`). The error path applies the same keep-partial policy before resetting service state (`specs/context/OGAM-main/src/services/generationService.ts:209-216`).

Adoptable invariant: once a receiver has seen user-visible answer or reasoning content, a stop/error transition must finalize that partial under the original turn ID. Only a genuinely empty stream should be orphan-retired. This closes the crash window where a service-local buffer diverges from the rendered projection and a remote device waits forever for a record that will never arrive.

### F4 — Segment reset is a content boundary, not an identity boundary

The store's `resetStreamingSegment` clears only answer and reasoning text (`specs/context/OGAM-main/src/stores/chatStore.ts:368-370`). The generation helper first flushes pending content, clears service-local answer/reasoning buffers, and then resets the store segment (`specs/context/OGAM-main/src/services/generationServiceHelpers.ts:197-207`). The focused test verifies that conversation ID, reply UUID, and `isStreaming` survive the reset (`specs/context/OGAM-main/__tests__/unit/stores/chatStore.test.ts:974-991`).

For Pi Remote, tool-call/reasoning/answer segments should share one turn ID and one receiver row. Segment sequence numbers can advance for ordering, but must not mint a new durable message identity or make the receiver append a second assistant bubble.

### F5 — Receiver snapshots replace; durable arrival retires the preview

The remote projection filters previews whose `messageId` already matches a durable local message ID or UUID, and also suppresses a same-origin answer match (`specs/context/OGAM-main/src/screens/ChatScreen/types.ts:137-150`, `154-168`). Remote preview rows use a shared stable ID (`specs/context/OGAM-main/src/screens/ChatScreen/types.ts:171-185`), so successive frames update one synthetic row. The store's tests prove that `setPreviews` replaces the whole preview set rather than appending old frames, and that an empty set removes a completed preview because the real message arrives via the op-log (`specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:49-70`).

Adoptable receiver algorithm: maintain the latest snapshot keyed by turn/message ID; render it as a synthetic row; on durable upsert with the same ID, drop the synthetic row; never concatenate frame history into the transcript. The matching-by-content fallback is useful as a same-origin guard, but the stable ID should remain authoritative.

### F6 — Resend/replacement needs a tombstone before preview discard

When a reply is replaced, `supersedeSyncedReplies` emits a delete mutation for every matching preview's `messageId` before invoking the discard hook (`specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:10-27`). The source explicitly states that the preview ID is also its durable record ID and that tombstoning first prevents an in-flight put from restoring the old reply after replacement starts (`specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:11-15`).

Pi Remote should use the same generation-fence/tombstone ordering for resend, regenerate, or conversation replacement: mark the old turn ID retired before clearing the local preview, and reject late durable writes for that ID. This is the race defense missing from a simple “clear the bubble then start again” implementation.

### Evidence boundary — shared transport implementation is not present in this snapshot

The mobile source imports `ChatStreamPreview` and `chatStreamPreviewRows` from `@offgrid/sync`, and the package manifest points that dependency at `file:../shared/packages/sync` (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:1-10`, `specs/context/OGAM-main/package.json:33-40`). That sibling package is not present under the provided `specs/context` snapshot. The receiver/store and UI contracts are therefore confirmed, but exact wire-frame expiry timers, sequence acceptance rules, and producer-side crash recovery are UNKNOWN from this evidence set and should not be copied by assumption.

## Questions Answered

- **How does the lifecycle behave after a crash or reload?** Forming state is intentionally volatile; only finalized conversations are rehydrated, and remote previews are a non-durable projection.
- **How are empty/orphan streams distinguished from durable completion?** A pure finalization predicate emits an explicit `persisted` disposition, including through `lastReplyEnd`.
- **How are partials protected during stop/error?** Buffers are flushed and the rendered store content is finalized whenever a streaming conversation exists, including reasoning-only partials.
- **How do multi-segment turns avoid duplicate rows?** Segment resets clear content only; conversation and reply UUID survive, so one turn identity spans reasoning, tools, and answer segments.
- **How does the receiver avoid frame accumulation and durable duplication?** It replaces preview snapshots, uses stable IDs, and filters a preview once the durable record with the same identity exists.
- **How is resend protected against late writes?** A durable tombstone is emitted before the old preview is discarded.

## Questions Remaining

- The exact `@offgrid/sync` producer/receiver lease, sequence-window, and expiry implementation remains unconfirmed because its sibling package is absent from the snapshot.
- A future pass should trace the service-owned paired-device stream transport when that shared package is available, especially the receiver's handling of `persisted=false` and late frames after tombstone.
- The broader service-versus-reactive-store ownership question remains open for the architecture-focused iteration.

## Next Focus

Iteration 005: Angle 1 [logic] — tool-calling loop crash/race resistance, unless the reducer pivots to the still-open service-ownership or receiver-transport question.
