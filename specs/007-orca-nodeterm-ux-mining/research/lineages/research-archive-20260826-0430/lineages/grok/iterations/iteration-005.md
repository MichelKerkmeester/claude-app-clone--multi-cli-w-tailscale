# Iteration 5: Native-chat message-level affordances (copy, turn nav, tools; no regen)

## Focus
What orca actually offers **per message** in Electron native-chat and mobile `MobileNativeChatMessage`, versus our chat gaps (long-press menu, reply/quote, edit-and-resend, regenerate, in-conversation search, copy-code).

## Actions Taken
- Read `use-native-chat-context-menu.tsx`, `NativeChatCopyButton.tsx`, `NativeChatMessageList.tsx` AgentControls + typing indicator, `native-chat-message-grouping.ts`.
- Read `MobileNativeChatMessage.tsx` (tool fold, copy, scroll-to-top, user bubble).
- Grep native-chat for regenerate / editAndResend / reply — **no matches**.

## Findings

### F18. Per-message actions are Copy + “scroll this message to top”, not a ChatGPT-style menu
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:244:337]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatMessageList.tsx:70:98]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx:6:65]

Agent messages get hover/inline controls: copy prose (clipboard IPC / `expo-clipboard`) with brief copied tint; ArrowUp aligns that message’s top to the viewport (per-turn nav). User messages are inverted bubbles; copy is agent-side. No long-press menu, reactions, quote, edit-and-resend, or regenerate in this surface.

**UX to copy:** always-visible (or hover) Copy on assistant turns; per-turn “jump this turn to top” as a cheap stand-in for in-conversation search.
**Constraint map:** copy is a view affordance over transcript text the host already streamed. Scroll-to-turn is layout. Our artifact viewer already copies code; this is **message-level copy in the transcript**, which we lack.
**Verdict:** copy-on-turn + scroll-to-turn → **drop-in view affordance**. Do not invent reply/regen to “match ChatGPT” using orca as justification — **orca does not have them here**.

### F19. Right-click “context menu” is pane/session chrome, including Set Title and Fork — mostly not portable
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:47:64]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:156:265]

Menu items: Copy selection, Paste, Switch to terminal, Continue in New Session, Fork Agent Session, Split Right/Down, Equalize/Expand pane, **Set Title…**, Copy Terminal/Pane ID, Close Pane. Selection copy is scoped to the chat root so foreign selections are ignored.

**UX to copy:** copy/paste of selected transcript text; maybe “new session from here” if the host can fork.
**Constraint map:** Set Title is mutable session metadata → **needs a new host field** (or reject). Fork / continue-in-new-session are host commands, not DTO fields. Split/equalize/close pane are Electron IDE **not portable**. Switch-to-terminal **not portable** (we are not a PTY client).
**Verdict:** selected-text copy/paste → **drop-in**. Fork/continue → **needs a new host field** (command). Set Title without host → **not portable**. Pane splits → **not portable**.

### F20. Tool activity folds into collapsible runs; pairing is FIFO across the transcript
[SOURCE: specs/context/orca-main/src/shared/native-chat-tool-fold] 
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-message-grouping.ts:55:117]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:46:241]

Assistant prose first; tools become a `N× summary` run that expands to inline `▸ ToolName preview` lines (diffs deferred until expand). Results have **no call id** — Nth call pairs with Nth result in document order; unpaired call = in-flight. Global tools-expanded remounts to reset per-line overrides. File-targeting tools can open a path.

**UX to copy:** we already have collapsible evidence groups + todo panel. Orca’s lesson is **flat one-line tools in the transcript**, not boxed cards, plus FIFO in-flight pairing.
**Constraint map:** folding is a view over host tool blocks. Opening files on device is orca filesystem **not portable** unless our artifact viewer already handles the URI. FIFO pairing logic is portable reconciliation **if** our transcript uses the same shapeless results.
**Verdict:** one-line tool fold + in-flight unpaired call → **drop-in view affordance** (logic). `onOpenFile` into a host workspace → **not portable** as a default; map to our artifact viewer when the host already sent an artifact.

### F21. Negative finding: orca is not a source for reply/quote/edit-and-resend/regenerate
Grep of `src/renderer/src/components/native-chat` for `regenerat|editAndResend|retryTurn|quoteMessage|replyTo` returned **no matches**. Mobile message component has no long-press handler.

**UX implication:** filling those chat gaps must come from Pi/desktop-parity or a new design, not from orca native-chat. Copying a fake “orca menu” would be cargo-cult.
**Verdict:** **not portable** (does not exist to port). Ruled out as an orca mining target.

## Questions Answered
- Q3 for native-chat: copy, turn-align, tool fold, pane menu. Reply/regen/edit **absent**.

## Questions Remaining
- Composer (attachments, paste, dictation, mentions, slash, history) — Q4.
- Streaming/typing (partial F from typing indicator row — defer to streaming iteration).
- Session→chat nav — Q5.

## Dead Ends
- Using orca context menu as a template for message-level ChatGPT actions. It is a terminal-pane menu. Ruled out.
- Implementing Set Title on the client. Ruled out under fail-closed.

## Assessment
- newInfoRatio: **0.86**
- Novelty: first chat-surface pass; negative regen finding is first-class.
- Confidence: high that native-chat has no regen/edit; medium that some other orca surface (TUI/terminal) might, but that would be **not portable** to SvelteKit chat anyway.

## Reflection
- What worked: grepping for the gap verbs instead of assuming orca is “more ChatGPT-like”.
- What failed: none.
- Ruled out: message-level regen/reply from this codebase; client Set Title; pane splits.

## Recommended Next Focus
Orca native-chat **composer**: attachments, clipboard image paste, dictation, autocomplete/mentions, drafts, send eligibility.

## SCOPE VIOLATIONS
None.
