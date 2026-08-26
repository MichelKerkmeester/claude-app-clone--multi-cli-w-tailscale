# Iteration 1: Mobile Agent Session History list (card, group, peek, resume)

## Focus
Orca mobile Agent Session History: card fields, section grouping, expand-to-peek preview, pull-to-refresh, and the in-row Resume action. Map each affordance onto our `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`) and the host-authoritative/fail-closed constraint.

## Actions Taken
- Read `specs/007-orca-ux-mining/research-angles.md` and our home card (`app-mobile/src/pages/home/screen-home.svelte`) plus `SessionCardDto`.
- Read orca mobile history: `agent-history-session-card.ts`, `agent-history-sections.ts`, `MobileAgentSessionHistoryList.tsx`.
- Read shared list core: `ai-vault-types.ts`, `ai-vault-session-filters.ts`, `ai-vault-session-display.ts`.
- Peeked Electron row metadata (`ai-vault-session-row-display.tsx`) and sidebar inline agents (`WorktreeCardAgents.tsx`) to confirm the same content model, not to exhaust those surfaces.

## Findings

### F1. Session card is a derived view over a host-owned `AiVaultSession`, not client-authored metadata
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7:52]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83:120]

Orca’s mobile card is built by `buildMobileAgentHistoryCard(session, activeWorktreePath, now)` from a host-scanned `AiVaultSession`. The card type is:

- `id`, `agent`, `agentLabel`
- `title` (`session.title || 'Untitled session'`)
- `lastMessage` (latest user/assistant preview turn)
- `messageCount`, `timeAgo`
- `isCurrentWorktree` (cwd path-prefix vs active worktree)

`AiVaultSession` itself is much richer: `title`, `cwd`, `branch`, `model`, `previewMessages`, `totalTokens`, `queuedMessageCount`, `subagentTranscriptCount`, `resumeCommand`, host id, timestamps.

**UX to copy:** a card that shows human title + last-message preview + agent identity + relative time + message count, with “untitled” as a host-safe fallback.
**Constraint map:** title, last message, agent, cwd, model, tokens are **not** on `SessionCardDto`. Deriving a fake title from our opaque `id` would still be a compacted id (what we already do). Inventing a title on the client would be mutable session truth.
**Verdict:** **needs a new host field** (at least `title`, `lastMessagePreview`, `agent`/`model`). `messageCount` + `updatedAt` → **drop-in view affordance**. Compacted `id` stays until a title field exists.

### F2. Home list groups by folder and sorts by `updated`, with Workspace/Project narrowing as a client view over host paths
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:20:58]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72:144]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:245:277]

`buildMobileAgentHistorySections` reuses the shared filter core:

- query + agent set + `sort: 'updated'` + `hideEmptySessions: true`
- scoped tabs (`workspace` / `project` / `all`) **narrow by cwd path-prefix on the client** because the host treats `scopePaths` as a widening union
- groups with `groupAiVaultSessions(filtered, 'folder')` using last-two path segments as the section label
- empty-scope-path fallback: do **not** flash an empty list; show unnarrowed until worktrees resolve

Section headers show `label` + count (`MobileAgentSessionHistoryList.tsx:77-83`).

**UX to copy:** Active / workspace-scoped sections with counts; sort by recency; hide genuinely empty sessions; don’t flash empty while catalogs load.
**Constraint map:** grouping by folder/repo/agent requires `cwd` or a host-provided `projectKey`/`agent`. Recency sort on `updatedAt` is legal today. Hiding empty sessions is legal via `messageCount === 0` **only if** we accept losing “recoverable empty” sessions — orca keeps those when queued prompts or subagent transcripts exist (`queuedMessageCount`, `subagentTranscriptCount`), which we do not have.
**Verdict:** recency sort + empty-grid skeleton → **drop-in**. Folder/agent/project grouping → **needs a new host field** (`cwd` / `projectLabel` / `agent`). Hide-empty with recoverable-empty exception → **needs a new host field** (`queuedMessageCount` or a `resumable` flag).

### F3. Expand-in-place peek (5 turns) is a pure interaction pattern over host preview messages
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:12:15]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:37:40]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:165:174]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-display.ts:20:35]

Tapping a card toggles `expandedId`; it does **not** navigate. Expanded cards render up to 5 `recentSessionConversationTurns` with role + text. Preview text is already bounded by the scanner; lazy-rendering on tap keeps the list cheap.

**UX to copy:** home-card tap peeks transcript crumbs before Open; a separate Resume/Open control actually enters the session (F4).
**Constraint map:** peek needs `previewMessages` (or a host-provided preview projection). Our cards currently treat whole-card tap as `onSelect(session.id)` navigation. Changing tap-to-peek is a **pure interaction** change **if and only if** preview text exists; without it, peek is an empty accordion.
**Verdict:** tap-to-expand interaction chrome → **drop-in view affordance** (layout only). The peek body → **needs a new host field** (`previewMessages` / last-N turns). Do not synthesize previews from client cache of chat transcripts: that would make the home list a second source of session truth.

### F4. Resume is a distinct in-row action with global single-flight, not a client-owned pin
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:18:67]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:139:163]

`buildMobileAgentHistoryResumeActionState` disables **all** resume buttons while any session is resuming, and shows a spinner on the active id. Resume `stopPropagation`s so it doesn’t toggle peek. Accessibility: `Resume agent session`.

**UX to copy:** Open/Resume as a nested control; single-flight so two sessions don’t launch at once; loading state on the chosen row.
**Constraint map:** launching a session is already host-authoritative (`onSelect` → host). Single-flight and spinner are client interaction state, not session metadata. `resumeCommand` on `AiVaultSession` is orca-host specific (CLI resume); we must not copy that string into our client.
**Verdict:** nested Open + single-flight spinner → **drop-in view affordance**. Copying `resumeCommand` → **not portable**.

### F5. Pull-to-refresh is a view affordance over a host refetch, not local mutation
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:70:76]

`RefreshControl` calls `onRefresh`. Combined with home-resume-card’s “inert until connected” pattern (read this iteration, documented next), refresh is a request for a new host snapshot.

**UX to copy:** pull-to-refresh on the session grid (listed as a home gap in `research-angles.md`).
**Constraint map:** our home already distinguishes live vs cache via `Freshness` / `sessions.source`. Pull-to-refresh should trigger the same host list fetch we already do, fail-closed on error (keep last good snapshot).
**Verdict:** **drop-in view affordance**.

### F6. Search query matches title, agent, branch, model, cwd, file path, and preview text — none of which we have except id
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:177:242]

`parseVaultQuery` supports free text plus `repo:` / `path:` operators (quoted values allowed). Search haystack is title, sessionId, agent, branch, model, cwd, filePath, preview text. Oversize queries (2 KiB) return no matches.

**UX to copy:** a search field with operators is the right end-state for a dense parallel-session list.
**Constraint map:** searching compacted ids is nearly useless. A client-side search over fields the host never sent would either no-op or require us to retain extra transcript text locally.
**Verdict:** search chrome can be a **drop-in** empty-state later; useful search → **needs a new host field** (title + preview at minimum). `repo:`/`path:` → **needs a new host field** (`cwd` / project label).

## Questions Answered
- Partial: how orca lists/groups/sorts/badges on **mobile history** (Q1). Electron sidebar and live-agent “needs you” badges remain open.
- Partial: card content model (Q2) for the mobile history card; Electron `SessionMetadata` (agent, msgs, subagents, model, worktree line, “Not saved”) confirmed as the richer sibling, not fully inventoried.

## Questions Remaining
- Electron `WorktreeCardAgents` live status / unvisited bold / compact summary (Q1 remainder).
- Full field-by-field DTO mapping table (Q2 remainder).
- Message-level chat, composer, nav (Q3–Q5).

## Dead Ends
- Treating orca’s `resumeCommand` as something our SvelteKit client can emit: it is an orca execution-host CLI string, not a Pi relay session id. Ruled out as **not portable**.
- Inventing home titles from compacted `id`: duplicates current UX; not a port of orca’s `session.title`. Ruled out as a false drop-in.

## Assessment
- newInfoRatio: **0.92**
- Novelty: first pass over the actual mobile history card + shared filter/group/preview core; all six findings are new to this packet. Electron row metadata peeked but not exhausted (partial credit, not 1.0).
- Confidence: high on mobile history; medium on how much of `AiVaultSession` the Pi host could actually project without becoming orca.

## Reflection
- What worked: reading the shared `/src/shared` filter+display modules (explicitly lifted out of renderer so mobile can import them) — that is the portable logic, not the RN `SectionList` chrome.
- What failed: none blocking. Did not yet open live-agent sidebar rows (different list: running panes vs history vault).
- Ruled out: client-owned titles; copying `resumeCommand`.

## Recommended Next Focus
Orca mobile **home** (not history): `home-resume-card.ts`, workspace sections (pin, search, group, sort, PR-status groups), and how Resume stays inert until the host is connected — contrast with our thin session grid.

## SCOPE VIOLATIONS
None.
