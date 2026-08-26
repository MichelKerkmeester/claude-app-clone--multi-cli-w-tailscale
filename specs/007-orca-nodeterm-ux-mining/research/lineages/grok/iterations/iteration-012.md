# Iteration 12: Electron prompt-history vs mobile composer (desktop/mobile delta)

## Focus
Desktop native-chat composer keydown history stack versus mobile native-chat (no equivalent). Confirm this is the source for our "up-arrow prompt-history" gap.

## Actions Taken
- Read `use-native-chat-composer-keydown.ts` ArrowUp/Down recall.
- Read `native-chat-composer-state.ts` `HistoryState` / `pushHistory` / `recallPrevious`.
- Confirmed mobile composer ArrowUp is the Send icon, not history (iter 6).

## Findings

### F-ITER012-HIST Electron keeps a **client-local** stack of sent strings; ArrowUp on empty draft recalls
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:93:111]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:183:211]

`HistoryState = { entries, index }`. `pushHistory` skips empty and consecutive duplicates. ArrowUp when `draft === ''` OR already recalling; ArrowDown walks forward and clears to `''` past the newest. IME composition is ignored.

**UX to copy:** local recall of **this tab's already-sent prompts** (not a host prompt-history RPC). Empty-composer-only so it does not steal caret from mid-edit.
**Constraint map:** the stack is view state over sends the host already accepted. It is not session metadata. Survives neither process death nor another device unless we persist it locally (device-only is OK; claiming it is host truth is not).
**Verdict:** **drop-in view affordance** (device-local). Do not invent a host "prompt history" field unless we want cross-device recall.

### F-ITER012-MOBILE Mobile native-chat has no history stack
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:11]
[SOURCE: grep mobile/src/session recallPrevious: no matches]

Mobile ArrowUp icon = Send. Prompt history is **desktop-only** in orca.

**UX implication:** porting "up-arrow history" is a **desktop pattern**, not a mobile orca pattern. On a phone, a "recent prompts" sheet (long-press Send, or a clock chip) is a more honest port of the same `HistoryState` than hijacking a hardware key we do not have.
**Verdict:** mobile absence is **negative knowledge**. Sheet over local sent-stack → **drop-in**. Hardware ArrowUp on mobile → **not portable**.

### F-ITER012-DELTA Other desktop-only composer pieces: `$` skills picker, paste handler, interrupt-on-Escape
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:64:70]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:83:86]

Desktop: `$` skill prefix, Escape interrupts. Mobile: mic/dictation + image attach instead.

**UX to copy:** Escape/stop is already our Stop. `$` skills need a host skill inventory (orca discovers skills).
**Verdict:** Escape-interrupt chrome → **drop-in**. `$` skills list → **needs a new host field** if we want it; we already have slash from `get_commands`.

## Questions Answered
q-composer-input remainder: prompt history exists on Electron only, as local sent-stack.

## Ruled Out
- Treating mobile native-chat as the source for up-arrow prompt history (it has none).
- Hosting prompt history as session metadata.

## Dead Ends
- Searching mobile for `HistoryState` / `recallPrevious` — absent.

## Sources Consulted
- specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:93
- specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:183

## Assessment
- newInfoRatio: 0.70
- noveltyJustification: First Electron-vs-mobile composer delta; locates prompt history as desktop-only local stack.
- confidence: high.

## Reflection
- What worked and why: Comparing the same native-chat product on two surfaces prevented a false "orca has no history".
- What did not work and why: Assumed mobile would mirror desktop keydown.
- What I would do differently: Next, copy-code in markdown vs whole-message copy.

## Recommended Next Focus
Copy-code: Electron editor `CodeBlockCopyButton` vs native-chat whole-message copy vs mobile markdown (no per-fence copy).
