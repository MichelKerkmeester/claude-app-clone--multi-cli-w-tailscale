# Iteration 6: Message-level chat affordances

## Focus

Mine the native-chat message row and tool-fold implementation for high-value chat affordances, while checking whether Orca actually supplies reply, edit, or regenerate behavior.

## Findings

### F-LUNA-006-A — Copy and scroll-to-turn are the real per-message controls

**Orca file/pattern:** `mobile/src/session/MobileNativeChatMessage.tsx:244-275,295-337` and `src/renderer/src/components/native-chat/NativeChatMessageList.tsx:70-98,200-220` provide assistant-message Copy plus “scroll this message to top”; `NativeChatCopyButton.tsx:6-65` gives brief copied feedback.

**Copy:** Add a compact copy action to assistant transcript blocks and a “jump to turn” action for long conversations. Use a transient icon/tint acknowledgement rather than a toast that shifts the chat. Keep user bubbles visually distinct and do not add controls to empty/system rows.

**Constraint mapping:** Copy and scroll are local view operations over transcript blocks already received from the host. If the transcript is stale or unsettled, the action may copy what is visibly present but must not imply a host mutation. Scope the row action to the active session id.

**Verdict:** `drop-in view affordance`.

### F-LUNA-006-B — Fold tool activity into a bounded, expandable turn

**Orca file/pattern:** `mobile/src/session/MobileNativeChatMessage.tsx:46-135,183-241` renders one-line tool previews and expands details/diffs; `src/renderer/src/components/native-chat/native-chat-message-grouping.ts:21-46,48-117` pairs calls/results and leaves an unpaired call visibly in flight.

**Copy:** Keep tool activity collapsed by default into a summary with per-step expansion, bounded detail, and an explicit in-flight state. Preserve the existing evidence-group affordance but use Orca’s flat row treatment for dense tool runs.

**Constraint mapping:** Folding is presentation only. Pairing must use stable host block ids/order and must not fabricate a result for an unpaired call. File links may route only through the existing host-approved artifact/file viewer; never open an arbitrary path from client-derived text.

**Verdict:** `drop-in view affordance` for folding; file opening is `not portable` unless mapped to an existing authorized artifact route.

## Negative knowledge

- Grep of Orca native-chat for regenerate, edit-and-resend, reply-to, quote, or reaction handlers found no implementation; those gaps cannot be justified as Orca ports.
- Orca’s context menu is pane/session chrome, not a per-message chat menu; split/close/fork actions are not a portable message action model.

## Questions answered

- The strongest directly portable message actions are copy, turn navigation, and tool folding. Reply/edit/regenerate remain unconfirmed elsewhere and are excluded from this lineage’s Orca-derived recommendations.

## SCOPE VIOLATIONS

None. Read-only source inspection only.

[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:46-135,183-241,244-275,295-337]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatMessageList.tsx:70-98,200-220]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-message-grouping.ts:21-46,48-117]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx:6-65]
