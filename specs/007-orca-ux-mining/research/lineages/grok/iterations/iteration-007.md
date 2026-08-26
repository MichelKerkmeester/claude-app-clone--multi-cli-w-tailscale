# Iteration 7: Streaming, pending echo, working indicator, input lock, drafts

## Focus
How orca mobile native-chat renders streaming/partial output, optimistic user echoes, working/stop, input-lease lock, and rejected-draft restore. Map onto our already-mature streaming transcript.

## Actions Taken
- Read `use-mobile-native-chat-controller.ts` (throttle, stream identity, drafts).
- Read `mobile-native-chat-render-data.ts` (fold + synthetic streaming bubble + pending).
- Read `MobileAgentWorkingIndicator.tsx`, `MobileNativeChatView.tsx` lock/working/stop props.
- Skim drafts hook names from controller (`restoreRejectedDraft`, `acceptSend`).

## Findings

### F-ITER007-STREAM Streaming is a synthetic bubble gated against transcript catch-up, throttled 50ms
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:54:56]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-render-data.ts:52:66]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:25]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:75:81]

List data = folded transcript + gated streaming string + pending echoes. Throttle 50ms because OpenCode emits a status frame per streamed token. `streamIdentity` includes session id; `streamScopeKey` stays tab-keyed so peeking the terminal does not reset the streaming baseline.

**UX to copy:** we already have live-edge streaming + stall detect. Portable: **do not reset streaming state when the user peeks another pane**; throttle UI updates; drop the synthetic bubble once the host transcript contains the same text (gate).
**Constraint map:** streaming text is host-authored; the client only projects it. Resetting on tab peek would look like data loss but is a view bug, not metadata.
**Verdict:** **drop-in view affordance** (reconciliation logic). Copying OpenCode-specific 50ms → tune to our stream, not a hard port.

### F-ITER007-PENDING Optimistic user echo includes image preview URIs until the transcript replaces it
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-render-data.ts:38:44]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-render-data.ts:67:80]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:91:100]

`pending`: `{id, text, images?}`. After accept, local photo URIs are retained in `imagePreviewsByMessageId` and spliced onto host `image-ref` blocks so the bubble does not flash empty while the host URI arrives. Reject restores the exact draft (`restoreRejectedDraft`).

**UX to copy:** optimistic echo is allowed **as a projection of the in-flight send**, not as session truth; reconcile by host message id; keep local image previews as a view cache keyed by host message id.
**Constraint map:** fail-closed if the send is rejected — remove the echo, restore draft. Never persist pending as a session.
**Verdict:** **drop-in view affordance**. We likely already do text echoes; image-preview splice is the gap if we add paste-image.

### F-ITER007-WORK Working bar is presentation-only; Stop is a host interrupt
[SOURCE: specs/context/orca-main/mobile/src/session/MobileAgentWorkingIndicator.tsx:4:38]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:51:53]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:393:407]

"Agent is working" + animated dots. Visibility is the caller's (`agentWorking`). Stop sits on the working bar (`onStop`). Partial-text typing indicator (our gap) is **not** a second component — the streaming bubble **is** the partial text; the working bar is for the no-text-yet phase.

**UX to copy:** we have "Working…" + stall. Portable split: **dots when working but no tokens yet**; **streaming bubble once tokens exist**; stop on the working bar.
**Verdict:** **drop-in view affordance**. A separate "typing…" ghost without host `agentWorking` would be invention — **not portable**.

### F-ITER007-LOCK Input lock reasons are disconnected vs waiting (lease), never revoke editable
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:36:40]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:79]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:38:40]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:216:218]

Lock: transport disconnected, or input lease not acknowledged. Composer stays editable; send is gated. Fail-closed on disconnect.

**UX to copy:** we already fail-closed on stale/live. Portable: distinguish "waiting for lease" (transient) vs disconnected (hard); keep keyboard.
**Verdict:** **drop-in view affordance**.

### F-ITER007-DRAFT Composer text is owned by the route so dictation can write it; drafts keyed by chat scope
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:66:68]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:91:99]

Drafts are per-chat client state, not session metadata. Seeded launch draft can be consumed on send.

**UX to copy:** per-session composer draft in memory/local storage is OK if it never claims to be the host transcript and is discarded on fail-closed identity change (`epoch`).
**Verdict:** **drop-in view affordance**. Prompt-history up-arrow (our gap) still **not found** here — drafts ≠ history stack.

## Questions Answered
Partial q-session-chat-nav (streaming/lock) and remaining composer draft question.

## Questions Remaining
- Session tabs / chat vs terminal view toggle / back-swipe.
- Prompt history stack.
- Load-earlier / jump-to-latest in this view.

## Ruled Out
- Client-invented typing indicator without host `agentWorking`/streaming.
- Persisting optimistic pending messages as the session.

## Dead Ends
- Equating `use-mobile-native-chat-drafts` with up-arrow prompt history — it is current-draft restore, not a stack.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/use-mobile-native-chat-controller.ts:25
- specs/context/orca-main/mobile/src/session/mobile-native-chat-render-data.ts:38
- specs/context/orca-main/mobile/src/session/MobileAgentWorkingIndicator.tsx:4
- specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:36

## Assessment
- newInfoRatio: 0.80
- noveltyJustification: Streaming gate vs tab peek, pending image splice, working-vs-streaming split, and lease lock are new versus composer chrome.
- confidence: high; prompt-history still absent.

## Reflection
- What worked and why: Distinguishing streamIdentity vs streamScopeKey is the portable "don't reset on peek" rule.
- What did not work and why: Looking for a typing-indicator component — it is the streaming bubble plus working dots.
- What I would do differently: Next, session tabs and chat/terminal view toggle (nav angle 6).

## Recommended Next Focus
Session→chat navigation: tab bar, chat vs terminal view opt-in, back-swipe, load-earlier, jump-to-latest, home→history peek vs open.
