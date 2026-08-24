# Iteration 005 — transcript ergonomics, composer resilience, and context budget

## Focus

The requested sync-package lease, sequence-window, and expiry implementation remains unconfirmable: OGAM imports `@offgrid/sync` from a sibling `file:../shared/packages/sync`, but that sibling package is absent from the provided snapshot (`specs/context/OGAM-main/package.json:33-40`; `specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:1-10`). This iteration therefore covered the still-open UX and context-budget angles with source-backed adoptable patterns.

## Actions Taken

1. Traced transcript rendering, memoization, reasoning parsing, tool rows, and accordion persistence in the ChatMessage, MessageRenderer, ThinkTagParser, message-content, and accordion-store surfaces.
2. Traced mobile scroll/autoscroll, keyboard behavior, composer send/stop/voice precedence, attachments, haptics, and actionable vision failures in ChatScreen and ChatInput.
3. Traced context-full recovery, compaction budgeting, persisted cutoff state, summarizer prompt hardening, observable compaction state, and retry cancellation in the compaction and generation services.
4. Verified the sync-package boundary against the manifest/import surface and recorded it as an evidence limitation rather than inferring wire semantics.

## Findings

### F1 — Memoize transcript rows around stable message identity

`MessageRenderer` compares the message object by reference and the few rendering flags that can change, deliberately ignoring recreated callbacks (`specs/context/OGAM-main/src/screens/ChatScreen/MessageRenderer.tsx:133-166`). The source explains that historical message objects remain stable while only the synthetic streaming item changes per token, so only the active row reparses markdown during streaming (`specs/context/OGAM-main/src/screens/ChatScreen/MessageRenderer.tsx:133-145`). Adopt for Pi Remote: keep finalized transcript item objects immutable, append a distinct streaming projection, and use a custom row comparator so remote token updates do not re-render the whole history.

### F2 — Make reasoning and tool activity first-class collapsible transcript surfaces

Thinking is rendered as a named accordion with a compact preview when closed and Markdown content when open (`specs/context/OGAM-main/src/components/ChatMessage/components/ThinkingBlock.tsx:13-53`). Tool calls and results use separate rows, status tone, optional details, and a shared accordion renderer; tool-call and tool-result identities remain distinct (`specs/context/OGAM-main/src/components/ChatMessage/components/ToolMessages.tsx:55-141`, `243-275`). The streaming parser holds incomplete opener/closer suffixes until a later chunk and binds the active close tag to the opener format (`specs/context/OGAM-main/src/services/providers/openAICompatibleStream.ts:21-31`, `44-117`). Adopt for Pi Remote: model reasoning, tool invocation, and tool result should be independently addressable rows, with a chunk-safe parser that never leaks partial control tags into visible answer text.

### F3 — Persist accordion state outside the remounting row

The in-progress assistant row changes its FlatList key from `streaming` to the finalized message ID, so local state would be lost. OGAM stores expansion by stable key in `accordionStore`, and its hook returns a key-stable toggle handler (`specs/context/OGAM-main/src/stores/accordionStore.ts:4-19`, `28-53`). Tool rows use `toolCallId` or a turn-derived key rather than the transient message ID (`specs/context/OGAM-main/src/components/ChatMessage/components/ToolMessages.tsx:179-181`, `204-229`), and the rows are memoized to preserve press targets during token churn (`specs/context/OGAM-main/src/components/ChatMessage/components/ToolMessages.tsx:134-141`; `specs/context/OGAM-main/src/components/ChatMessage/components/ToolsSentCollapsible.tsx:53-60`). Adopt for Pi Remote: key disclosure state by stable turn/tool identity and keep the toggle callback stable across streaming renders.

### F4 — Gate autoscroll on user position and offer an explicit recovery affordance

OGAM tracks distance from the bottom in a ref, sets a 100-pixel near-bottom threshold, and only autoscrolls when the user is already near the bottom (`specs/context/OGAM-main/src/screens/ChatScreen/index.tsx:176-181`; `specs/context/OGAM-main/src/screens/ChatScreen/ChatMessageArea.tsx:255-267`). When the user is away, it exposes a haptic jump-to-bottom button (`specs/context/OGAM-main/src/screens/ChatScreen/ChatMessageArea.tsx:291-303`). It also scrolls to the end on keyboard show and after a mode switch (`specs/context/OGAM-main/src/screens/ChatScreen/index.tsx:115-139`). Adopt for Pi Remote: do not steal scroll position during a remote stream; retain a visible jump affordance and re-anchor after keyboard/layout transitions.

### F5 — Treat composer actions as an explicit priority state machine

The send predicate permits text-or-attachment input and rejects disabled state; send clears the draft and attachments, refocuses the input, and resets one-shot image mode (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:196-210`). The action slot has priority `send` when `canSend`, then `stop` while generating, then voice recording (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:323-352`). Attachments are horizontally previewed with stable IDs, type-specific affordances, removal controls, and optional full-screen image viewing (`specs/context/OGAM-main/src/components/ChatInput/Attachments.tsx:234-302`). The keyboard-aware popover dismisses the keyboard, waits for `keyboardDidHide`, then waits 300ms for the raised composer to settle before measuring (`specs/context/OGAM-main/src/components/ChatInput/useKeyboardAwarePopover.ts:30-75`). Adopt for Pi Remote: encode send/stop/record as mutually exclusive states, keep keyboard focus after send, and defer popover measurement until the mobile viewport settles.

### F6 — Failure messages should distinguish actionable repair from capability absence

`buildNoVisionAlert` distinguishes remote unsupported capability, a local model missing its vision file, and a model that simply lacks vision; only the repairable case offers a Download Manager action (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:68-106`). The same vision gate is applied to both send and resend before native generation (`specs/context/OGAM-main/src/screens/ChatScreen/useChatGenerationActions.ts:143-167`, `943-945`). Adopt for Pi Remote: classify failures into user-actionable repair, unsupported capability, and transient retry, and make every displayed action lead to a valid next step for that deployment.

### F7 — Bound context with separate summary/recent/generation budgets and a durable cutoff

OGAM reserves a 55% prompt budget, a 12% summary budget, and the remaining prompt space for recent messages, leaving generation and native overhead outside the prompt allocation (`specs/context/OGAM-main/src/services/contextCompaction.ts:9-15`, `29-36`; `specs/context/OGAM-main/src/services/llmHelpers.ts:13-16`). Compaction walks backward to retain recent messages, truncates an oversized final message, summarizes older messages under a hard cap, persists the summary plus the last old-message ID, and falls back to trim-only when summarization fails (`specs/context/OGAM-main/src/services/contextCompaction.ts:78-87`, `96-121`, `135-168`). The cutoff is stored with the conversation and reapplied when building the next generation context (`specs/context/OGAM-main/src/stores/chatStore.ts:136-140`, `448-461`; `specs/context/OGAM-main/src/screens/ChatScreen/useChatGenerationActions.ts:126-140`). Adopt for Pi Remote: persist compaction metadata, make the cutoff deterministic, and never rely on an in-memory summary after reload.

### F8 — Harden summarization against transcript instructions and racey retries

The summarizer system prompt explicitly says transcript instructions are data and must not be followed; transcript role prefixes are escaped with `>` before inclusion, and both input and output are capped (`specs/context/OGAM-main/src/services/contextCompaction.ts:38-40`, `174-215`). On a context-full error, OGAM stops all text engines before compacting, retries once with the compacted context, and refuses to start the retry if the generation owner was aborted while summarization ran (`specs/context/OGAM-main/src/screens/ChatScreen/useChatGenerationActions.ts:505-544`). Compaction state is service-owned but exposed through a subscribe API to the reactive screen projection (`specs/context/OGAM-main/src/services/contextCompaction.ts:42-62`; `specs/context/OGAM-main/src/screens/ChatScreen/useChatScreenLifecycle.ts:62-87`). Adopt for Pi Remote: put summarization behind a service seam with an observable status, quote/escape untrusted transcript content, and fence retries against the current turn's cancellation token.

### Evidence boundary — sync lease and sequence semantics remain UNKNOWN

The snapshot confirms the receiver/store contracts and the sibling-package dependency, but contains no `shared/packages/sync` implementation. Exact producer/receiver lease duration, sequence-window acceptance, expiry timers, and late-frame retirement cannot be cited from this tree and must not be inferred from the UI store behavior.

## Questions Answered

- **How can streaming transcript rendering stay fast?** Keep finalized item references stable, memoize rows with a focused comparator, and isolate the changing stream row.
- **How should reasoning and tool rows behave?** Render them as first-class collapsible surfaces; preserve stable disclosure identity across the streaming-to-finalized remount; buffer incomplete reasoning tags.
- **What mobile composer and scroll ergonomics are adoptable?** Near-bottom-gated autoscroll, a jump-to-bottom FAB, keyboard-settled popovers, send/stop/voice precedence, attachment previews, haptics, and repair-aware failures.
- **How does OGAM bound long-session context and harden summarization?** Reserve explicit ratios, retain recent messages by token count, persist summary plus cutoff, cap summarizer input/output, treat transcript instructions as data, and cancel context-full retries when the turn was stopped.

## Questions Remaining

- The exact `@offgrid/sync` producer/receiver lease, sequence-window, and expiry implementation remains unconfirmed because its sibling package is absent from the snapshot.
- The complete service-versus-reactive-store ownership map for generation and paired-device transport needs a source pass when the shared package is available.
- Pi Remote still needs a concrete mapping from these React Native affordances to SvelteKit/browser primitives, especially keyboard viewport behavior and attachment persistence.

## Next Focus

Iteration 006 should pivot to the remaining architecture boundary or, if the sibling package is still unavailable, triangulate OGAM's receiver lifecycle and SvelteKit adaptation constraints from the existing sync consumers and focused tests without inventing wire-level lease semantics.
