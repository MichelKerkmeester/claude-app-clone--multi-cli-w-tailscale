# Iteration 15: History/home empty, loading, error, stale decay, timeAgo

## Focus
Fail-closed freshness and empty/loading chrome on session lists and native-chat, versus our Live/Stale banner and missing skeletons.

## Actions Taken
- Read `use-mobile-agent-history-state.ts` screen kinds and `MobileAgentSessionHistoryPanel` loading/error/capability.
- Read `formatTimeAgo` and `AGENT_STATUS_STALE_AFTER_MS`.
- Read shared native-chat empty-state copy.

## Findings

### F-ITER015-SCREEN History is a four-kind machine: loading | error | capability-missing | ready
[SOURCE: specs/context/orca-main/mobile/src/agent-history/use-mobile-agent-history-state.ts:22]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:273:290]

Loading = `ActivityIndicator`, not skeleton cards. Error has Retry. Host-too-old is a dedicated screen, not an empty list. Ready keeps showing previous data while refetching (`prev.kind === 'ready' ? prev : loading`).

**UX to copy:** do not flash empty on refetch; capability-missing ≠ no sessions; Retry on error. Skeletons are **not** an orca pattern here.
**Constraint map:** empty vs error vs stale must follow host fetch outcome. Inventing skeleton cards is fine as chrome; inventing rows while the host is error → **not portable**.
**Verdict:** four-kind screen + keep-last-good → **drop-in**. Skeleton shimmer → optional chrome, **not an orca port**. Capability copy → **drop-in**.

### F-ITER015-CHAT Empty/loading/error copy is shared desktop/mobile
[SOURCE: specs/context/orca-main/src/shared/native-chat-empty-state.ts:9:26]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-render-data.ts:16:30]

`loading` shows spinner copy; `empty` = "Start a chat with {agent}"; `error` = could not read transcript (desktop suggests toggle to terminal); `notAgent` for unrecognized TTY. Loading returns **null** empty-state in the mobile helper (spinner elsewhere).

**UX to copy:** named empty vs error vs not-a-session. We should not show "Start a chat" when the transcript RPC failed.
**Verdict:** **drop-in view affordance**. Terminal-toggle subtitle → **not portable** (no PTY).

### F-ITER015-STALE Active dots decay to idle after 30 minutes without host updates
[SOURCE: specs/context/orca-main/mobile/src/worktree/agent-row-display.ts:3:28]

`AGENT_STATUS_STALE_AFTER_MS = 30 * 60 * 1000`. working/blocked/waiting older than that render idle. Matches desktop decay so a crashed agent does not stay "working" forever.

**UX to copy:** client-side **decay of a host timestamp**, not client-invented status. Our `updatedAt` + `status` can dim "running" if the snapshot is stale (we already have Live/Stale).
**Constraint map:** decaying to idle is fail-closed presentation when the host has gone quiet. Do not flip `status` in a local store.
**Verdict:** **drop-in view affordance**.

### F-ITER015-TIME `formatTimeAgo` is a pure function of `(ts, now)`; history list does not tick
[SOURCE: specs/context/orca-main/mobile/src/worktree/agent-row-display.ts:89:105]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:122]

Buckets: just now / Xm / Xh / Xd. No `setInterval` in agent-history. Time updates on re-render/refetch.

**UX to copy:** coarse buckets over `updatedAt` (we have `relativeTime`). A 30s live tick is extra chrome, not orca.
**Verdict:** bucket formatter → **drop-in**. Live tick → **drop-in** (allowed, not copied). Absolute-on-tap → not observed in orca history.

## Questions Answered
Home gap skeletons/empty/fail-closed freshness.

## Ruled Out
- Copying skeleton-card loading from orca history (it uses a spinner).
- Treating decayed idle as a client write of session status.

## Dead Ends
- Search for skeleton components under `mobile/src/worktree` and `agent-history` — none.

## Sources Consulted
- specs/context/orca-main/mobile/src/agent-history/use-mobile-agent-history-state.ts:22
- specs/context/orca-main/src/shared/native-chat-empty-state.ts:9
- specs/context/orca-main/mobile/src/worktree/agent-row-display.ts:3

## Assessment
- newInfoRatio: 0.61
- noveltyJustification: Screen-kind machine, shared empty copy, 30min decay, no live tick — not covered by card-field iterations.
- confidence: high.

## Reflection
- What worked and why: Distinguishing keep-last-good refetch from skeleton fashion.
- What did not work and why: Expected a live clock on timeAgo.
- What I would do differently: Next, session-option pickers vs our model sheet.

## Recommended Next Focus
Session option rows: catalog → slash dispatch to the agent, reported-model authority, fail-closed unknown flip.
