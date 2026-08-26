# Iteration 4: Session-card content-model matrix vs SessionCardDto

## Focus
One table of orca fields across Agent History, home worktree rows, and Electron agent/history rows versus our `SessionCardDto`. Produce a minimum host-field bundle and mark false drop-ins.

## Actions Taken
- Re-read DTO (`packages/pi-rpc-protocol/src/types.ts`) and home card (`screen-home.svelte`).
- Cross-walk fields already cited in iterations 1–3 (no new surfaces except `parseVaultQuery` operators for search columns).
- Read `parseVaultQuery` (`ai-vault-session-filters.ts:177`) for search-operator completeness.

## Findings

### F-ITER004-MATRIX Four objects, one DTO
[SOURCE: packages/pi-rpc-protocol/src/types.ts:428:433]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83:120]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48]
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-row-display.tsx:30:99]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:94:108]

| Field / affordance | History card (`AiVaultSession`) | Home worktree row | Electron agent row | Our DTO / home | Verdict |
|---|---|---|---|---|---|
| id | host session id | worktreeId | paneKey/tabId | `id` | drop-in (opaque) |
| human title | `title` or Untitled | `displayName` | conversation name / orchestration / task preview | compacted `id` | **needs host `title`** |
| last-message preview | `previewMessages` / last turn | `preview` + nested agent lastAssistantMessage | lastAssistantMessage / tool preview | none | **needs host `lastMessagePreview`** |
| agent/model | `agent`, `model` | `agents[].agentType` | agentType + model on history meta | none | **needs host `agent`/`model`** |
| status | liveState overlay; dots omit resting done | rollup working/active/permission/done/inactive | working/blocked/waiting/done/idle/interrupted | idle/running/interrupted/unknown | partial drop-in; **needs blocked/waiting/done** for parity |
| unread / needs-you | not on history card | `unread` bell | ack vs stateStartedAt; unread=done/blocked/waiting | Inbox only | **needs host attention or Inbox join** |
| time | `updatedAt` → timeAgo | lastActivityAt/lastOutputAt | stateStartedAt / doneAt | `updatedAt` → relativeTime | **drop-in** (+ ISO datetime, live tick) |
| messageCount | yes | n/a (terminals) | msgs on history meta | `messageCount` as "blocks" | **drop-in** (relabel) |
| cwd/branch/repo | cwd, branch | repo, branch, path | worktree line | none (home copy forbids paths) | **needs host** if we lift the "opaque only" product rule |
| pin | no | `isPinned` + local overlay + `worktree.set` | n/a on agent row | none | **needs host pin RPC**; device-only **not portable** |
| progress/tokens | totalTokens, queued, subagents | liveTerminalCount, agents | tool preview, cache timer | none | **needs host** (optional) |
| peek | 5 preview turns | expand agents | compact expand | whole-card open | peek body **needs preview**; chrome **drop-in** |
| new | n/a | New Workspace (worktree) | n/a | none | new **session** **needs host RPC**; New Workspace **not portable** |

**Minimum host-field bundle to unlock the ranked home gaps:** `title`, `lastMessagePreview` (or `previewMessages[]`), `agent` (and optional `model`), `attention` (`none|blocked|waiting|completed`), optional `cwd`/`projectLabel`, optional `pinned`. Everything else in the table is either drop-in on today's DTO or not a chat-session object.

**Constraint map:** requesting fields is allowed; synthesizing them from transcript cache or compacted ids is not. Relabeling "blocks"→"messages" and sorting by `updatedAt` do not wait on the host.

### F-ITER004-SEARCH Search operators are host-field consumers, not a client index
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:177:192]

`parseVaultQuery` supports free text plus `repo:` and `path:` tokens (quoted values allowed). Matching runs over host session records already in memory.

**UX to copy:** a search box with optional `repo:`/`path:` once those fields exist; until then a filter on status + recency only.
**Verdict:** search chrome → **drop-in**. Useful query → **needs host fields**. Building a local full-text index of chat transcripts for home search → **not portable** (second source of truth).

### F-ITER004-FALSE Worktree and paneKey objects are false drop-ins onto Pi session cards
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:92:100]

PR badges, PTY counts, lineage children, `paneKey` acks, and `worktree.set` pin are workspace/IDE identity. Copying them onto `SessionCardDto` would pretend a Pi relay session is an orca worktree.

**Verdict:** **not portable**. Steal the *interaction* (overlay pin section, nested open vs peek, unread≠working) not the *object*.

## Questions Answered
- [x] q-card-content-model — matrix + minimum bundle recorded. Remaining: whether product will lift "opaque identifiers only".

## Questions Remaining
- [ ] Message-level chat
- [ ] Composer
- [ ] Streaming / nav

## Ruled Out
- Port full worktree row onto Pi session cards: wrong object (PR/sleep/PTY/lineage).
- Local full-text index of transcripts for home search: second session truth.

## Dead Ends
- Waiting for cwd before shipping recency sort / message-count relabel / pull-to-refresh — those are already legal.

## Sources Consulted
- packages/pi-rpc-protocol/src/types.ts:428
- specs/context/orca-main/src/shared/ai-vault-types.ts:83
- specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4
- specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-row-display.tsx:30
- specs/context/orca-main/src/shared/ai-vault-session-filters.ts:177
- app-mobile/src/pages/home/screen-home.svelte:94

## Assessment
- newInfoRatio: 0.62
- noveltyJustification: Unified field matrix and minimum host-field bundle; sources previously opened but the cross-walk and false-drop-in list are new.
- confidence: high on the matrix; product decision on opaque-ids is out of research scope.

## Reflection
- What worked and why: Tabular cross-walk made "needs host field" vs "wrong object" explicit.
- What did not work and why: Treating Electron paneKey ack as a DTO candidate — we have session ids, not panes.
- What I would do differently: Next iteration leave home and enter native-chat message chrome.

## Recommended Next Focus
Native-chat message-level affordances: copy, scroll-to-message, tool-fold, regenerate/reply/edit-and-resend presence or absence.
