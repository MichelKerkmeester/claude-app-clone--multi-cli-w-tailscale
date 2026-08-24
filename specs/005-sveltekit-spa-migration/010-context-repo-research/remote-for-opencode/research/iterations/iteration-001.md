# Iteration 001: Turn Lifecycle

## Findings
- Mint a client turn ID and count every turn event into a cursor. Exclude connection-only `ready`; resume with the same turn ID and cursor so the server replays missed events before live streaming. `app/Shared/TurnController.swift:32-41`, `app/Shared/TurnController.swift:118-147`
- Make replay and live events use the same consumer path. Stable part IDs let snapshot replays upsert instead of duplicate. `app/Shared/TurnController.swift:141-188`
- Distinguish unfinished transport interruption from terminal failure: interruption emits no `done`, while local failure emits `failed` followed by `done`. `packages/RemoteKit/Sources/RemoteKit/Client/CompanionLink.swift:267-289`
- Visibility belongs in the controller contract: an active screen reconnects immediately, while a backgrounded mobile screen waits for foreground resume. `app/Shared/TurnController.swift:37-41`, `app/Phone/SessionView.swift:100-106`
- Treat an unknown turn as an honest reset rather than inventing continuity. `app/Shared/TurnController.swift:171-176`

## PWA Adoption
Use a browser-side turn store with `{turnId, cursor, active, partsById}`. Reconnect with `resume(turnId, from)`; replay through the same reducer as live events; reset visibly when the remote no longer knows the turn. Use page visibility/focus to select reconnect-now versus resume-on-return.

## Ruled Out
Native scenePhase and Swift concurrency syntax do not transfer; the state semantics do.
