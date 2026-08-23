# OpenClaude Android Pattern Mining

## Verdict

The strongest Pi Remote adoption candidates are not platform-specific UI details. They are protocol boundaries that make a mobile remote-agent client recoverable, honest about authority, safe with untrusted inputs, and understandable during background/reconnect states.

## Adoptable Patterns

### Reliability and ordering

- Classify WebSocket close codes by recovery semantics: permanent unauthorized `4003`, compaction-transient `4001` with a three-retry budget, and bounded retries for ordinary drops. [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:17-36] [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:234-287]
- Use a 30-second ping loop owned by the transport and clear it on close. [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:301-323]
- Gate live writes until initial history has flushed, then drain them in order. Guard flush completion against transport replacement, teardown, and auth recovery. [SOURCE: specs/context/openclaude-android-main/src/bridge/flushGate.ts:28-70] [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:391-417]
- Keep separate bounded UUID sets for posted echoes and replayed inbound prompts, while retaining initial-history UUIDs. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:260-280] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:162-185]
- Refresh by rebuilding session transport credentials when the server epoch changes. Serialize proactive refresh and 401 recovery with a latch, and invalidate stale async refreshes with generations. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:311-373] [SOURCE: specs/context/openclaude-android-main/src/bridge/jwtUtils.ts:89-139]

### Control and authority

- Treat every server control request as requiring a correlated response. Return explicit errors for unsupported subtypes so the server does not hang. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:234-242] [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:187-213]
- Store pending permission requests by request ID and return `allow` with updated input or `deny` with a message. [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:187-198] [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:244-281]
- Model “always allow” as structured, destination-scoped permission updates, including rules, modes, and directories. [SOURCE: specs/context/openclaude-android-main/src/entrypoints/sdk/controlSchemas.ts:106-121] [SOURCE: specs/context/openclaude-android-main/src/types/permissions.ts:81-130]
- Carry viewer/outbound-only authority into the session manager, not only the UI. Mutable requests should return an explicit unsupported error while initialization still succeeds. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:212-232] [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:50-62]

### Security and inputs

- Use short-window trusted-device enrollment followed by secure, rolling device credentials, with cache clearing across account switches. [SOURCE: specs/context/openclaude-android-main/src/bridge/trustedDevice.ts:15-28] [SOURCE: specs/context/openclaude-android-main/src/bridge/trustedDevice.ts:65-87]
- Validate credential envelopes and epochs at the session boundary. Keep worker credentials out of user-configurable extension environments. [SOURCE: specs/context/openclaude-android-main/src/bridge/workSecret.ts:5-31] [SOURCE: specs/context/openclaude-android-main/src/bridge/workSecret.ts:89-126]
- Treat attachment metadata as hostile: validate shape, sanitize basename, UUID-prefix stored names, quote paths, and make each attachment best-effort. [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundAttachments.ts:31-57] [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundAttachments.ts:98-133]
- Normalize mobile payload variants before model ingestion, especially image metadata casing. [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundMessages.ts:42-80]

### UX and rendering

- Pair with one URL and a QR fallback. Keep direct-connect configuration to server URL, session ID, WebSocket URL, and optional bearer token. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeStatusUtil.ts:38-58] [SOURCE: specs/context/openclaude-android-main/src/server/directConnectManager.ts:13-18]
- Distinguish ready/idle, active, reconnecting, and failed states with action-oriented copy. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeStatusUtil.ts:113-154]
- Add an idempotent away summary after five minutes, defer it until a turn ends, cancel it on focus, and constrain it to one to three sentences from recent context. [SOURCE: specs/context/openclaude-android-main/src/hooks/useAwaySummary.ts:25-31] [SOURCE: specs/context/openclaude-android-main/src/hooks/useAwaySummary.ts:83-123] [SOURCE: specs/context/openclaude-android-main/src/services/awaySummary.ts:14-23]
- Normalize SDK streams behind an adapter, suppress successful-result noise, detect tool results by content shape, and ignore unknown event types without breaking the session. [SOURCE: specs/context/openclaude-android-main/src/remote/sdkMessageAdapter.ts:176-214] [SOURCE: specs/context/openclaude-android-main/src/remote/sdkMessageAdapter.ts:217-275]

## Adoption Order

1. Transport recovery, flush ordering, UUID deduplication, and auth epoch rebuild.
2. Control-request correlation, permission scopes, and viewer authority.
3. Attachment/input normalization and transcript adapter.
4. URL/QR pairing, state copy, and away summaries.

## Research Status

Converged after 5 iterations. Iteration 5 new-information ratio: `0.03` against threshold `0.05`. Target repository remained read-only.
