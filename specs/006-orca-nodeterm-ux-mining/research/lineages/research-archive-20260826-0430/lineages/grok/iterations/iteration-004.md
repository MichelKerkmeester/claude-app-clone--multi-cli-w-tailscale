# Iteration 4: Session-card content-model matrix (DTO vs orca lists)

## Focus
One field-by-field map of what orca surfaces on session/worktree/agent rows versus our `SessionCardDto`, with a portability verdict for each. Closes Q2 as a matrix; does not re-litigate grouping UX.

## Actions Taken
- Re-read `SessionCardDto` (`packages/pi-rpc-protocol/src/types.ts:428:433`).
- Cross-walk `AiVaultSession` (`src/shared/ai-vault-types.ts:83:120`), mobile history card (`agent-history-session-card.ts:7:16`), worktree row (`workspace-list-types.ts:4:48`), dashboard row (`DashboardAgentRow.tsx:141:167`).
- Check `epoch` is on other protocol types but not on the session card.

## Findings

### F16. Host-authoritative card model: four live fields vs orca’s ~15 visible ones

| Visible field | Our `SessionCardDto` | Orca vault card | Orca worktree row | Orca live agent row | Verdict |
|---|---|---|---|---|---|
| Identity id | `id` (compacted) | `id` / `sessionId` | `worktreeId` | `paneKey` | **drop-in** (keep opaque until title exists) |
| Lifecycle | `status`: idle/running/interrupted/unknown | live overlay via `AgentStatusState` | `working/active/permission/done/inactive` | `working/blocked/waiting/done/idle` + interrupted/failed/permission | existing enum **drop-in**; permission/waiting/blocked/done **needs host field** |
| Recency | `updatedAt` | `updatedAt`/`modifiedAt` | `lastActivityAt`/`lastOutputAt` | `startedAt` / `doneAt` | **drop-in** (+ live-tick view) |
| Volume | `messageCount` | `messageCount` | — | — | **drop-in** |
| Human title | — | `title` or “Untitled session” | `displayName` | orchestration `displayName`/`taskTitle` or prompt preview | **needs host field** `title` |
| Last-message / preview | — | `lastMessage` from `previewMessages` | `preview` | `lastAssistantMessage` | **needs host field** `preview` |
| Agent identity | — | `agent` + label + icon | `agents[]` | `agentType` + `AgentIcon` | **needs host field** `agent` |
| Model | — | `model` | — | `entry.model` | **needs host field** `model` |
| Project/repo/branch/cwd | — | `cwd`, `branch` | `repo`, `branch`, `path` | inherited from worktree | **needs host field** (any one of cwd/repo/branch) |
| Unread / unvisited | Inbox-only | — | `unread` | ack vs `stateStartedAt` | device-local unvisited **drop-in**; true unread **needs host field** |
| Pin | — | — | `isPinned` + local overlay | — | **needs host field**; local-only **not portable** |
| Tokens / cost | — | `totalTokens` | — | — | **needs host field** |
| Subagent / child count | — | `subagentTranscriptCount` | `agents`, lineage | `childAgentCount` | **needs host field** |
| Needs-you | Inbox/Review surfaces | liveState ≠ done | `permission` | blocked/waiting/permission | **needs host field** `attention` (do not overload Inbox-only) |
| Recoverable empty | hide via `messageCount===0` would drop these | `queuedMessageCount` + “Not saved” | — | — | **needs host field** |
| `epoch` | not on card DTO | — | — | — | already used elsewhere in protocol; **not** a home-card visual |

[SOURCE: packages/pi-rpc-protocol/src/types.ts:428:433]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83:120]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7:52]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:141:167]

**UX to copy:** a card that can be scanned for **who / what / needs-you / last line / when**, not an opaque id + block count.
**Constraint map:** every extra column is host-projected. Client-derived titles, previews, pins, or unread that the host cannot confirm violate fail-closed.
**Recommended host field bundle (minimum to close home gaps):** `title`, `preview` (last conversation turn), `agent`, `attention` (`none|running|needs-input|done`), optional `unreadCount`. Repo/branch/cwd and tokens are the next tier.

### F17. Three orca lists are not one widget — do not port a worktree row onto a Pi session card wholesale
[SOURCE: specs/context/orca-main/mobile/app/index.tsx:822:868]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:27:87]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:53:65]

Orca splits: (1) home = hosts + last **workspace**, (2) history vault = past **chat sessions**, (3) sidebar = live **agent panes** on a worktree. Our home is already (2)-shaped. Copying (1)’s repo/PR/sleep or (3)’s pane split/fork onto (2) is a category error.

**Verdict:** vault card + live attention glyph is the right analog. Worktree pin/sleep/PR groups are **not portable** onto Pi session cards. Live agent rows inform **status/title/unread**, not IDE pane management.

## Questions Answered
- Q2 (session-card content model): answered as the matrix above. Remaining optional: whether Pi host can project `attention` separately from `status`.

## Questions Remaining
- Q3 message-level (copy vs reply/regen) — native-chat files located.
- Q4 composer, Q5 nav.

## Dead Ends
- Porting the full worktree row (PR, sleep, liveTerminalCount, path) onto `session--card`. Wrong object. Ruled out.
- Using `messageCount === 0` as hide-empty without a recoverable flag: would hide orca’s “Not saved” sessions. Ruled out as a silent copy.

## Assessment
- newInfoRatio: **0.62**
- Novelty: the matrix itself is new (prior iterations named fields in isolation). Ratio is not 1.0 because the sources were already opened.
- Confidence: high.

## Reflection
- What worked: forcing every visible orca field through the four-column table so “copy the card” cannot smuggle IDE fields.
- What failed: none.
- Ruled out: worktree-row wholesale port; hide-empty solely by messageCount.

## Recommended Next Focus
Orca native-chat **message-level** affordances: copy, scroll-to-turn, tool-run folding, context menu (fork/title/split vs per-message reply/regen).

## SCOPE VIOLATIONS
None.
