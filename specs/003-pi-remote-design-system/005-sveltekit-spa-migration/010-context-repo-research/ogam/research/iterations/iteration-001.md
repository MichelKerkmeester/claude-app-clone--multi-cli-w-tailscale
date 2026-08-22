# Iteration 001 — streaming-reply single-identity state machine

## Focus

Angle 1 [logic]: how OGAM keeps a streaming assistant reply as one identity across the ephemeral live projection, the durable local record, and paired-device synchronization. Sources were restricted to the requested OGAM store, persistence, sync, generation-service, and test files.

## Actions Taken

1. Traced the streaming state contract and lifecycle in `src/stores/chatStore.ts`, including initialization, start, token append, segment reset, finalization, and cancellation.
2. Read the pure finalization boundary in `src/stores/chatStoreReplyFinalization.ts` and the persisted-message constructor in `src/stores/chatPersistence.ts`.
3. Read message mutation/sync emission in `src/stores/chatMessageMutationActions.ts` and `src/services/sync/mutation.ts`, plus remote-preview deduplication in `src/screens/ChatScreen/types.ts` and supersession handling in `src/services/sync/supersedeSyncedReplies.ts`.
4. Cross-checked the behavior against generation stop/error paths and focused store/integration tests.

## Findings

### F1 — Mint identity at stream start and carry it through every surface

OGAM puts `streamingMessageUuid` in the store state and explicitly defines it as the UUID under which the reply will be stored, minted before the first token (`specs/context/OGAM-main/src/stores/chatStore.ts:71-84`). `startStreaming` resets the prior forming reply, assigns the conversation, mints the UUID, and enters thinking state (`specs/context/OGAM-main/src/stores/chatStore.ts:324-334`). Finalization passes that same UUID into `addMessage` (`specs/context/OGAM-main/src/stores/chatStore.ts:380-413`); `createPersistedMessage` preserves a supplied UUID while generating only the local `id` fallback (`specs/context/OGAM-main/src/stores/chatPersistence.ts:6-10`).

This creates the invariant “one reply, one identity” before any live frame exists. A Pi Remote implementation should put the durable/wire ID on the generation session at start, expose it in stream events, and require finalization to reuse it. Do not let a receiving device invent a temporary ID and then reconcile it heuristically when the final record arrives.

### F2 — Make the forming-reply reset a typed single source of truth

`StreamingFields` is a `Pick<ChatState, ...>` containing all ephemeral reply fields (`specs/context/OGAM-main/src/stores/chatStore.ts:145-154`). `NO_REPLY_FORMING` is the only cleared value for those fields (`specs/context/OGAM-main/src/stores/chatStore.ts:156-178`), and it is spread into initial state, `startStreaming`, finalization, and clear (`specs/context/OGAM-main/src/stores/chatStore.ts:180-187`, `324-333`, `399-402`, `417-425`). The type makes adding a new streaming field a compile-time obligation: it cannot silently be omitted from one lifecycle branch.

Adopt this as a state-machine contract in Svelte stores or a service projection: define the complete `NoReplyForming` value once, and make every transition use it. Keep the durable conversation/messages collection separate from the forming-reply projection so persistence cannot accidentally serialize live partial state.

### F3 — End ephemeral state before the durable mutation

`finalizeStreamingMessage` first runs the pure finalizer, then clears the ephemeral state and publishes `lastReplyEnd`, and only after that calls `addMessage` (`specs/context/OGAM-main/src/stores/chatStore.ts:380-415`). The pure boundary parses the raw stream once, derives clean answer/reasoning fields, and persists only when the stream belongs to the requested conversation and contains answer or reasoning content (`specs/context/OGAM-main/src/stores/chatStoreReplyFinalization.ts:45-64`). This ordering gives peers an explicit “preview ended; durable record may follow” signal before the record mutation.

The mutation path appends the durable message locally and emits the message and conversation sync mutations (`specs/context/OGAM-main/src/stores/chatStore.ts:288-314`). Message sync keys the entity by `message.uuid` and rejects thinking/runtime-only rows (`specs/context/OGAM-main/src/services/sync/mutation.ts:185-215`). For Pi Remote, the equivalent event ordering should be: `stream_end`/preview retirement, then durable `message_upsert` with the same ID. Receivers should treat the durable upsert as replacement, not a second transcript item.

### F4 — Use an explicit end result to distinguish finalize from orphan cleanup

`ReplyEnd` carries `{ conversationId, persisted }` (`specs/context/OGAM-main/src/stores/chatStoreReplyFinalization.ts:12-22`). A normal finalization sets this from the pure finalizer result even when no record is written (`specs/context/OGAM-main/src/stores/chatStore.ts:393-402`); a clear records `persisted: false` only when a streaming conversation existed (`specs/context/OGAM-main/src/stores/chatStore.ts:417-425`). The peer can therefore retire a preview immediately and know whether to wait for a durable record or treat it as an orphan.

Generation stop/error handling reinforces the distinction: once a conversation is streaming, `keepShownPartialOrClear` always finalizes whatever is shown, including reasoning-only partial output; it calls clear only when there is no streaming conversation (`specs/context/OGAM-main/src/services/generationService.ts:220-243`). This avoids dropping user-visible partial output or leaving a remote preview waiting forever.

### F5 — Preserve identity across multi-segment reasoning/tool flows

`resetStreamingSegment` clears only answer and reasoning buffers, leaving conversation, UUID, and streaming status intact (`specs/context/OGAM-main/src/stores/chatStore.ts:368-370`). The generation helper flushes pending buffers, resets service buffers, and invokes this method when a tool loop starts a new stream segment (`specs/context/OGAM-main/src/services/generationServiceHelpers.ts:182-207`). The focused test verifies the UUID and active streaming state survive the reset (`specs/context/OGAM-main/__tests__/unit/stores/chatStore.test.ts:974-991`).

This is the right model for Pi Remote when a single assistant turn has reasoning, tool-call, and answer segments: segment boundaries reset displayed text, never the turn identity. A final durable row should be created once, at turn finalization.

### F6 — Deduplicate remote previews by the durable identity

The transcript projection builds a set containing both local message IDs and UUIDs, then filters remote previews whose `messageId` is already durable (`specs/context/OGAM-main/src/screens/ChatScreen/types.ts:124-150`). It also rejects a matching remote answer from the same origin device (`specs/context/OGAM-main/src/screens/ChatScreen/types.ts:154-165`). When replacing an in-flight remote reply, `supersedeSyncedReplies` tombstones the preview's message ID before discarding it, preventing a late put from restoring the old reply (`specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:10-27`).

For Pi Remote, make `messageId`/turn ID the deduplication key in the transcript projection and add tombstone or generation-fence handling for replacement/resend. This is stronger than comparing text, timestamps, or array position.

### F7 — Keep live state out of persistence and isolate parser responsibility

The store's persistence test verifies that only conversations and the active conversation are serialized; streaming text, streaming flags, and streaming conversation identity are excluded (`specs/context/OGAM-main/__tests__/unit/stores/chatStore.test.ts:1163-1184`). The finalizer parses model-specific control/reasoning markup once at the boundary (`specs/context/OGAM-main/src/stores/chatStoreReplyFinalization.ts:52-64`), while streaming append strips control tokens before updating the live answer (`specs/context/OGAM-main/src/stores/chatStore.ts:336-357`).

The adoptable rule is to persist only durable transcript state and make the stream session reconstructible/expirable. Parse and sanitize at one boundary so the live projection and durable row cannot disagree because separate renderers each interpreted raw model markup.

## Questions Answered

- **How does OGAM model a single-identity reply?** A UUID is minted at `startStreaming`, exposed in the streaming snapshot, retained through segment resets, reused by the persisted message, and used as the remote preview deduplication key.
- **How are forming fields prevented from leaking?** A typed `Pick<ChatState>` and one `NO_REPLY_FORMING` object drive every reset transition.
- **How are finalization and cancellation distinguished?** `ReplyEnd.persisted` tells peers whether a durable record should arrive; finalize handles shown partials, while clear handles a stream with no conversation/preview to preserve.
- **How are multi-segment turns handled?** Segment reset clears only current text/reasoning and preserves turn identity and active streaming state.
- **What protects persistence?** Live stream fields are excluded from persisted state; only finalized conversation messages enter storage and sync.

## Questions Remaining

- Tool-loop defensive semantics remain to be researched: typed tool outcomes, safe execution, per-turn interruption, retry without tools, streamed-error deduplication, and step ceilings.
- The service-versus-reactive-store ownership boundary needs evidence from the generation/session and compaction services.
- Transcript rendering, remote stream preview transport, and the exact receiver-side retirement protocol need separate UX/architecture passes.

## Next Focus

Iteration 002: Angle 1 [logic] — tool-calling loop crash/race resistance in `src/services/generationToolLoop.ts`, `src/services/tools/types.ts`, `src/services/tools/toolResult.ts`, and `src/services/tools/registry.ts`.

