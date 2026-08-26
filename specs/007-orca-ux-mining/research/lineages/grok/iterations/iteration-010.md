# Iteration 10: @-file search RPC and AskUserQuestion wizard

## Focus
Host-backed file mention search (`files.searchPaths` / legacy `files.list`) and the AskUserQuestion wizard (index-based answers, Other…, cancel). Map onto our composer @-mention gap and existing ask-question card.

## Actions Taken
- Read `use-mobile-native-chat-file-search.ts` (debounce 120ms, cache 20, limit 16, generation bump on worktree change).
- Read `MobileNativeChatAsk.tsx` (wizard, OTHER=-1, index-based selections).
- Noted view stacking: Ask wins, then permission, then heuristic question.

## Findings

### F-ITER010-FILES @-mentions debounce a host path search; older hosts fall back to one full `files.list`
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts:5:7]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts:48:125]

`FILE_SEARCH_DEBOUNCE_MS = 120`, result cap 16, query cache 20. Sequence/generation counters drop stale responses. Worktree/client change clears cache. Legacy: `files.list` once, then client-rank. Modern: `files.searchPaths`. Cached hit cancels in-flight debounce so an older RPC cannot clobber.

**UX to copy:** @-mention list that is **host-authoritative paths**, debounced, stale-safe, fail-closed when `client` is null (no local FS walk).
**Constraint map:** Pi mobile client must not list the user's laptop disk. We need a host search RPC (or omit @). Copying method names `files.searchPaths` → **not portable**; the **shape** (query in, relative paths out) is the request.
**Verdict:** **needs a new host field/RPC**. Interaction (debounce, cap, empty while in-flight) → **drop-in** once the RPC exists.

### F-ITER010-ASK AskUserQuestion is a stepped wizard; answers are option **indices**, not pasted labels
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatAsk.tsx:9:54]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:353:375]

Comment: index-based so Claude's arrow-navigate selector can be driven by the option's stable number (STA-1860). `OTHER = -1` sentinel for free-text. Multi vs single. Cancel is a host dismiss. Controller owns dismissal so it survives view-toggle unmount.

**UX to copy:** we already have an ask-question ticketed card. Portable deltas: **wizard for multi-question prompts**; **send indices not labels** (labels can be paraphrased/redacted); **dismissal state lives outside the card** so toggling UI does not lose the ticket; Other… row.
**Constraint map:** fail-closed if the host ticket disappears — don't submit stale indices. We must not invent an Ask prompt the host did not send.
**Verdict:** wizard + index answers + out-of-tree dismiss → **drop-in view affordance** over existing host ask tickets. Inventing Ask UI without a host prompt → **not portable**.

### F-ITER010-STACK Prompt stack: structured Ask > heuristic permission > heuristic question
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:353:387]

One overlay at a time, strict precedence.

**UX to copy:** we split Inbox vs Review vs in-chat ask card. Portable: never show two blocking prompts stacked; precedence is host-typed.
**Verdict:** **drop-in view affordance**.

## Questions Answered
Partial q-composer-input (@ RPC) and remaining ask-card UX (not a key question but fills chat gaps).

## Ruled Out
- Device filesystem listing for @-mentions.
- Answering Ask prompts by pasting option label text (breaks redaction/stable ids).

## Dead Ends
- Prompt-history up-arrow still absent (composer ArrowUp is Send).

## Sources Consulted
- specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts:5
- specs/context/orca-main/mobile/src/session/MobileNativeChatAsk.tsx:9
- specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:353

## Assessment
- newInfoRatio: 0.78
- noveltyJustification: First pass on files.searchPaths stale-safe search and index-based Ask wizard; not covered in composer chrome.
- confidence: high.

## Reflection
- What worked and why: Generation counters are the portable stale-RPC pattern for any host search.
- What did not work and why: Looking for in-chat rename/pin/archive UI — still only slash catalog strings.
- What I would do differently: Next, permission card + long-press haptics taxonomy + home skeletons.

## Recommended Next Focus
Permission overlay, haptic taxonomy (selection/success/error/edge), empty/loading/error states on history, and Electron native-chat menu parity check.
