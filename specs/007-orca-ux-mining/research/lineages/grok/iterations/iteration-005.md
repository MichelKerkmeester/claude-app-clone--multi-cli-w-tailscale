# Iteration 5: Native-chat message-level copy, turn nav, tool fold; no regen

## Focus
Orca mobile native-chat per-message affordances: copy, scroll-this-message-to-top, collapsible tool runs, user vs agent chrome. Confirm presence or absence of reply/quote, edit-and-resend, regenerate/retry, long-press menu, in-conversation search.

## Actions Taken
- Read `MobileNativeChatMessage.tsx` (controls, copy, tool fold, roles).
- Read `MobileNativeChatView.tsx` props (streaming, pending, working, stop, pinch).
- Grepped `mobile/src/session` for regenerat/editAndResend/replyTo/ContextMenu/longPress/setTitle — no message-menu hits; `setTitle` is PR title only.

## Findings

### F-ITER005-COPY Agent messages get copy + scroll-to-top; copy tints the bubble 700ms
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:244:338]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-message-text.ts]

`AgentControls`: Copy (clipboard prose via `nativeChatMessageText(blocks)`) and optional ArrowUp (`onScrollToMessage(index)` aligns the message top to the viewport). User bubbles have **no** controls. Copy success is a brief `copied` style, not a toast.

**UX to copy:** per-answer copy on the bubble, not only in an artifact viewer; scroll-this-turn-to-top as cheap per-turn nav; visual copy confirm.
**Constraint map:** copying **already-rendered** host transcript text is a view affordance (we already Copy/Share per answer). Scroll-to-index is list interaction. Do not copy redacted/unavailable blocks if the host omitted them — fail-closed already applies.
**Verdict:** bubble copy + copy flash + scroll-turn-to-top → **drop-in view affordance**. Our gap "copy-code lives only in the artifact viewer" is specifically **in-bubble copy of prose** (orca does that) vs fenced-code copy (orca's markdown renderer / tool diff, not a dedicated copy-code button on every fence).

### F-ITER005-TOOLS Tool calls fold into expandable runs, not boxed evidence groups
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:46:134]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:309:368]

`splitNativeChatBlocks` separates prose from tools. Tools render as `▸ ToolName preview` lines, expand in place to diff/input/result, cap visible pairs at 6, file-path preview is a nested open-file tap that does not toggle expand. A global expand key remounts to reset per-line state.

**UX to copy:** we already have collapsible evidence groups; the portable bit is **flat tool lines in the turn** plus independent file-open vs expand, and a global expand/collapse.
**Constraint map:** pure layout over host tool blocks already in the transcript.
**Verdict:** **drop-in view affordance** (layout). Opening a repo file from a tool path → **needs a new host field/RPC** unless we already have artifact viewer for that path.

### F-ITER005-ABSENT No regenerate, reply/quote, edit-and-resend, long-press menu, or in-chat search in native-chat
[SOURCE: grep mobile/src/session: regenerat|editAndResend|replyTo|ContextMenu — no matches]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-pr-title-action.ts:54]

Native-chat messages do not expose those verbs. `setTitle` in session/ is PR title, not chat rename.

**UX implication:** orca is **not** the source to copy for reply/quote/edit/regen menus — they are our gaps, not orca native-chat features. Inventing them "because ChatGPT has them" would not be an orca port.
**Constraint map:** edit-and-resend and regenerate are **host operations** (new turns / fork identity). Even if we add them later, they need host RPCs and reconciliation, not client-owned message mutation.
**Verdict:** using orca native-chat as the template for those menus → **not portable** (they are absent). Adding them ourselves → **needs a new host field/RPC**, out of orca-copy scope.

### F-ITER005-PINCH Font scale / pinch-to-zoom is a view affordance
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:23]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:287:288]

`fontScale` multiplies chat text; pinch gesture lives in `use-mobile-native-chat-pinch-gesture`.

**Verdict:** **drop-in view affordance**. Not a ranked gap, but cheap a11y.

### F-ITER005-ROLES User bubble inverted; reasoning styled separately; agent is default
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:295:347]

Roles: user (inverted bubble), reasoning (dim), agent (prose + tools).

**UX to copy:** we already distinguish user/assistant; reasoning-as-dim is a layout port if the host emits a reasoning role.
**Verdict:** styling → **drop-in**. Reasoning role → **needs a new host field** if our transcript lacks it.

## Questions Answered
- [x] q-message-level-chat (native-chat surface): copy + turn-scroll exist; regen/reply/edit/search do not.

## Questions Remaining
- Electron/desktop native-chat menus may still differ — check renderer native-chat next if a later iteration needs parity.
- Composer, streaming, session nav.

## Ruled Out
- Use orca native-chat as source for reply/quote/edit/regen menus: those verbs do not exist there.
- Client-side Set Title from a message menu: orca's setTitle here is PR title, and session title is host-owned.

## Dead Ends
- Hunting a long-press ContextMenu on `MobileNativeChatMessage` — controls are always-visible icon buttons, not a menu.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:244
- specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:42
- specs/context/orca-main/mobile/src/session/use-mobile-pr-title-action.ts:54
- specs/context/orca-main/src/shared/native-chat-tool-fold (imported)

## Assessment
- newInfoRatio: 0.86
- noveltyJustification: First native-chat message pass; confirmed absence of regen/reply/edit-and-resend and presence of copy + turn-scroll + tool-fold.
- confidence: high for mobile native-chat; desktop chat menus not fully grepped.

## Reflection
- What worked and why: Absence greps are negative knowledge and belong in Ruled Out.
- What did not work and why: Looking for ChatGPT-style message menus in orca — the product chose always-visible copy instead.
- What I would do differently: Next, composer attachments/@/slash/dictation, which the view already wires.

## Recommended Next Focus
Native-chat composer: image attachments, clipboard paste, @file autocomplete, slash catalog, dictation hold vs toggle, send lock, image-only send.
