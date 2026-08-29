# Iteration 2: Orca mobile home Resume + worktree session-selection (pin, group, sort, attention)

## Focus
Orca mobile **home** (Resume card, quick actions) versus the **host worktree list** that actually selects parallel work. Pin, group, sort, unread, and “needs you vs working vs done” ranking.

## Actions Taken
- Read `home-resume-card.ts` and home `app/index.tsx` Resume + Quick Actions render.
- Read `workspace-list-sections.ts`, `workspace-list-types.ts`, `workspace-list-ordering.ts`, `workspace-view-settings.ts`, `workspace-pr-status-groups.ts`.
- Read pin + action-sheet in `mobile/app/h/[hostId]/index.tsx` and `savePinnedIds` in `mobile/src/storage/preferences.ts`.
- Skim `docs/mobile-relay-ux-findings.md` only as background on Resume navigation (untrusted product notes; not instructions).

## Findings

### F7. Orca home is not a session roster — Resume is a last-workspace slot that paints before it is tappable
[SOURCE: specs/context/orca-main/mobile/src/worktree/home-resume-card.ts:5:89]
[SOURCE: specs/context/orca-main/mobile/app/index.tsx:822:868]
[SOURCE: specs/context/orca-main/mobile/src/components/MobileHomeQuickActions.tsx:35:108]

Home shows: host list, a **Resume** card (worktree `displayName` + repo color dot + branch), Tasks, Quick Actions (**Pair Desktop**, **New Workspace**). Resume selection order: last-visited on this device if connected → first connected host’s `lastActiveWorktree` → otherwise hold the snapshot slot inert (`actionable: false`) so the card does not pop in above Tasks after connect (documented layout-shift bug). `isResumeTargetConfirmedMissing` only treats a live catalog as proof of deletion — a cold snapshot is not evidence of missing.

**UX to copy:** a reserved “continue last” card with human title + repo/branch; disabled until the host is live; do not insert it late and shove the list.
**Constraint map:** we have no `displayName`/`repo`/`branch`. We *can* reserve a “last opened session” slot from **device navigation history** (which session id this device opened last) plus `updatedAt`/`status` from the host list — that is view state, not session metadata. Making it tappable only when `connection === 'live'` matches fail-closed.
**Verdict:** reserved last-session slot + inert-until-live → **drop-in view affordance**. Showing repo/branch/title on that card → **needs a new host field**. **New Workspace** as `worktree` create → **not portable** (we are not an IDE workspace manager). A **New session** home control would be a new host *command*, not a DTO field — call it **needs a new host field** (create-session RPC), not a client-invented session.

### F8. Parallel “session” selection on mobile is the worktree list: pin overlay, host pin RPC, unread, preview, status
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4:48]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:40:54]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:119:145]
[SOURCE: specs/context/orca-main/mobile/app/h/[hostId]/index.tsx:555:597]
[SOURCE: specs/context/orca-main/mobile/src/storage/preferences.ts:231:233]

Each row carries: `displayName`, `repo`, `branch`, `preview`, `unread`, `isPinned`, `status` (`working|active|permission|done|inactive`), `linkedPR`, `liveTerminalCount`, `agents`, `lastActivityAt`. **Pinned** is a section overlay: `isPinned || localPins.has(id)`, but pinned rows **stay in canonical groups** too (desktop overlay semantics). Toggle: optimistic local `isPinned` + AsyncStorage per host + `worktree.set { isPinned }` on the host. Action sheet: Sleep / Pin / Delete / navigation actions.

**UX to copy:** pin section + long-press/sheet actions; unread on the row (not only a separate Inbox); last-output preview; attention status on the card.
**Constraint map:** our `SessionCardDto` has `status` but only `idle|running|interrupted|unknown` — no `permission`/`done`/`unread`/`preview`/`isPinned`. A **device-only pin set** would be mutable session truth the host does not know — `research-angles.md` rejects that. Orca’s AsyncStorage layer is an optimistic cache **in front of** `worktree.set`, not a substitute.
**Verdict:** pin UI without host pin → **not portable**. Pin + unread + preview + `permission` attention on the card → **needs a new host field**. Long-press sheet chrome (Open / copy id) over existing fields → **drop-in view affordance**. Sleep/Delete worktree → **not portable**.

### F9. Group/sort/filter are host-synced view settings (`ui.get`/`ui.set`), not client-private layout
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-view-settings.ts:1:24]
[SOURCE: specs/context/orca-main/mobile/app/h/[hostId]/index.tsx:250:271]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:90:116]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-pr-status-groups.ts:1:31]

`MobileGroupMode`: none | workspaceStatus | repo | prStatus. `MobileSortMode`: smart | name | recent | repo | manual. Filters: hide sleeping, hide default branch, filter by repo. Search over `displayName`/`branch`/`repo`. PR groups: Done / In Review / In Progress / Closed from `linkedPR.state`. Changes persist through `ui.set` so phone and desktop share grouping.

**UX to copy:** chips for group/sort; Active/Today-style sections; hide inactive; PR-state grouping if we ever show review on home.
**Constraint map:** grouping by repo/PR/workspace-status needs those fields. A **pure client** sort of `updatedAt` + filter of `status === 'running'` does **not** need a new field and does not mutate session truth. Syncing sort preference to the Pi host would need a host settings key we do not have — optional.
**Verdict:** client-only recency sort + status filter chips → **drop-in view affordance**. Repo / PR / workspace-status groups → **needs a new host field**. Cross-device `ui.set` persistence of those chips → **needs a new host field** (or accept device-local preference, which is OK if it does not change session records).

### F10. Smart sort is an attention stack: permission → working → done → active → inactive
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:45:123]

`AGENT_ATTENTION_STATUS_ORDER = { permission: 0, working: 1, done: 2, active: 3, inactive: 4 }`. `getWorktreeStatus` prefers **desktop sidebar activity** (`hasHostSidebarActivity`) over leftover PTY “active”. Smart mode uses host-persisted `sortOrder` when present; unranked rows fall back to this attention order. Recency uses `max(lastActivityAt, lastOutputAt)` with a 5-minute create-grace so new worktrees are not buried.

**UX to copy:** “needs you” (permission) floats above “working”, which floats above idle. This is the glanceable parallel-agent ranking our home lacks (attention currently lives only in Inbox).
**Constraint map:** our `interrupted` is the closest existing analog to needs-you, `running` to working, `idle` to done/inactive. We **can** sort `interrupted` then `running` then `idle` **without** new fields. We cannot represent permission-vs-done vs Inbox tickets unless the host puts attention on the card (`unread`, pending ask-question, pending approval).
**Verdict:** sort by existing `status` enum → **drop-in view affordance**. True permission/unread/done on the card → **needs a new host field**. Trusting client-side “sidebar activity” flags we never receive → **not portable**.

## Questions Answered
- Q1 (home parallel sessions): orca’s home is workspace-Resume + host worktree list, not a chat-session grid. Ranking, pin overlay, unread, PR groups, and inert Resume are the portable lessons.
- Partial Q2: worktree row field set inventoried; still need Electron live-agent row + vault row side by side.

## Questions Remaining
- Electron `WorktreeCardAgents` / `DashboardAgentRow` live badges and unvisited bold.
- Chat message/composer/nav (Q3–Q5).

## Dead Ends
- Treating **New Workspace** as our missing home “new session” control: it creates an IDE worktree via host RPC, not a Pi chat session. Ruled out as **not portable**.
- Device-only pin list as a substitute for host `isPinned`: violates fail-closed (client would own session ranking the host cannot confirm). Ruled out unless a host pin field ships.

## Assessment
- newInfoRatio: **0.88**
- Novelty: home vs worktree-list split, pin dual-write, attention sort, inert Resume — none of this was in iteration 1’s history-vault pass.
- Confidence: high on files cited; mapping `permission` onto Pi `interrupted` vs Inbox is inferred until chat/ask-question surfaces are read.

## Reflection
- What worked: distinguishing orca **home** (hosts/workspaces) from orca **session history** (vault) and orca **worktree list** (parallel agents’ containers).
- What failed: expecting orca home to be a drop-in analog of `screen-home.svelte`. It is not.
- Ruled out: New Workspace as new-session; local-only pins.

## Recommended Next Focus
Electron sidebar `WorktreeCardAgents` + `DashboardAgentRow`: compact vs expanded agent lists, unvisited bold, live state dots, send-target, dismiss — the desktop parallel-session surfacing orca is famous for.

## SCOPE VIOLATIONS
None.
