# Deep Research Strategy

## Topic
Mine the read-only sibling app for patterns adoptable by the Pi Remote SvelteKit mobile chat and remote-agent PWA.

## Key Questions
- How should a browser client resume a turn after socket loss without duplicating streamed parts?
- Which typed protocol and adapter boundaries absorb upstream agent API churn?
- Which approval, activity, transcript, composer, and background recovery patterns improve mobile usability and safety?
- Which policy and UI-harness seams make these behaviors testable without a live agent?

## Non-Goals
- Do not modify specs/context/**.
- Do not recommend native-only implementation details unless the behavior transfers to a web PWA.
- Do not implement any finding in this research packet.

## Stop Conditions
- Stop at convergence below 0.05 new information ratio or at 10 iterations.

## Known Context
- Charter directs eight angles: reconnect logic, typed protocol, risk-scaled approvals, working feedback, transcript structure, slash commands and attachments, policy/test seams, and background push recovery.
- Evidence source is limited to specs/context/remote-for-opencode-master and is cited by file and line.

## What Worked
- Focused Grep over charter vocabulary located the shared controller, wire protocol, adapter, and mobile views quickly.
- Read the protocol document alongside implementation to separate intended contract from UI rendering details.

## What Failed / Ruled Out
- Native CloudKit, biometrics, SwiftUI, and UDP punching were not treated as PWA patterns; only their transferable trust and recovery behaviors were retained.

## Next Focus
Converged. Synthesize findings into research.md.
