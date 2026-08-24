# Iteration 003: Security boundaries and attachment ingestion

## Focus

Transferable controls for authenticating a remote controller, restricting viewers, and safely moving composer files into an agent session.

## Adoptable patterns

### 1. Separate elevated session authentication from ordinary login

Bridge sessions use an elevated security tier and an optional trusted-device token. Enrollment is allowed only within ten minutes of login, and the token has a rolling 90-day lifetime in secure storage. The important PWA pattern is a short enrollment window followed by a durable device credential, with cache clearing on account changes. [SOURCE: specs/context/openclaude-android-main/src/bridge/trustedDevice.ts:15-28] [SOURCE: specs/context/openclaude-android-main/src/bridge/trustedDevice.ts:65-87]

### 2. Keep worker credentials out of user-configurable process context

The work secret is validated for version, non-empty session token, and API base URL before use. Worker registration returns a validated integer epoch, which is then part of the child/session protocol. A web implementation should validate the same credential envelope at its boundary and keep per-session secrets in a closure or server-side session store rather than exposing them to user-configured extensions. [SOURCE: specs/context/openclaude-android-main/src/bridge/workSecret.ts:5-31] [SOURCE: specs/context/openclaude-android-main/src/bridge/workSecret.ts:89-126]

### 3. Treat filenames and attachment metadata as hostile input

The source validates attachment shape, strips path components, filters filenames to a narrow safe character set, and prefixes the stored filename with part of the UUID to prevent collisions. Each fetch/write failure is best-effort and does not discard the user message. These are directly applicable to a PWA upload pipeline and agent-side staging directory. [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundAttachments.ts:31-57] [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundAttachments.ts:65-116]

### 4. Inject attachment references into the effective text block

Resolved paths are quoted so spaces in home directories survive parsing. For multipart content, refs are prepended to the last text block because downstream processing reads the final text block; putting them in the first block can silently lose them when an image precedes text. [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundAttachments.ts:119-160]

### 5. Normalize cross-client content before it reaches the model

Inbound messages accept string or block content, reject empty/non-user messages, and normalize camelCase image metadata into the required snake_case form. This prevents one malformed mobile payload from poisoning every subsequent model call. [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundMessages.ts:11-39] [SOURCE: specs/context/openclaude-android-main/src/bridge/inboundMessages.ts:42-80]

## Ruled-out directions

- Trusting web-composer filenames or paths was rejected because they are network-derived input.
- Making attachment resolution all-or-nothing was rejected because one failed file should not lose the text prompt.
- Injecting refs into a fixed first content block was rejected because downstream processing reads the final text block.

## New information ratio

`0.7`. This adds the security and attachment boundaries, including concrete browser-to-agent trust transitions and multipart edge cases.

## Next focus

Returning-user UX, pairing, live activity, and transcript normalization/forward compatibility.
