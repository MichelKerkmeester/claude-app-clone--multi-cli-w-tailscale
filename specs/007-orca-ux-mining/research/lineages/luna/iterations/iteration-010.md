# Iteration 10: Dictation, drafts, and send eligibility

## Focus

Review Orca’s mobile composer interaction around microphone input, per-session drafts, optimistic echoes, and the user-visible distinction between accepted, rejected, and unconfirmed sends.

## Findings

### F-LUNA-010-A — Dictation writes into the existing parent-owned draft

**Orca file/pattern:** `mobile/src/session/MobileNativeChatComposer.tsx:34-60,221-280` exposes a mic beside send with toggle or hold modes; the controlled `value`/`onChangeText` seam lets dictation update the same draft without a second input model.

**Copy:** Add an optional mic button beside the send action. Support toggle and hold-to-talk based on the platform capability; show active state and route unavailable speech to an explicit setup/error surface.

**Constraint mapping:** On-device speech that only changes the local draft is view/input behavior. It must not send until the normal host-authoritative send path accepts the text. Orca’s desktop speech-model RPC is not a portable dependency for this SvelteKit client.

**Verdict:** `drop-in view affordance` for mic-to-draft; Orca-specific speech setup RPC `not portable`.

### F-LUNA-010-B — Scope drafts and retain optimistic messages until reconciliation

**Orca file/pattern:** `src/renderer/src/components/native-chat/use-native-chat-draft.ts:4-38` caches draft by pane scope; `mobile/src/session/use-mobile-native-chat-drafts.ts:31-45` and `use-mobile-native-chat-message-send.ts:94-226` keep pending sends scoped and distinguish accepted/rejected/unknown outcomes.

**Copy:** Persist unsent text per host/session/tab, restore it when switching back, clear on a definite accepted send, restore exact user text on rejection, and show “delivery unconfirmed—check chat” when the transport outcome is ambiguous.

**Constraint mapping:** Drafts and optimistic echoes are client view state, never transcript authority. Reconcile an echo only against a matching host transcript turn after its send boundary; do not blind-resend an unknown outcome. On session switch, discard/retain by exact scope rather than reusing the previous draft.

**Verdict:** `drop-in view affordance` and reconciliation logic.

## Negative knowledge

- A host speech model catalog cannot be assumed from Orca’s Electron RPC surface.
- Clearing a draft on timeout or treating unknown as rejected invites duplicate sends; both are rejected.

## Questions answered

- Draft persistence and outcome wording are portable safeguards; actual speech-provider setup is not.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:34-60,221-280]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-draft.ts:4-38]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-drafts.ts:31-45]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-message-send.ts:94-226]
