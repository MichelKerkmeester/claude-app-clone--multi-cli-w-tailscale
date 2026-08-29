# Iteration 13: Copy-code — editor fence button vs chat whole-message copy

## Focus
Our gap: "copy-code lives only in the artifact viewer". Does orca native-chat copy fenced code in-bubble, or only whole-message / editor?

## Actions Taken
- Read Electron `NativeChatCopyButton.tsx` and `NativeChatMessageList.tsx` `proseToMarkdown`.
- Read `CodeBlockCopyButton.tsx` (rich markdown **editor**).
- Confirmed `MobileMarkdown.tsx` has no copy-fence control; chat copy is `nativeChatMessageText`.

## Findings

### F-ITER013-MSG Native-chat copy is **whole-message prose**, not per-fence
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx:6:12]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatMessageList.tsx:28:38]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-message-text.ts:4]

Desktop copies joined text blocks; skips tools/images. Mobile comment: "Copy is for the agent's prose." Icon swap 1500ms desktop / 700ms mobile, no toast.

**UX to copy:** we already Copy/Share per answer. Portable: copy **rendered host text**, fail-closed if the host omitted blocks.
**Verdict:** **drop-in** (already shipped). Does **not** close the fenced-code gap.

### F-ITER013-FENCE Per-fence Copy lives on the **editor** `CodeBlockCopyButton`, not native-chat
[SOURCE: specs/context/orca-main/src/renderer/src/components/editor/CodeBlockCopyButton.tsx:1:12]
[SOURCE: specs/context/orca-main/src/renderer/src/components/editor/CodeBlockCopyButton.tsx:36:40]

Walks React children under `<pre><code>` for plain text. Clipboard via Electron IPC.

**UX to copy:** a hover/tap Copy on each fenced block in **markdown we already render**. That is a view affordance over the same host text we show in the artifact viewer.
**Constraint map:** copying bytes already on screen is not new session truth. Do not fetch extra file contents to fill a fence.
**Verdict:** adding in-transcript fence copy → **drop-in view affordance**. Orca native-chat itself does **not** ship it; the editor does. Port the **editor** pattern into chat markdown, not a native-chat widget.

### F-ITER013-MD Mobile `MobileMarkdown` has path taps and mermaid, no copy-fence
[SOURCE: specs/context/orca-main/mobile/src/components/MobileMarkdown.tsx:19:30]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileMarkdownReader.tsx:70:136]

Chat markdown: `onOpenFile` for path spans. Whole-doc Copy only on **read-only markdown files** (`MobileMarkdownReader` when `!editable`).

**UX to copy:** tappable file paths in agent prose (needs host open-file / our artifact viewer). Whole-doc Copy for read-only artifacts we already have.
**Verdict:** path-as-link → **drop-in** if we already open artifacts by path; else **needs host RPC**. Per-fence copy still absent on mobile chat.

## Questions Answered
Remainder of q-message-level-chat: copy-code is editor-not-chat in orca; chat is whole-message.

## Ruled Out
- Treating orca native-chat as having per-fence copy-code (it does not).

## Dead Ends
- Grep `copyFence` / `Copy code` under `mobile/src/session` — no matches.

## Sources Consulted
- specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx:6
- specs/context/orca-main/src/renderer/src/components/editor/CodeBlockCopyButton.tsx:1
- specs/context/orca-main/mobile/src/components/MobileMarkdown.tsx:19

## Assessment
- newInfoRatio: 0.64
- noveltyJustification: Distinguishes editor fence-copy from chat message-copy; directly answers the copy-code gap.
- confidence: high.

## Reflection
- What worked and why: Following `CommentMarkdown` vs `RichMarkdownCodeBlock` split avoided a false "orca copies fences in chat".
- What did not work and why: Expected mobile chat markdown to grow a copy chip.
- What I would do differently: Next, in-chat rename/pin/archive chrome vs slash catalog.

## Recommended Next Focus
In-chat conversation actions: `/rename` `/archive` `/new` `/fork` as CLI catalog strings, not in-app metadata chrome.
