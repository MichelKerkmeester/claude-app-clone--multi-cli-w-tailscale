# Research Resource Map

## Documents
- `specs/004-sveltekit-spa-migration/010-context-repo-research/remote-for-opencode/charter.md` — scope, angles, non-goals, and stop conditions.
- `specs/context/remote-for-opencode-master/docs/protocol-v1.md` — typed protocol, upstream mapping, resume, push, diffs, streaming, and version skew.
- `specs/context/remote-for-opencode-master/docs/development.md` — package tests and production-view harness workflow.
- `specs/context/remote-for-opencode-master/docs/design-spec.md` — transcript and interaction design constraints.

## Source Files
- `app/Shared/TurnController.swift` — turn cursor, resume, activity, approvals.
- `packages/RemoteKit/Sources/RemoteKit/Client/CompanionLink.swift` — interruption versus failure and streaming stages.
- `packages/RemoteKit/Sources/RemoteKit/Protocol/PermissionRisk.swift` — pure risk policy.
- `packages/RemoteKit/Sources/RemoteKit/Protocol/SlashInput.swift` — shared command parser.
- `packages/RemoteKit/Sources/RemoteKit/ImageShaping.swift` — attachment shaping.
- `app/Phone/SessionView.swift` — visibility and foreground recovery.
- `app/Phone/PushManager.swift` — notification trust and fallback.
- `app/Shared/Transcript.swift` and `app/Shared/ReasoningBlock.swift` — transcript and reasoning UX.
- `app/Shared/WorkingIndicator.swift` — activity and elapsed-time feedback.
- `app/Phone/PermissionSheet.swift` — approval UX.
- `tools/uiharness/Harness/HarnessApp.swift` — real-view harness.
