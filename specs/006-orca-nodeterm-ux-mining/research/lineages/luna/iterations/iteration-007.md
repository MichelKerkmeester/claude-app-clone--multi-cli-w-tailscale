# Iteration 7: Message action boundaries and selection copy

## Focus

Validate the Electron native-chat context menu and selection handling so the client can add useful long-press/right-click affordances without importing IDE-only mutations.

## Findings

### F-LUNA-007-A — Scope selected-text copy to the chat root

**Orca file/pattern:** `src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:35-64,103-139,141-167,272-300` remembers selection changes only inside the chat root and ignores foreign selections before opening Copy.

**Copy:** On mobile, use a bottom sheet or long-press action for selected transcript text, with Copy disabled when the selection is empty. Keep the action local to the transcript and preserve normal text selection when no action is requested.

**Constraint mapping:** Copying visible text is read-only and does not require a new host field. Root scoping prevents a stale/foreign selection from being copied as if it belonged to the active session. Do not expose hidden prompt/path data through a broad document-level handler.

**Verdict:** `drop-in view affordance`.

### F-LUNA-007-B — Separate session/pane actions from message actions

**Orca file/pattern:** `use-native-chat-context-menu.tsx:47-64,168-265` groups Switch terminal, Continue in New Session, Fork, pane split/expand/close, Set Title, and Copy IDs in one pane menu; `AiVaultSessionActionMenuItems.tsx:72-169` repeats resume/copy/delete actions at session-row scope.

**Copy:** Give the SvelteKit session view a session-level action sheet containing only safe Open/copy-id/refresh affordances, and keep any future host command behind an explicit capability response. Do not attach session actions to a message long press.

**Constraint mapping:** Set Title, fork, continue, delete, and new-session actions mutate host state or require a host command; they are not DTO decorations. If unsupported, omit/disable them with a reason. Pane split/close/terminal switch are not part of the Pi mobile contract.

**Verdict:** session-safe copy/open chrome `drop-in view affordance`; host mutations `needs a new host field`; pane operations `not portable`.

## Negative knowledge

- “Fork Agent Session” in Orca is not evidence that Pi can fork a session; it depends on the Electron/pane host action.
- A global context menu that copies whatever the browser currently selects is unsafe and rejected.

## Questions answered

- Long press is useful as a scoped view affordance, but its action vocabulary must be narrower than Orca’s pane menu.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:35-64,103-167,168-265,272-300]
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionActionMenuItems.tsx:72-169]
