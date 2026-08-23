# Iteration 004: Returning-user UX, pairing, and transcript normalization

## Focus

Ease-of-use patterns for attaching a client, showing activity, helping backgrounded users catch up, and rendering an evolving stream protocol.

## Adoptable patterns

### 1. Make pairing a URL-first flow with a QR fallback

The bridge derives an idle connect URL from an environment ID and a session URL after attachment. The UI renders a QR code for the current URL and keeps the URL available as a clickable/text fallback. This is a low-friction PWA handshake: one URL payload should contain the session identity and route the user into the mobile app/web client. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeStatusUtil.ts:38-58] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeUI.ts:30-40] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeUI.ts:139-148]

Direct connect keeps the minimum client configuration explicit: `serverUrl`, `sessionId`, `wsUrl`, and optional bearer token. Session creation validates the server response before returning that config. [SOURCE: specs/context/openclaude-android-main/src/server/directConnectManager.ts:13-18] [SOURCE: specs/context/openclaude-android-main/src/server/createDirectConnectSession.ts:18-24] [SOURCE: specs/context/openclaude-android-main/src/server/createDirectConnectSession.ts:71-87]

### 2. Surface idle, active, reconnecting, and failed states in user language

The source distinguishes idle and active footer copy, uses a connecting spinner, and exposes explicit reconnecting/failed labels. A mobile PWA should show whether the agent is ready, actively working, reconnecting, or permanently failed rather than reducing all transport states to a generic online dot. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeStatusUtil.ts:113-154] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeUI.ts:151-176] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeUI.ts:198-212]

### 3. Generate an idempotent “while you were away” recap

After five minutes blurred, the hook generates a short recap only when no turn is active and no recap exists since the last user turn. It defers generation if the timer fires mid-turn, cancels in-flight generation on focus, handles already-blurred mount state, and treats unknown focus state as a no-op. These guards prevent duplicate or mistimed notifications in a backgrounded PWA. [SOURCE: specs/context/openclaude-android-main/src/hooks/useAwaySummary.ts:25-31] [SOURCE: specs/context/openclaude-android-main/src/hooks/useAwaySummary.ts:69-123]

The summary prompt is intentionally constrained to one to three sentences, a high-level task, and the concrete next step, using only a recent message window. This is a useful attention budget for mobile catch-up. [SOURCE: specs/context/openclaude-android-main/src/services/awaySummary.ts:14-23] [SOURCE: specs/context/openclaude-android-main/src/services/awaySummary.ts:29-56]

### 4. Normalize raw SDK events behind a render adapter

The adapter maps assistant, stream, result, system initialization/status/compaction, and tool-progress events into internal render messages. It suppresses successful result noise, keeps error results, and logs/ignores unknown message types rather than crashing. This boundary lets the PWA's transcript model stay stable while the agent backend evolves. [SOURCE: specs/context/openclaude-android-main/src/remote/sdkMessageAdapter.ts:21-26] [SOURCE: specs/context/openclaude-android-main/src/remote/sdkMessageAdapter.ts:217-275]

The adapter detects tool results by content shape rather than `parent_tool_use_id`, because the latter is not reliable for top-level tool results. That is a concrete compatibility rule for rendering remote tool activity correctly. [SOURCE: specs/context/openclaude-android-main/src/remote/sdkMessageAdapter.ts:176-214]

### 5. Give viewer mode an explicit non-mutation contract

`viewerOnly` is modeled in session configuration and disables interrupt behavior, reconnect timeout behavior, and title updates. This is preferable to hiding buttons alone: the transport/session manager itself carries the authority boundary. [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:50-62]

## Ruled-out directions

- Pairing that requires manually entering multiple transport fields was rejected by the URL/QR flow and direct-connect config boundary.
- A single generic connection indicator was rejected because idle, active, reconnecting, and failed states have different user actions.
- Generating an away recap on every blur or while a turn is active was rejected by the idempotence and deferral guards.
- A hardcoded event allowlist and successful-result rendering were rejected because they either break forward compatibility or add transcript noise.

## New information ratio

`0.6`. This completes the charter's ease-of-use, UX, and transcript-normalization angles with direct source evidence.

## Next focus

Synthesis and convergence check across all charter angles.
