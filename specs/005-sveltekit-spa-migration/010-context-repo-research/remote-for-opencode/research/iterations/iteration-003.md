# Iteration 003: Approval And Conversation UX

## Findings
- Put permission classification in shared pure policy code. Low-risk reads and in-project edits differ from high-risk destruction, privilege, network, or out-of-project paths; unknown cases default medium. `packages/RemoteKit/Sources/RemoteKit/Protocol/PermissionRisk.swift:3-12`, `packages/RemoteKit/Sources/RemoteKit/Protocol/PermissionRisk.swift:26-42`
- Make rejection a steering path, not a dead end. Separate Reject spatially from Allow, require a second confirmation for broad "always" scope, and remove blanket grants for high risk. `app/Phone/PermissionSheet.swift:115-147`
- Authenticate granting but never declining. The approval controller gates non-reject replies before sending them. `app/Shared/TurnController.swift:193-205`
- Name current work with tool-specific plain-English activity and escalate wording over time; a heartbeat communicates liveness without a mechanical spinner. `app/Shared/WorkingIndicator.swift:4-17`, `app/Shared/WorkingIndicator.swift:72-107`
- Use spacing and voice asymmetry instead of divider-heavy bubbles. User content is inset/tinted; agent content is full-width so tools remain framed as agent output. `app/Shared/Transcript.swift:7-10`, `app/Shared/Transcript.swift:65-102`
- Give reasoning three states: capped auto-scrolling live view, settled summary, and deliberate expanded view. `app/Shared/ReasoningBlock.swift:6-17`, `app/Shared/ReasoningBlock.swift:88-125`

## PWA Adoption
Implement risk classification and approval transition logic as pure TypeScript modules. Render a non-dismissible mobile approval surface with explicit scope, a steering input, and authenticated grant action. Use visible activity labels, elapsed-time copy, and a capped collapsible reasoning block.

## Ruled Out
SwiftUI presentation APIs and biometric APIs are not portable; the state transitions, hierarchy, and authentication boundary are.
