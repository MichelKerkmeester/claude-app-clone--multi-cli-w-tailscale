# Iteration 16: Session-option pickers vs our model/effort sheet

## Focus
Orca mobile `useMobileNativeChatSessionOptions`: model/effort rows that type slash into the agent, versus our host-authoritative model/effort bottom sheet.

## Actions Taken
- Read controller types, reported-model effect, `setOption` slash dispatch, flip-only fail-closed.
- Compare to our existing provider-grouped model sheet (research-angles: already mature).

## Findings

### F-ITER016-SLASH Option rows dispatch **agent TUI commands**, not a host session-options API
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:32:41]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:210:256]

`setOption` builds `buildNativeChatSessionOptionCommand` and `dispatchCommand(command)`. `recordCommand` tracks user-typed `/model sonnet`. Catalog only for `claude` and `codex`.

**UX to copy:** we already change model via **host RPC**. Copying "type `/model` into the TUI" would bypass Pi's `set_model` and is the wrong authority.
**Constraint map:** fail-closed = the host/child is source of the active model. Orca's rows are a **TUI remote-control** pattern (paired to a terminal agent). Our sheet is already the portable equivalent.
**Verdict:** slash-dispatch session options → **not portable** onto Pi RPC. Row layout (model first, then that model's options, pending disable) → **drop-in view affordance** over our existing host lists.

### F-ITER016-REPORT Hook-reported model is authority; identical re-reports must not revert a user pick
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:133:154]

`appliedReportByScope`: only a **changed** reported model is evidence. Re-enter/reconnect repeats must not clobber `/model` sent after the snapshot.

**UX to copy:** reconcile host `get_session` / status onto the picker; do not reset the sheet to a stale snapshot after a confirmed set_model.
**Verdict:** **drop-in** reconciliation logic (we should already do this; this is the bug to avoid).

### F-ITER016-FLIP Flip-only mid-session options refuse to apply without a known baseline
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:227:237]

Unknown baseline → `return false`. Same absolute target as tracked → no-op success (do not invert a flip). In-flight model change: do not file effort under the new model.

**UX to copy:** if the host has not told us current effort, disable the control rather than guessing. We already hide unsupported thinking levels.
**Verdict:** **drop-in** fail-closed. `agent-picker` midSession that forces terminal view → **not portable**.

### F-ITER016-SCOPE Per-tab option records (cap 32) survive chat↔terminal remount
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:46:75]

Device-local cache of last dispatched values, LRU by touch.

**UX to copy:** remember last UI selection per session id as **optimistic overlay** until host confirms. Do not persist as the session's model if the host disagrees.
**Verdict:** overlay cache → **drop-in**. Treating overlay as source of truth → **not portable**.

## Questions Answered
Composer command-arg UI vs our model sheet.

## Ruled Out
- Replacing our `set_model` / thinking RPCs with orca's slash-to-TUI option catalog.

## Dead Ends
- Looking for a `session.setOption` RPC on mobile — options are composed CLI strings.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:32
- specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:133
- specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts:227

## Assessment
- newInfoRatio: 0.67
- noveltyJustification: First pass on session-option authority; explains why our sheet should not become a TUI typer.
- confidence: high.

## Reflection
- What worked and why: `dispatchCommand` vs `set_model` is the portability fork.
- What did not work and why: Catalog grok is explicitly excluded (CLI-default model would no-op).
- What I would do differently: Next, haptics taxonomy + swipe/long-press absence on home cards.

## Recommended Next Focus
Haptics taxonomy (selection/success/error/edge) and whether history/home has swipe, multi-select, or long-press menus (likely absent).
