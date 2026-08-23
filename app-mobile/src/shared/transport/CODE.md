# `transport/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`auth.ts`** — `enrollDevice`, `establishSession`, `revokeDevice`, `logoutDevice`, and `scanQrImage`; private keys stay in the device store and requests use same-origin credentials.
- **`relay.ts`** — typed relay operations plus `RelayHeartbeat`, `RelayRequestError`, `ArtifactReadError`, `parseBoundedRetryAfter`, `fetchTranscript`, `readArtifact`, and `openSyncSocket`.
- **`cache.ts`** — `ReadOnlyCache`, `CachedTranscript`, `CachedArtifactMetadata`, `loadCache`, `saveCache`, `stripArtifactResourceState`, and `installCacheRevalidation`.
- **`use-sync-socket.svelte.ts`** — `useSyncSocket`; cache hydration, transcript paging, sync snapshot/delta/gap dispatch, reconnect backoff, plan invalidation, and teardown.

## Do-not

- **Don't treat `ReadOnlyCache` as current authority.** It must never supply runtime state, mode, revisions, tickets, executable plan tokens, or todo projections.
- **Don't persist artifact resources.** `saveCache` stores metadata only; do not add bytes, blobs, object URLs, file handles, or decoded resources to the durable cache.
- **Don't weaken enrollment checks.** Keep same-origin validation, expiry checks, protocol guards, key validation, and the signed challenge flow together in `auth.ts`.
- **Don't use `navigator.onLine` as relay liveness.** The device flag and `getRelayHeartbeat()` answer different questions; preserve both signals.
- **Don't leave a socket lifecycle running after its session effect ends.** Abort the page request, cancel queued frames and retry timers, and close the socket in the `useSyncSocket` cleanup.
