# Adoptable Patterns From remote-for-opencode-master

Scope: findings for the Pi Remote SvelteKit mobile chat and remote-agent PWA. The sibling repository was read-only. Native implementation details are excluded unless their behavior transfers to the web.

## Executive Recommendation

Adopt four foundations together rather than as isolated UI features:

1. A replayable, cursor-based turn reducer with stable part IDs.
2. A typed protocol and adapter boundary with capability negotiation.
3. Pure, testable policy modules for risk, parsing, shaping, and event reduction.
4. Mobile-first feedback and recovery that stays honest when transport or background execution fails.

## Logic: Resume Exactly Once

Mint a client turn ID and count only turn events. Connection readiness must not advance the cursor. On reconnect, send the same turn ID and `from` cursor; process replayed and live events through one reducer. Upsert by stable part ID so replayed snapshots replace existing rows. `specs/context/remote-for-opencode-master/app/Shared/TurnController.swift:32-41`, `specs/context/remote-for-opencode-master/app/Shared/TurnController.swift:118-188`

Model interruption separately from terminal failure. An interrupted stream has no trailing `done`, so the visible turn remains unfinished and can reconnect. A terminal failure ends the turn; an unknown turn resets honestly and asks the user to resend. `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/Client/CompanionLink.swift:267-289`, `specs/context/remote-for-opencode-master/app/Shared/TurnController.swift:161-176`

Use page visibility/focus as the PWA equivalent of scene phase. Reconnect immediately while the chat is visible; defer until foreground when hidden. `specs/context/remote-for-opencode-master/app/Shared/TurnController.swift:37-41`, `specs/context/remote-for-opencode-master/app/Phone/SessionView.swift:100-106`

Also separate acknowledgement from health. A prompt endpoint can succeed while the actual asynchronous turn later fails, so the UI must wait for lifecycle events rather than treating HTTP success as running state. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:16-20`

## Architecture: Stable Client Contract

Define a small typed JSON contract for `hello`, capabilities, prompt, resume, permission, question, diff, transcript, and pending state. Keep upstream HTTP/SSE event names in a server-side adapter. The sibling documents each v1 kind independently from OpenCode calls, which makes the mobile surface stable while upstream details change. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:7-10`, `specs/context/remote-for-opencode-master/docs/protocol-v1.md:24-49`

Negotiate capabilities on connect and render only supported controls. Detect upstream event-name skew once from the schema and cache it. Subscribe to old and new variants during compatibility windows. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:26-30`, `specs/context/remote-for-opencode-master/docs/protocol-v1.md:215-224`

Do not send command templates to the browser. Send a known command name and arguments; let the adapter expand templates. This prevents upstream template syntax and multi-kilobyte prompt bodies from becoming client coupling. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:66-83`

Keep live and durable diff state distinct. Live diffs answer what the agent is changing now; durable per-turn diffs support later review after the live session settles. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:140-150`

Normalize roles before parts reach the UI. The upstream sends user and agent parts over the same stream, so build a message-ID-to-role map first or the user's prompt renders twice. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:152-165`

## UX: Safe Steering And Honest Progress

Classify approval risk in pure code. Low-risk reads and in-project edits can be quieter; destruction, privilege, network access, and paths outside the project should be high risk; unknown actions should not silently become low risk. `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/Protocol/PermissionRisk.swift:3-12`, `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/Protocol/PermissionRisk.swift:26-42`

Turn rejection into steering. Show the exact command and scope, separate Reject from Allow spatially, make "always" state its scope, confirm it in a second step, and omit blanket grants for high-risk asks. `specs/context/remote-for-opencode-master/app/Phone/PermissionSheet.swift:70-97`, `specs/context/remote-for-opencode-master/app/Phone/PermissionSheet.swift:115-147`

Authenticate only grants, never declines. A browser cannot use native biometrics directly, but the same boundary can be implemented with a user gesture plus WebAuthn or an equivalent authenticated approval endpoint. `specs/context/remote-for-opencode-master/app/Shared/TurnController.swift:193-205`

Tell users what the agent is doing. Derive activity from the newest meaningful part and use labels such as Reading files, Editing files, Running a command, or Searching the project. Escalate copy over time instead of leaving a static spinner. `specs/context/remote-for-opencode-master/app/Shared/WorkingIndicator.swift:72-107`

Use a heartbeat-like liveness cue and flush buffered deltas on idle. Upstream snapshots are not token streams; accumulate deltas per part ID, throttle forwarding to about ten updates per second, and flush the final text when idle. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:167-193`

Structure the transcript through spacing and asymmetry rather than chat bubbles on both sides. Inset/tint user content, keep agent and tool output full-width, and make turn spacing materially larger than within-turn spacing. `specs/context/remote-for-opencode-master/app/Shared/Transcript.swift:7-10`, `specs/context/remote-for-opencode-master/app/Shared/Transcript.swift:65-102`

Render reasoning as live, settled, and expanded. Cap and auto-scroll it while active, collapse it when settled, and preserve deliberate expansion. `specs/context/remote-for-opencode-master/app/Shared/ReasoningBlock.swift:6-17`, `specs/context/remote-for-opencode-master/app/Shared/ReasoningBlock.swift:48-125`

## Ease Of Use: Composer And Background Recovery

Use one slash parser for palette filtering and sending. Resolve only commands present in the known command list; unknown slash input remains ordinary prose instead of becoming an opaque server error. Keep the palette above the composer and show an honest no-match state. `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/Protocol/SlashInput.swift:5-23`, `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/Protocol/SlashInput.swift:39-48`, `specs/context/remote-for-opencode-master/app/Shared/CommandPalette.swift:1-20`

Shape images before upload and enforce size limits on both client and server. Downscale and re-encode images, preserve non-image attachments, and use a smaller transit copy on constrained paths. `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/ImageShaping.swift:6-27`, `specs/context/remote-for-opencode-master/packages/RemoteKit/Sources/RemoteKit/ImageShaping.swift:55-85`, `specs/context/remote-for-opencode-master/app/MacCompanion/RemoteServer.swift:525-528`

Treat notifications as wake-up hints, not trusted state. Carry only an opaque record/deep-link ID, refetch pending approvals over the authenticated channel, and fall back to polling on wake. If an in-place answer cannot be confirmed, open the app and say nothing was decided. `specs/context/remote-for-opencode-master/docs/protocol-v1.md:124-137`, `specs/context/remote-for-opencode-master/app/Phone/PushManager.swift:72-106`

Ask for notification permission after pairing or another clear value moment. `specs/context/remote-for-opencode-master/app/Phone/PushManager.swift:48-60`

## Architecture And Logic: Test Seams

Keep policy separate from plumbing. The sibling puts framing, permissions, slash parsing, and diff modeling in a shared package with unit tests, while I/O stays in adapters. This maps directly to pure TypeScript modules plus contract tests in the PWA. `specs/context/remote-for-opencode-master/docs/development.md:30-38`

Build a harness around production views, not lookalike mock screens. Feed canned transcript, permission, patch, and planning states into the real Svelte components so visual regressions exercise what ships. `specs/context/remote-for-opencode-master/docs/development.md:52-65`, `specs/context/remote-for-opencode-master/tools/uiharness/Harness/HarnessApp.swift:1-7`, `specs/context/remote-for-opencode-master/tools/uiharness/Harness/HarnessApp.swift:48-124`

## Transfer Boundary

Adopt behavior and state contracts, not SwiftUI, CloudKit, APNs, UDP punching, native biometrics, or iOS scene APIs. The portable core is: replayable events, stable IDs, capability-aware rendering, pure policy, authenticated refetch, visibility-aware reconnect, explicit approval scope, and production-view harnessing.
