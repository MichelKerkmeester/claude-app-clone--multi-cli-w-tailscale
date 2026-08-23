# Iteration 004: Composer, Background Recovery, And Testability

## Findings
- Use one slash parser for palette preview and send. Resolve a command only against the real known list so typos and path-like prose remain prose. `packages/RemoteKit/Sources/RemoteKit/Protocol/SlashInput.swift:5-23`
- Keep the palette above the composer so the keyboard stays open, and state the empty result honestly instead of hiding it. `packages/RemoteKit/Sources/RemoteKit/Protocol/SlashInput.swift:39-48`, `app/Shared/CommandPalette.swift:1-20`
- Shape images before transport and enforce attachment limits at both ends. Downscale/re-encode images, leave non-images intact, and use a smaller transit copy on constrained links. `packages/RemoteKit/Sources/RemoteKit/ImageShaping.swift:6-27`, `packages/RemoteKit/Sources/RemoteKit/ImageShaping.swift:55-85`, `app/MacCompanion/RemoteServer.swift:525-528`
- Push should carry only an opaque record ID. On wake, fetch pending state over the authenticated channel, with a poll fallback; if an answer-in-place request cannot reach the agent, open the app instead of claiming success. `docs/protocol-v1.md:124-137`, `app/Phone/PushManager.swift:72-106`
- Ask for notification permission after pairing proves value, not on first launch. `app/Phone/PushManager.swift:48-60`
- Keep policy in a real package with unit tests, and test UI by compiling actual production views against canned state. `docs/development.md:30-38`, `docs/development.md:52-65`, `tools/uiharness/Harness/HarnessApp.swift:1-7`

## PWA Adoption
Make slash parsing, risk policy, attachment shaping, event reduction, and approval transitions browser-testable pure modules. Keep the command palette in the composer layer. Use generic push/deep-link identifiers and refetch authenticated state on app wake; make notification permission a post-pairing decision.

## Ruled Out
CloudKit and APNs are transport implementations. The transferable pattern is untrusted notification payload plus authenticated refetch and honest failure handling.
