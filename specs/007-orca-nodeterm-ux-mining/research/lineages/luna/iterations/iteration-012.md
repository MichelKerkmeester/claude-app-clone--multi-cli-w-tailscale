# Iteration 12: Prompt history and session-option controls

## Focus

Mine keyboard and composer option logic for mobile-friendly recovery of prior prompts and safe model/effort controls.

## Findings

### F-LUNA-012-A — Recall prior sent prompts without rewriting the transcript

**Orca file/pattern:** `src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:43-110` protects IME Enter, sends on Enter, interrupts on Escape, and navigates ArrowUp/Down history; `native-chat-composer-state.ts:183-212` stores bounded conceptual `entries` plus a recall index.

**Copy:** Keep a per-session/device prompt history and expose previous/next controls on mobile when the draft is empty or already in recall mode. Restore the exact submitted text, preserving caret placement; never erase the current draft unexpectedly.

**Constraint mapping:** History is local input state, not host transcript authority. Store only text the client actually submitted, and clear/fence it by host/session scope. Recalling a prompt does not send it until the user explicitly submits through the normal command path.

**Verdict:** `drop-in view affordance`.

### F-LUNA-012-B — Keep session-option dispatch serialized and send-locked

**Orca file/pattern:** `mobile/src/session/use-mobile-native-chat-session-options.ts:32-41,93-120,175-205,210-283` scopes option records by tab/agent, serializes operations, tracks a pending id, refuses unknown flip baselines, and lets host reports win over local guesses.

**Copy:** Keep model/effort controls in the composer action row or sheet, disable prompt send while an option command is in flight, and re-enable only after a definite result. If the host cannot confirm a model/option catalog, omit the control.

**Constraint mapping:** The host report is authority; a locally dispatched option is only best-known until acknowledged. Scope pending state to the exact session/tab and never apply a late response to the newly active session. Unknown baseline means disabled, not guessed toggle.

**Verdict:** `drop-in view affordance` for serialization/locking; richer option catalog `needs a new host field`.

## Negative knowledge

- Arrow keys must not override IME composition; a mobile control should be an explicit equivalent, not a keyboard hack that submits partial text.
- A guessed model toggle from a stale local record is unsafe and rejected.

## Questions answered

- Prompt recall is pure client view state. Option controls are portable only where the existing host command catalog reports both capability and scope.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:43-110]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:183-212]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:32-41,93-120,175-205,210-283]
