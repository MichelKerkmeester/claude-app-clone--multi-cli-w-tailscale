# Iteration 3: Electron parallel-agent rows (state dots, unvisited, unread, compact summary)

## Focus
Orca Electron sidebar/dashboard agent rows: glanceable state, unvisited bold, unread badge math, compact “N agents” summary, conversation-name vs prompt, tool preview, lineage.

## Actions Taken
- Read `DashboardAgentRow.tsx`, `AgentStateDot.tsx`, `agent-row-primary-text.ts`, `useActivityUnreadCount.ts`, `WorktreeCardAgents.tsx` (unvisited map), `worktree-card-compact-agents.tsx`.
- Cross-check with iteration 2’s worktree `status` vocabulary.

## Findings

### F11. One leading state glyph column: who vs what, with `permission` labeled “Needs attention”
[SOURCE: specs/context/orca-main/src/renderer/src/components/AgentStateDot.tsx:7:55]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:18:29]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:166:249]

`AgentStateDot` is explicitly **not** fused with the agent icon: icon = who, dot = what. Vocabulary: working (spinner), blocked, waiting (“Waiting for input”), interrupted, failed, done (check, distinct from idle grey), idle, permission (“Needs attention”). Dashboard maps `working|blocked|waiting|done|idle`; `interrupted` overrides the live state because it is a terminal outcome. Tool preview only while working/waiting so a leftover tool line cannot look still-running.

**UX to copy:** a scannable status column on every home card; spinner for running; distinct done vs idle; “needs attention” for permission/waiting/blocked — not a second Inbox-only surface.
**Constraint map:** we already have `SessionStateIcon` on `idle|running|interrupted|unknown`. We can restyle that column (spinner vs check) as a **drop-in**. We cannot show waiting/blocked/permission without host signals (ask-question pending, approval pending). `interrupted` already exists on our DTO.
**Verdict:** glyph restyle for existing statuses → **drop-in view affordance**. Waiting/blocked/permission/failed on the card → **needs a new host field**. Fusing identity + state into one glyph (orca warns against this) → **not portable** as a copy target.

### F12. Unvisited is ack-map vs `stateStartedAt`, persisted so relaunch does not re-bold
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:92:100]
[SOURCE: specs/context/orca-main/src/renderer/src/store/slices/ui.ts:610]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:62:63]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:267]

`unvisitedByPaneKey = ackAt < entry.stateStartedAt`. Bold prompt uses the **card’s** unvisited signal, not per-agent local UI state. Ack map is persisted in UI store. Clicking a row `onActivate(tabId, paneKey)` so the caller can mark-visit that exact row.

**UX to copy:** unread/unvisited **on the session card** (our gap: attention lives only in Inbox); bold until the user opens that session; persist visit on this device.
**Constraint map:** a device-local “opened at” map keyed by session id is **view state**, not session metadata — fail-closed as long as we do not pretend the host agrees. True unread that survives devices needs host `unread` / last-read cursor. Do not treat Inbox ticket count as a substitute without putting a badge on the card.
**Verdict:** device-local unvisited bold after open → **drop-in view affordance**. Cross-device unread → **needs a new host field**.

### F13. Activity unread counts done/blocked/waiting, and explicitly ignores session-boundary idle connects
[SOURCE: specs/context/orca-main/src/renderer/src/components/activity/useActivityUnreadCount.ts:33:78]

`isUnreadAgentState = done | blocked | waiting`. Sidebar-badge mode also counts unread **worktrees** (`worktree.isUnread`). A `sessionBoundary` done is **not** an event to read (STA-3386: connecting to a session is not completing a turn). Sidebar-badge still counts a displaced real completion so resume does not drop the badge.

**UX to copy:** global unread = sessions that finished or need input since last ack — not “is currently running”. Don’t badge a mere reconnect.
**Constraint map:** we cannot compute this from `status` alone (`idle` conflates never-started, done, and paused). Need host `attentionReason` or last terminal event type.
**Verdict:** **needs a new host field** (`attention` / `lastTerminalEvent`). Counting `running` as unread → **not portable** (wrong semantics).

### F14. Compact worktree header summarizes N agents; expand reveals rows; send-target mode hijacks click
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agents.tsx:77:100]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:110:120]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:121:139]

Collapsed card shows up to 3 agent-identity groups plus overflow count. Expansion keeps children mounted for collapse animation (`inert` when collapsed). Send-target popover: eligible/disabled/sending; disabled includes “Agent needs permission”; click sends instead of navigating.

**UX to copy:** if one Pi session can fan out sub-agents, a compact count on the home card with expand. Send-to-agent from the list is orca’s parallel-agent specialty.
**Constraint map:** we have one session per card and no subagent count on `SessionCardDto`. Compact summary is meaningless until the host projects `subagentTranscriptCount` (vault already has it) or live child agents. Send-target from home would be a **host command** (steer/send to session), which we already do **inside** chat (Send/Steer), not from home.
**Verdict:** compact N-agents on card → **needs a new host field**. Home-row steer/send → **needs a new host field** (or reuse in-session send; duplicating it on home without live eligibility is **not portable**). Collapse/expand chrome → **drop-in** once there is more than one row of data.

### F15. Row title prefers orchestration displayName/taskTitle over raw prompt; terse follow-ups are not titles
[SOURCE: specs/context/orca-main/src/renderer/src/lib/agent-row-primary-text.ts:48:66]
[SOURCE: specs/context/orca-main/src/renderer/src/lib/activity-thread-display.ts:15:40]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:143:147]

`getAgentRowPrimaryText` never shows the “You are working inside Orca…” preamble. Orchestration labels only while they still match the live dispatch task id. Fallback: TASK-body preview, then raw prompt, then state label. `isTerseAgentFollowUpPrompt` rejects “yes”/“ok proceed” as scan labels. Relative time is a **shared `now` tick** (not per-row interval) — `useNow`.

**UX to copy:** human title = latest substantive user task, not last keystroke; live-tick relative time on cards (our gap).
**Constraint map:** title derivation belongs on the **host** (orca derives from agent-status IPC). Client-side “last message” from a transcript we may not have on home is fail-open invention. Shared clock for relative time is a pure view affordance on `updatedAt`.
**Verdict:** live-tick `updatedAt` → **drop-in view affordance**. Title from orchestration/prompt → **needs a new host field** (`title` already on `AiVaultSession`; live agent-status `displayName` is a second, hotter field). Client-side terse-follow-up filtering on a lastMessage the host already chose → optional **drop-in** once preview exists.

## Questions Answered
- Q1 remainder (Electron parallel surfacing): state column, unvisited, unread math, compact summary, send-target, title derivation.
- Partial Q2: live-agent row fields vs vault card vs worktree row — still needs a single matrix (next).

## Questions Remaining
- Unified field matrix (Q2 closeout).
- Message-level / composer / nav (Q3–Q5). Native-chat surfaces located for next iterations.

## Dead Ends
- Treating `running` as unread: orca unread is done/blocked/waiting, not working. Ruled out.
- Fusing agent identity icon with status (orca’s own anti-pattern). Ruled out as a copy target.

## Assessment
- newInfoRatio: **0.84**
- Novelty: Electron-only glance language (dots, ack unread, sessionBoundary, compact summary) not covered in mobile history/home passes.
- Confidence: high on cited files.

## Reflection
- What worked: reading the shared `AgentStateDot` vocabulary once — it is the desktop analog of our `SessionStateIcon`.
- What failed: none.
- Ruled out: running-as-unread; fused identity+state glyph.

## Recommended Next Focus
Build the session-card content-model matrix: `SessionCardDto` vs `AiVaultSession` vs worktree row vs `DashboardAgentRow` — every visible field with a portability verdict.

## SCOPE VIOLATIONS
None.
