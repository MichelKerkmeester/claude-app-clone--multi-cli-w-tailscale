# Iteration 1: Mobile Agent Session History list (card, group, peek, resume)

## Focus
Orca mobile Agent Session History: card fields, section grouping, expand-to-peek preview, pull-to-refresh, and the in-row Resume action. Map each affordance onto our `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`) and the host-authoritative/fail-closed constraint.

## Actions Taken
- Read `specs/006-orca-nodeterm-ux-mining/research-angles.md` and our home card (`app-mobile/src/pages/home/screen-home.svelte`) plus `SessionCardDto`.
- Read orca mobile history: `agent-history-session-card.ts`, `agent-history-sections.ts`, `MobileAgentSessionHistoryList.tsx`.
- Read shared list core: `ai-vault-types.ts`, `ai-vault-session-filters.ts`, `ai-vault-session-display.ts`.

## Findings

### F-ITER001-CARD Session card is a derived view over a host-owned AiVaultSession
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7:52]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83:120]
[SOURCE: packages/pi-rpc-protocol/src/types.ts:428:433]

`buildMobileAgentHistoryCard(session, activeWorktreePath, now)` projects a host-scanned `AiVaultSession` into:

- `id`, `agent`, `agentLabel`
- `title` (`session.title || 'Untitled session'`)
- `lastMessage` (latest user/assistant preview turn)
- `messageCount`, `timeAgo`
- `isCurrentWorktree` (cwd path-prefix vs active worktree)

`AiVaultSession` itself is richer: `title`, `cwd`, `branch`, `model`, `previewMessages`, `totalTokens`, `queuedMessageCount`, `subagentTranscriptCount`, `resumeCommand`, host id, timestamps.

**UX to copy:** a card that shows human title + last-message preview + agent identity + relative time + message count, with “Untitled session” as a host-safe fallback.
**Constraint map:** title, last message, agent, cwd, model, tokens are **not** on `SessionCardDto`. Deriving a fake title from our opaque `id` is still a compacted id (what home already does). Inventing a title on the client would be mutable session truth.
**Verdict:** **needs a new host field** (at least `title`, `lastMessagePreview`, `agent`/`model`). `messageCount` + `updatedAt` → **drop-in view affordance**. Compacted `id` stays until a title field exists.

### F-ITER001-GROUP Home list groups by folder and sorts by updated
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:20:58]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72:144]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:146:158]

`buildMobileAgentHistorySections` reuses the shared filter core:

- query + agent set + `sort: 'updated'` + `hideEmptySessions: true`
- scoped tabs (`workspace` / `project` / `all`) **narrow by cwd path-prefix on the client** because the host treats `scopePaths` as a widening union
- groups with `groupAiVaultSessions(filtered, 'folder')` using last-two path segments as the section label
- empty-scope-path fallback: do **not** flash an empty list; show unnarrowed until worktrees resolve

Section headers show `label` + count.

**UX to copy:** workspace-scoped sections with counts; sort by recency; hide genuinely empty sessions; don’t flash empty while catalogs load.
**Constraint map:** grouping by folder/repo/agent requires `cwd` or a host-provided `projectKey`/`agent`. Recency sort on `updatedAt` is legal today. Hiding empty sessions is legal via `messageCount === 0` **only if** we accept losing recoverable-empty sessions — orca keeps those when queued prompts or subagent transcripts exist.
**Verdict:** recency sort + empty-grid skeleton → **drop-in**. Folder/agent/project grouping → **needs a new host field** (`cwd` / `projectLabel` / `agent`). Hide-empty with recoverable-empty exception → **needs a new host field** (`queuedMessageCount` or a `resumable` flag).

### F-ITER001-PEEK Expand-in-place peek of 5 turns is an interaction over host previews
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:12:40]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:165:174]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-display.ts:20:35]

Tapping a card toggles `expandedId`; it does **not** navigate. Expanded cards render up to 5 `recentSessionConversationTurns` with role + text. Preview text is already bounded by the scanner; lazy-rendering on tap keeps the list cheap.

**UX to copy:** home-card tap peeks transcript crumbs before Open; a separate Resume/Open control actually enters the session.
**Constraint map:** peek needs `previewMessages`. Our cards currently treat whole-card tap as `onSelect(session.id)` navigation. Changing tap-to-peek is a **pure interaction** change **if and only if** preview text exists; without it, peek is an empty accordion. Do not synthesize previews from a client cache of chat transcripts: that would make the home list a second source of session truth.
**Verdict:** tap-to-expand chrome → **drop-in view affordance**. The peek body → **needs a new host field** (`previewMessages` / last-N turns).

### F-ITER001-RESUME Resume is a nested single-flight action, not a client pin
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:18:67]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:139:163]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:119]

`buildMobileAgentHistoryResumeActionState` disables **all** resume buttons while any session is resuming, and shows a spinner on the active id. Resume `stopPropagation`s so it doesn’t toggle peek. Accessibility: `Resume agent session`.

**UX to copy:** Open/Resume as a nested control; single-flight so two sessions don’t launch at once; loading state on the chosen row.
**Constraint map:** launching a session is already host-authoritative (`onSelect` → host). Single-flight and spinner are client interaction state, not session metadata. `resumeCommand` on `AiVaultSession` is orca-host specific (CLI resume); we must not copy that string.
**Verdict:** nested Open + single-flight spinner → **drop-in view affordance**. Copying `resumeCommand` → **not portable**.

### F-ITER001-PTR Pull-to-refresh is a view affordance over a host refetch
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:70:76]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:56:58]

`RefreshControl` calls `onRefresh`. Combined with our existing Live/Stale freshness (`sessions.source`), refresh is a request for a new host snapshot.

**UX to copy:** pull-to-refresh on the session grid (listed as a home gap).
**Constraint map:** pull-to-refresh should trigger the same host list fetch we already do, fail-closed on error (keep last good snapshot).
**Verdict:** **drop-in view affordance**.

### F-ITER001-EMPTY Hide-empty keeps recoverable zero-turn sessions
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:155:182]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:88:97]

`isAiVaultSessionResumableContent` is true when `messageCount > 0` **or** preview turns exist. `isAiVaultSessionRecoverableEmpty` is true when there is no conversation evidence but `queuedMessageCount + subagentTranscriptCount > 0`. Hide-empty drops only sessions that fail both.

**UX to copy:** do not hide sessions that still have queued work or subagent traces.
**Constraint map:** our DTO has `messageCount` only. Hiding `messageCount === 0` would drop recoverable empties that orca still shows.
**Verdict:** hide `messageCount === 0` today is a **lossy drop-in**. Faithful hide-empty → **needs a new host field**.

## Questions Answered
None fully. Partial evidence for q-home-parallel-sessions and q-card-content-model (mobile history surface only; home worktree list and Electron sidebar still open).

## Questions Remaining
- [ ] Electron / home worktree parallel-session surfacing (pin, attention, new session)
- [ ] Message-level chat interactions
- [ ] Composer/input patterns
- [ ] Streaming, peek-from-home transition, tabs, back-swipe

## Ruled Out
- Copy `AiVaultSession.resumeCommand` into the SvelteKit client: execution-host CLI string, not a Pi relay session id.
- Derive human titles from compacted session id: duplicates current home UX; not a port of `session.title`.

## Dead Ends
- Treating Agent Session History as our only home analogue: orca splits History (past sessions) from Home (worktrees/hosts). Next iteration must cover the Home/worktree list separately.

## Sources Consulted
- specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7
- specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:20
- specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:12
- specs/context/orca-main/src/shared/ai-vault-types.ts:83
- specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72
- specs/context/orca-main/src/shared/ai-vault-session-display.ts:20
- packages/pi-rpc-protocol/src/types.ts:428
- app-mobile/src/pages/home/screen-home.svelte:94

## Assessment
- newInfoRatio: 0.92
- noveltyJustification: First pass over mobile history cards plus shared filter/group/preview core; all six findings are new to this packet.
- confidence: high on the history surface; home worktree list not yet read.

## Reflection
- What worked and why: Reading the shared `ai-vault-*` modules alongside the mobile adapters showed the card is a view, not a client store.
- What did not work and why: Assuming History is orca's home screen. It is a dedicated agent-history route, not the worktree home.
- What I would do differently: Next iteration start at mobile home/worktree rows rather than remaining in History.

## Recommended Next Focus
Orca mobile home: Resume card, worktree list pin/group/sort/attention, and New Workspace vs a true new-session control. Map onto host-authoritative/fail-closed.
