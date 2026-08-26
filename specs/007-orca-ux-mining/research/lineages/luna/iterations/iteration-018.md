# Iteration 18: Rich message content, file links, and readability

## Focus

Inspect Orca's role-aware native-chat message rendering and file-link routing for portable chat readability improvements, with special attention to host-owned artifacts and local paths.

## Findings

### F-LUNA-018-A — Separate prose, role, tools, and copy affordances in message rows

**Orca file/pattern:** `mobile/src/session/MobileNativeChatMessage.tsx:244-275,277-337` exposes Copy and scroll-to-message controls, applies a distinct user bubble and reasoning treatment, and calls `splitNativeChatBlocks` so tool activity can fold below agent prose. `src/renderer/src/components/native-chat/native-chat-message-grouping.ts:21-46,48-117` provides deterministic grouping for adjacent message blocks.

**Copy:** In the Svelte transcript, keep role-aware user/agent/reasoning styling, place Copy and “jump to this turn” actions on the message row, and fold verbose tool runs behind a bounded disclosure. Copy only rendered message prose or an explicitly selected block, with a transient confirmation and keyboard/screen-reader label.

**Constraint mapping:** These are view transformations over the settled transcript. The row must be keyed by the host message/block identity and discarded on session or epoch change. Tool fold state, copied state, and scroll position may be local; the underlying content, status, and artifact links remain host-provided. If a rich block is incomplete or scope-mismatched, render a neutral placeholder and do not synthesize a success state.

**Verdict:** `drop-in view affordance` for role styling, copy, scroll-to-turn, and bounded tool disclosure.

### F-LUNA-018-B — Treat file links and rich media as authorized host routes

**Orca file/pattern:** `src/renderer/src/components/native-chat/native-chat-file-link.ts:60-117` resolves a link only after finding the terminal-tab worktree context, a known worktree path, and an explicit parsed target; unresolved or context-free links return null. `mobile/src/session/MobileNativeChatMessage.tsx:277-337` accepts an `onOpenFile` callback rather than opening paths itself.

**Copy:** Render image/file/artifact references as explicit cards or links with unavailable and loading states. Route a tap to the existing artifact viewer only when the host has supplied a stable artifact reference or authorized file target for the current session; otherwise keep the reference inert and explain that it is unavailable.

**Constraint mapping:** A markdown path, local URI, or image URL is not permission. File opening, image fetch, and artifact download must go through a host-authorized, session-scoped route and re-check epoch/revision at dispatch. The read-only cache may retain safe artifact metadata but must not turn a local path into an executable or writable target.

**Verdict:** `drop-in view affordance` for explicit unavailable/loading states and host-routed cards; arbitrary local file opening is `not portable`, while a new authorized artifact reference would `need a new host field`.

## Negative knowledge

- Orca's file-link resolver is not a license to open arbitrary paths from chat text.
- Tool folding is portable; tool execution, artifact mutation, and path resolution are not client-owned.
- No evidence was found for copying native-chat regenerate/edit/reply/reaction semantics; these remain gaps, not inferred Orca patterns.

## Questions answered

- Message-level copy, scroll, role styling, and bounded tool groups are concrete portable chat improvements.
- Rich media can be presented safely only through existing host-authorized artifact contracts; raw paths and URLs are not portable.

## SCOPE VIOLATIONS

None.

## Assessment

- newInfoRatio: 0.57
- Novelty: identifies the portable message-row affordances while separating them from Orca's host-specific local-file routing.
- Status: complete

## Next Focus

Executable contract audit and a minimal host-field priority bundle.

[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:244-275,277-337]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-message-grouping.ts:21-46,48-117]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-file-link.ts:60-117]
[SOURCE: app-mobile/src/shared/transport/cache.ts:147-185]
[SOURCE: app-mobile/src/pages/chat/README.md:45-47,91-92]
