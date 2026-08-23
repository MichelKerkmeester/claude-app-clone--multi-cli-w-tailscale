# Iteration 002: Protocol And Adapter

## Findings
- Keep the mobile contract stable and typed while an adapter translates it to the upstream agent API. The protocol document explicitly maps each v1 kind and records observed skew. `docs/protocol-v1.md:7-10`, `docs/protocol-v1.md:24-30`
- Negotiate capabilities at connection time and let the UI degrade by capability rather than assuming every server feature. `docs/protocol-v1.md:26-30`, `packages/RemoteKit/Sources/RemoteKit/Client/CompanionLink.swift:396-416`
- Detect old/new event names once from the upstream schema and cache the result. Subscribe to both known variants during the compatibility window. `docs/protocol-v1.md:215-224`
- Do not expose upstream command templates to the client. Send command name and arguments; let the adapter/server expand templates. `docs/protocol-v1.md:66-83`
- Model live and durable diffs separately because the live session diff disappears at settle while per-turn message summaries remain reviewable. `docs/protocol-v1.md:140-150`
- Build a message-ID-to-role map before consuming parts, or the user's message can render twice when the upstream sends it over the same event channel. `docs/protocol-v1.md:152-165`

## PWA Adoption
Define a small JSON protocol for chat, resume, permissions, questions, diffs, and capabilities. Hide provider-specific SSE/event names and templates behind a server adapter. Represent `liveDiff` and `turnDiff` as distinct stores and normalize role before rendering.

## Ruled Out
The Mac-specific OpenCode HTTP endpoints are evidence for an adapter boundary, not a browser API contract.
