# Iteration 002: Permission and approval control protocol

## Focus

Architecture patterns for remote tool approval, permission modes, and server-initiated control requests.

## Adoptable patterns

### 1. Treat every control request as a request requiring a protocol response

The bridge documents that missing a response causes the server to hang and kill the WebSocket after roughly 10 to 14 seconds. It responds to lifecycle and turn-control subtypes, and returns an explicit error for unsupported permission-mode contexts instead of reporting false success. A PWA should centralize this response obligation and expose a visible timeout/error state rather than silently dropping an unfamiliar request. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:234-242] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:328-359]

`RemoteSessionManager` applies the same rule to unknown control request subtypes, immediately sending an error response so the server cannot wait indefinitely. [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:187-213]

### 2. Preserve pending permission requests by request ID

When `can_use_tool` arrives, the manager stores the request under `request_id` and forwards it to the UI. A response must find that pending entry, delete it, and then send a correlated control response containing either `allow` plus `updatedInput` or `deny` plus a message. This gives the PWA deterministic modal ownership and prevents stale prompts from answering a later tool request. [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:187-198] [SOURCE: specs/context/openclaude-android-main/src/remote/RemoteSessionManager.ts:244-281]

### 3. Make permission suggestions first-class data, not UI-only hints

The `can_use_tool` schema carries optional `permission_suggestions`, blocked path, decision reason, display metadata, tool-use ID, and description. Permission updates support add/replace/remove rules, set mode, and add/remove directories, each with an explicit persistence destination. This is the transferable foundation for an “Always allow” affordance that can be scoped to a tool, project, session, or directory instead of being a single unsafe boolean. [SOURCE: specs/context/openclaude-android-main/src/entrypoints/sdk/controlSchemas.ts:106-121] [SOURCE: specs/context/openclaude-android-main/src/types/permissions.ts:81-130]

### 4. Expose a small, explicit permission-mode set

The external runtime modes are `acceptEdits`, `bypassPermissions`, `default`, `dontAsk`, and `plan`. Keeping this set explicit makes mode changes serializable and lets the PWA render mode-specific warnings and confirmation behavior. [SOURCE: specs/context/openclaude-android-main/src/types/permissions.ts:16-29]

### 5. Distinguish outbound-only sessions from controller sessions

In outbound-only mode, mutable requests return a clear error while `initialize` still succeeds because the server requires that handshake response to keep the connection alive. This avoids presenting a false success state to a viewer or mirror. [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:212-232] [SOURCE: specs/context/openclaude-android-main/src/bridge/bridgeMessaging.ts:265-283]

## Ruled-out directions

- Silently ignoring unknown control subtypes was rejected because it leaves the server waiting until the socket is killed.
- Treating “always allow” as an unscoped client boolean was rejected in favor of structured rule and directory updates with destinations.
- Returning success when a permission-mode callback is unavailable was rejected because it lies about whether the policy was applied.

## New information ratio

`0.8`. This iteration adds a distinct control-plane model and maps the request correlation, persistence, and viewer restrictions needed by the PWA.

## Next focus

Security boundaries and attachment ingestion: trusted-device enrollment, token isolation, viewer restrictions, and safe file references.
