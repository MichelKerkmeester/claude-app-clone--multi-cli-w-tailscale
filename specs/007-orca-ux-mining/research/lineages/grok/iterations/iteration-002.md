# Iteration 2: Mobile home Resume card, worktree list pin/group/sort/attention

## Focus
Orca mobile home: Resume card (inert-until-connected), worktree list pin/group/sort/unread, agent-row attention dots, and New Workspace vs a true new-session control. Map onto host-authoritative/fail-closed.

## Actions Taken
- Read `home-resume-card.ts`, `MobileHomeQuickActions.tsx`, `WorktreeListRow.tsx`, `WorktreeAgentRow.tsx`.
- Read list model: `workspace-list-types.ts`, `workspace-list-sections.ts`, `workspace-list-ordering.ts`, `workspace-pr-status-groups.ts`, `agent-row-display.ts`.
- Grepped pin RPC / `isPinned` / `localPins` across mobile and preload.

## Findings

### F-ITER002-RESUME Home Resume is a last-visited worktree slot, inert until the host is connected
[SOURCE: specs/context/orca-main/mobile/src/worktree/home-resume-card.ts:5:89]

`selectHomeResumeCard` prefers the device's last-visited worktree when that host is `connected`; otherwise a connected host's `lastActiveWorktree`; otherwise it **holds the slot** with a snapshot card whose `actionable: false`. Comment: gating the card on `connected` used to slide Tasks out from under the thumb.

**UX to copy:** a reserved Resume slot that appears immediately from cache and stays inert until the host is live; do not hide it during reconnect.
**Constraint map:** this Resume is **worktree** resume, not Pi session resume. Our home already opens a session via `onSelect(session.id)`. An inert-until-live pattern over our existing freshness banner is legal client interaction state. Last-visited **session id** would be device-local navigation memory, not session metadata — OK if it only chooses which host DTO to highlight, not rewrite the list.
**Verdict:** inert Resume slot + last-opened highlight → **drop-in view affordance**. Copying orca's worktree id / `lastActiveWorktree` catalog → **not portable** onto `SessionCardDto`.

### F-ITER002-NEW New Workspace is not a new chat session
[SOURCE: specs/context/orca-main/mobile/src/components/MobileHomeQuickActions.tsx:35:98]

Quick Actions: Pair Desktop + New Workspace. New Workspace is disabled until a connected host exists; with multiple hosts it opens a picker (`Create Workspace On`). That creates an IDE worktree, not a chat session.

**UX to copy:** a home-level "new" control that is disabled until the host is live, plus a host picker when several hosts exist.
**Constraint map:** our "new session" gap is a Pi session create, which the client cannot invent. A button that asks the **host** to create a session is legal **if** the host exposes that RPC. Pair-desktop is orca-specific pairing chrome.
**Verdict:** disabled-until-live + picker chrome → **drop-in view affordance**. Binding it to worktree create → **not portable**. A real new-session button → **needs a new host field/RPC**. Pair Desktop → **not portable**.

### F-ITER002-ROW Worktree row is a workspace object, not a chat-session card
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48]
[SOURCE: specs/context/orca-main/mobile/src/components/WorktreeListRow.tsx:21:169]

Row fields: `displayName`, `repo`, `branch`, `preview`, `unread`, `isPinned`, `liveTerminalCount`, `linkedPR`, lineage, `agents[]`, rollup `status` (`working|active|permission|done|inactive`). UI: spinner, amber unread bell, bold unread name, PR badge, folder badge, nested agent list, long-press + medium haptic.

**UX to copy:** "needs you" vs working vs done at a glance (spinner + unread bell + nested agent dots); long-press menu with haptic; preview subtitle.
**Constraint map:** almost none of these fields exist on `SessionCardDto`. Mapping `status` idle/running/interrupted onto orca's five-way rollup is a **lossy** view (running≈working, interrupted≈permission/blocked, idle≈inactive/done — done vs idle is indistinguishable). Unread bell on the card is listed as a home gap; orca's `unread` is host-provided. Pin is `isPinned` on the worktree (host) plus a local overlay set.
**Verdict:** haptic long-press chrome → **drop-in**. Status-pill already present → partial **drop-in** (cannot show done vs idle without a host field). Unread bell / preview / branch / PR / agents → **needs a new host field**. Treating a Pi session as a worktree row → **not portable**.

### F-ITER002-PIN Pin is host-backed with a local overlay; device-only pins are not the orca pattern
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:119:139]
[SOURCE: specs/context/orca-main/src/preload/api/worktree-api.ts:164]

`isWorktreePinned(w, localPins) => w.isPinned || localPins.has(w.worktreeId)`. Pinned rows are an **overlay section** while remaining in canonical groups (desktop parity). `isPinned` is a worktree-api field.

**UX to copy:** pinned overlay at top of the list; pin survives relaunch because the host owns it.
**Constraint map:** a client-only pin set would be mutable session truth the host does not know. Fail-closed forbids that as the source of truth. A local overlay **in addition to** a host `pinned` flag is how orca handles optimistic UI.
**Verdict:** pin overlay layout → **drop-in**. Actual pin → **needs a new host field** (`pinned` on the session DTO or a pin RPC). Device-only pin set without host → **not portable**.

### F-ITER002-SORT Sections: Pinned overlay, hide-sleeping, PR groups, attention sort
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:37:117]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:45:81]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-pr-status-groups.ts:4:31]

`isWorktreeActive`: host sidebar activity OR unread OR non-inactive status OR live terminals. Hide-sleeping keeps the project's main worktree. Search matches displayName/branch/repo. Sort modes include name, recent (activity/output timestamps with a 5-minute create-grace), manual (host `manualOrder`/`sortOrder`), and agent-attention (`permission > working > done > active > inactive`).

**UX to copy:** search box; Active vs sleeping filter; attention-first sort so "needs you" floats up; optional Today/recency sort.
**Constraint map:** recency sort on `updatedAt` is legal today. Attention sort needs `status` plus a blocked/waiting signal — our `interrupted` can stand in for permission only if we accept that mapping. Search over compacted ids is a weak drop-in; useful search needs title/preview. Hide-sleeping has no analogue unless we define sleeping as `idle && messageCount===0`.
**Verdict:** recency sort + search chrome → **drop-in** (search quality **needs host fields**). Attention sort → **drop-in** over `status` with a documented mapping, or **needs a new host field** for blocked/waiting/done. PR grouping → **not portable** to chat sessions.

### F-ITER002-AGENT Nested agent rows: state dot, last message, unvisited bold, 30-min stale decay
[SOURCE: specs/context/orca-main/mobile/src/components/WorktreeAgentRow.tsx:20:37]
[SOURCE: specs/context/orca-main/mobile/src/worktree/agent-row-display.ts:7:66]

`agentDotState`: interrupted → interrupted; working/blocked/waiting decay to idle after 30 minutes; done stays done. Display label prefers `lastAssistantMessage`, then user `prompt`, then a human state label so a row is never blank. Unvisited (worktree unread) bolds the label.

**UX to copy:** never-blank subtitle (last message → prompt → state); needs-you vocabulary (blocked/waiting) distinct from working; stale decay so a crashed agent does not look live forever.
**Constraint map:** our `status` has no blocked/waiting/done. Stale decay of `running` using `updatedAt` is a **client view** over an existing timestamp — legal if we do not persist a new status. Last-message subtitle **needs a host field**. Unvisited bold **needs unread/ack** from the host or we misuse Inbox.
**Verdict:** stale-decay of running using `updatedAt` → **drop-in view affordance**. Never-blank last-message label → **needs a new host field**. Blocked/waiting dots → **needs a new host field**. Fusing Inbox attention onto the card as unread → **drop-in** only as a **view join** of existing Inbox signals, not as client-owned unread.

## Questions Answered
Partial: q-home-parallel-sessions now covers mobile home/worktree, distinct from Agent History. q-card-content-model: worktree rows are the wrong object for Pi session cards.

## Questions Remaining
- [ ] Electron sidebar agent-row unread/unvisited/sessionBoundary (cross-surface)
- [ ] Message-level chat interactions
- [ ] Composer/input
- [ ] Session→chat navigation

## Ruled Out
- Treat New Workspace as our home new-session control: creates an IDE worktree, not a Pi chat session.
- Device-only pin set without host `isPinned`: mutable session truth, violates fail-closed.

## Dead Ends
- Porting the full worktree row (PR, PTY count, lineage, folder workspaces) onto session cards: wrong object.

## Sources Consulted
- specs/context/orca-main/mobile/src/worktree/home-resume-card.ts:5
- specs/context/orca-main/mobile/src/components/MobileHomeQuickActions.tsx:35
- specs/context/orca-main/mobile/src/components/WorktreeListRow.tsx:21
- specs/context/orca-main/mobile/src/components/WorktreeAgentRow.tsx:20
- specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4
- specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:37
- specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:45
- specs/context/orca-main/mobile/src/worktree/agent-row-display.ts:7
- specs/context/orca-main/src/preload/api/worktree-api.ts:164

## Assessment
- newInfoRatio: 0.88
- noveltyJustification: Home vs History split, inert Resume, host pin overlay, attention-order sort, and nested agent-dot vocabulary are new versus iteration 1.
- confidence: high on mobile home; Electron sidebar unread/ack still unread.

## Reflection
- What worked and why: Separating History (chat sessions) from Home (worktrees) prevented a false drop-in of PR/PTY chrome onto Pi cards.
- What did not work and why: Searching for a session-pin RPC on mobile home — pins are worktree pins.
- What I would do differently: Next, read Electron `WorktreeCardAgents` / unread count so the "needs you" vocabulary is cross-surface.

## Recommended Next Focus
Electron parallel-agent rows: state dots, unvisited/ack, sessionBoundary unread exclusion, compact summary. Compare to mobile agent rows and our status pill.
