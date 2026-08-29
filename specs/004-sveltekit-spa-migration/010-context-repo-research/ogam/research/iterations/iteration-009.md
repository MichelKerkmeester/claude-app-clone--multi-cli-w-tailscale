# Iteration 009 — sync-package evidence boundary and receiver retirement

## Focus

Close the remaining question about the shared sync-package producer/receiver lease, sequence window, expiry, and late-frame retirement protocol. The pass rechecked every in-snapshot consumer and test surface that could expose those semantics, without inferring implementation details from the consumer API.

## Actions Taken

- Inventoried `specs/context/OGAM-main` for the shared package and sync-stream symbols; only consumers, adapters, stores, and tests are present.
- Verified the dependency boundary in `specs/context/OGAM-main/package.json:33-40`: `@offgrid/sync` resolves to `file:../shared/packages/sync`, outside the provided OGAM snapshot.
- Read the remote preview projection and its focused tests at `specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:1-29` and `specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:4-105`.
- Read resend replacement ordering at `specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:10-31` and checked the shared preview-row imports in `specs/context/OGAM-main/src/screens/ChatScreen/types.ts:1-10,105-108` and `src/screens/ChatScreen/useChatScreenPreviews.ts` consumer surface.

## Findings

### F1 — The consumer contract confirms snapshots, sequence identity, and service ownership, but not the wire protocol

`ChatStreamPreview` is imported as a shared type and the focused fixture exposes `conversationId`, `messageId`, `content`, `seq`, `deviceId`, `updatedAt`, and `complete` (`specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:1,17-26`). The store accepts a complete replacement array, not an append-only frame log (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:12-29`; `specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:49-61`). This supports an adoptable Pi Remote receiver rule: render the latest snapshot keyed by stable message/turn identity and never concatenate received frames into transcript history.

The test documentation explicitly assigns frames, ordering, and expiry to the Pro chat-stream service, while the store is non-durable and the finished message arrives through the op-log (`specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:4-10`). The production store says the same service owns “frames, ordering, expiry” and that previews vanish after the durable message arrives (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:17-24`). These are confirmed ownership and projection contracts, not evidence of lease duration, sequence acceptance/window width, clock policy, heartbeat, or producer crash recovery.

### F2 — Receiver retirement has a source-backed durable identity and tombstone ordering

The preview’s `messageId` is also its durable record ID. Before discarding a replaced preview, OGAM emits a delete mutation for that ID; the source states that this prevents an in-flight put from restoring the old reply (`specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:10-27`). The focused store test separately verifies that replacing the preview set removes the old snapshot and that an empty set is visible once the finished op-log message arrives (`specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:49-70`).

Adoptable Pi Remote protocol rule: use a stable turn/message ID as the preview and durable-record key; on replacement or resend, record the retirement/tombstone before clearing the preview; reject late writes for retired generations; and treat a durable upsert as replacement of the synthetic preview rather than a second assistant row. This ordering is source-backed at the consumer boundary, while the exact shared package implementation remains unknown.

### F3 — Exact lease, sequence-window, expiry, and late-frame semantics remain UNKNOWN

No file under the OGAM snapshot contains the `@offgrid/sync` package implementation. The manifest points to the absent sibling package (`specs/context/OGAM-main/package.json:37-40`), while the in-tree code only imports its types/functions (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:1-10`; `specs/context/OGAM-main/src/screens/ChatScreen/useChatScreenPreviews.ts:1-20`). Therefore this pass cannot responsibly state a lease interval, producer renewal rule, receiver sequence window, expiry timer, clock source, or behavior for a frame arriving after expiry/tombstone. The correct research result is an evidence boundary, not a guessed default.

## Questions Answered

- **What can be adopted from the available receiver surface?** Confirmed: latest-snapshot projection, stable `messageId`/turn identity, non-durable previews, durable-message replacement, and tombstone-before-discard ordering for resend/replacement.
- **What is the exact shared sync-package lease/sequence/expiry protocol?** Not answered; the implementation is outside the snapshot.

## Questions Remaining

- The exact producer/receiver lease duration, renewal/heartbeat, sequence-window acceptance, expiry clock/timer, and late-frame retirement behavior remain UNKNOWN until `../shared/packages/sync` or an equivalent source snapshot is available.
- The exact SvelteKit/browser persistence mapping for attachments and paired-stream durability remains open.
- The final Pi Remote mapping still needs browser lifecycle and viewport details, but those should be designed against the confirmed projection/tombstone contract rather than invented wire semantics.

## Next Focus

Use the final synthesis pass to map the confirmed OGAM contracts to SvelteKit services, browser stores, and transcript rows. Keep the shared-package lease and sequence values explicitly TBD unless the missing package is supplied.
