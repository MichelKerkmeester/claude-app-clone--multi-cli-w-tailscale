# Iteration 001: Session lifecycle over the WebSocket relay

## Focus

Logic patterns for keeping a long-lived remote-agent session consistent across network drops, compaction, history initialization, and token expiry.

## Adoptable patterns

### 1. Classify close codes by recovery semantics

`SessionsWebSocket` treats `4003` as a permanent unauthorized rejection and stops reconnecting, while `4001` is treated as a bounded transient because compaction can temporarily make a session appear missing. The `4001` path gets three retries with increasing 2-second multiples; ordinary connected-session drops get a separate five-attempt reconnect budget. This gives the PWA a concrete recovery policy instead of retrying every failure indefinitely or surfacing compaction as a dead session. [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:17-36] [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:234-287]

### 2. Keep the relay alive with an explicit 30-second ping loop

The transport starts a ping interval after connection, sends a ping only while the socket is connected, ignores ping exceptions, and lets the close handler own recovery. It also clears the interval on every close path. A browser PWA can adopt the same ownership rule around its WebSocket or application-level heartbeat. [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:17-20] [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:130-139] [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:301-323]

### 3. Gate live writes behind the initial history flush

`FlushGate` is a small explicit state machine. While active, new messages are queued; ending the gate returns the queue for ordered draining; permanent teardown drops it; transport replacement deactivates without losing queued items. This prevents a live prompt from arriving between historical messages in the server's session stream. [SOURCE: specs/context/openclaude-android-main/src/bridge/flushGate.ts:1-15] [SOURCE: specs/context/openclaude-android-main/src/bridge/flushGate.ts:28-70]

The bridge starts the gate before connecting, performs the history POST, then drains queued messages only after the flush completes. It also guards the asynchronous flush completion against transport replacement, teardown, and in-flight auth recovery before marking the bridge connected. This is directly adoptable for SvelteKit hydration/reconnect when persisted transcript history must precede newly composed messages. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:391-417] [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:594-622]

### 4. Use bounded UUID deduplication at both directions of the boundary

The bridge tracks recently posted UUIDs in a bounded ring buffer so server echoes of POSTed messages are not rendered twice. It keeps a separate inbound UUID ring for replayed prompts after transport replacement, and retains an unbounded set for initial history UUIDs so a long live stream cannot evict the history identifiers. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:260-280]

Ingress checks posted-message echoes before forwarding and then checks already-forwarded inbound UUIDs. This two-set distinction is useful for a PWA because echo suppression and replay suppression have different ownership and retention requirements. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:126-185]

### 5. Refresh credentials by rebuilding the transport epoch

The bridge schedules refresh five minutes before expiry. It deliberately calls the session-credential endpoint again and rebuilds the transport because each credential request bumps the server epoch; changing only the JWT would leave the old client heartbeating with a stale epoch and produce a conflict. This is an important protocol-level constraint for any remote-agent PWA with server-side connection epochs. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:311-327]

The refresh path uses an `authRecoveryInFlight` latch before fetching credentials, serializing proactive refresh against a simultaneous 401 recovery and preventing two epoch bumps. It also guards stale asynchronous refresh work with per-session generations, retries missing OAuth tokens up to a bounded count, and schedules a follow-up refresh for sessions that remain alive. [SOURCE: specs/context/openclaude-android-main/src/bridge/remoteBridgeCore.ts:328-373] [SOURCE: specs/context/openclaude-android-main/src/bridge/jwtUtils.ts:89-139] [SOURCE: specs/context/openclaude-android-main/src/bridge/jwtUtils.ts:165-229]

### 6. Keep unknown relay message types observable and non-fatal

The WebSocket acceptance predicate requires only an object with a string `type`, explicitly avoiding a hardcoded allowlist that would silently discard new backend message types. Downstream adapters decide how to render or ignore them. This is a forward-compatibility pattern for a PWA that may update less often than its agent backend. [SOURCE: specs/context/openclaude-android-main/src/remote/SessionsWebSocket.ts:46-55]

## Ruled-out directions

- Treating every close as permanent was rejected by the source implementation because compaction creates a recoverable `4001` window.
- Retrying unauthorized `4003` closes was rejected because the source classifies them as definitive server-side rejection.
- Sending live writes concurrently with the initial history POST was rejected because it can reorder the transcript at the server.
- Replacing only an expired JWT was rejected because the server epoch also changes when fresh session credentials are issued.

## New information ratio

`1.0`. This is the first iteration and establishes the lifecycle evidence baseline across all requested submechanisms in the selected angle.

## Next focus

Permission and approval control protocol: request/response deadlines, permission modes, suggestion persistence, and unknown-control handling.
