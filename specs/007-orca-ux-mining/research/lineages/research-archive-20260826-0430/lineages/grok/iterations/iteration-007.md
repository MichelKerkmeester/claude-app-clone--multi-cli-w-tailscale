# Iteration 7: Composer autocomplete, slash/skills, @files, prompt history, session options

## Focus
Orca composer command-argument UX: trigger detection, slash vs @, skills picker, ArrowUp history, model/session-option row.

## Actions Taken
- Read `mobile-native-chat-autocomplete.ts`, `NativeChatAutocompleteMenus.tsx`, `use-native-chat-composer-keydown.ts`, `native-chat-composer-state.ts` (history), `MobileNativeChatComposer.tsx` suggestion wiring.

## Findings

### F26. `@` mentions files anywhere after whitespace; `/` commands only at start of input
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-autocomplete.ts:21:71]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:102:119]

`detectAutocompleteTrigger` walks left over non-whitespace. `/` is rejected unless `triggerIndex === 0`. `@` requires start or whitespace before. Apply replaces the span and leaves a trailing space. Slash catalog is **per-agent** (`getVerifiedNativeChatCommands(agent)`), ranked, **capped at 12** because Codex’s catalog is 45 commands and an uncapped list re-reconciles on every streaming tick.

**UX to copy:** we already have slash autocomplete + palette. Port `@` only if the host can resolve file paths. Cap suggestion lists during streaming.
**Constraint map:** `@file` inserts a path the **agent sandbox** must be able to read — host/workspace relative. Ranking/capping is view logic. Slash commands we already host-filter via command catalog.
**Verdict:** slash cap + start-of-input rule → **drop-in** (we may already match). `@files` without a host file index → **needs a new host field** (or file-search RPC). Inventing @-mentions of users/agents → **not portable** (orca @ is files, not people).

### F27. Desktop picker groups commands vs skills, with host-unavailable empty states
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatAutocompleteMenus.tsx:8:80]

Listbox: commands heading, skills heading, loading spinner, “Skills are unavailable for this host”, collision/duplicate source warnings. Enter on a command **dispatches** the command; Tab completes the item text.

**UX to copy:** grouped slash vs skills; don’t pretend skills exist when the host says unavailable (fail-closed empty).
**Constraint map:** skills are host/runtime packages. Our Pi command catalog is the analog. Showing a skills UI without host support → **not portable**.
**Verdict:** grouped catalog + unavailable empty → **drop-in** against our existing host command catalog. Orca skills loader → **needs a new host field** (or skip).

### F28. ArrowUp on empty (or already-recalling) composer walks sent-prompt history
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts:83:110]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts:183:203]

IME composition blocks Enter. Escape interrupts. Enter-without-Shift sends. ArrowUp when `draft === '' || history.index !== null` recalls previous sent strings; ArrowDown walks forward. History is composer state (`entries` + `index`), filled by `pushHistory` on send.

**UX to copy:** up-arrow prompt history (explicit gap in research-angles). On mobile, map to a “previous prompt” control rather than hijacking caret (RN caret vs ArrowUp).
**Constraint map:** history of **this device’s sent texts** is client view state, not session metadata. Do not rewrite host transcript. Don’t recall redacted content if the host redacted the send — we should only store what we actually submitted.
**Verdict:** **drop-in view affordance** (device-local sent-prompt stack). Persisting history as session truth → **not portable**.

### F29. Session-option pickers (model etc.) live in the composer action row and block send while dispatching
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:41:100]

`sessionOptions` from agent catalog; `pendingId != null` disables send so a model switch doesn’t race a prompt.

**UX to copy:** we already have model/effort bottom sheet. The portable lesson is **send-lock while a session option RPC is in flight**.
**Constraint map:** options must be host-authoritative (we already do this).
**Verdict:** **drop-in** (lock around in-flight option apply). Don’t add a second client-side model field.

## Questions Answered
- Q4 composer patterns: attach/paste/mic/draft (iter 6) + autocomplete/history/options (this iter). Remaining: command-arg UI beyond slash complete (QuickCommands).

## Questions Remaining
- Streaming/typing/stall (Q angle 5).
- Session→chat nav (Q5).
- QuickCommands as command-arg UI.

## Dead Ends
- `@` as people-mentions. Ruled out (orca @ is files).
- Skills UI without host skills. Ruled out.

## Assessment
- newInfoRatio: **0.78**
- Confidence: high.

## Reflection
- What worked: trigger-detection as a pure function (portable independently of RN vs Svelte).
- Ruled out: people @-mentions; unhosted skills picker.

## Recommended Next Focus
Streaming and progress: live status, typing indicator, working suppression, stall/interrupt, question/permission cards.

## SCOPE VIOLATIONS
None.
