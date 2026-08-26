# Iteration 3: Electron parallel-agent rows — unread, unvisited, sessionBoundary

## Focus
Electron sidebar/dashboard agent rows: state-dot vocabulary, ack-based unvisited, sessionBoundary unread exclusion, compact summary, and the desktop Agent Session History metadata row. Compare to mobile and to our status pill.

## Actions Taken
- Read `useActivityUnreadCount.ts`, `WorktreeCardAgents.tsx` unvisited derivation, `DashboardAgentRow.tsx`, `worktree-card-compact-agent-row.tsx`.
- Read `ai-vault-session-row-display.tsx` SessionMetadata and `ai-vault-session-time.tsx`.
- Read title derivation: `agent-row-primary-text.ts`, `use-agent-row-conversation-name.ts`.

## Findings

### F-ITER003-UNREAD Unread is done/blocked/waiting, never working, and sessionBoundary done is excluded
[SOURCE: specs/context/orca-main/src/renderer/src/components/activity/useActivityUnreadCount.ts:33:78]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:92:100]

`isUnreadAgentState` = `done | blocked | waiting`. Working agents do **not** increment unread. A `sessionBoundary === true` done is an idle connect (STA-3386), not an event to read; sidebar-badge mode still counts a displaced real completion from `stateHistory`. Unvisited on a row is `ackAt < stateStartedAt` from persisted `acknowledgedAgentsByPaneKey`.

**UX to copy:** badge "needs you" (blocked/waiting) and "finished while you were away" (done), not "currently working". Ack on visit so the card un-bolds. Do not treat a resume/connect boundary as unread.
**Constraint map:** our `status=running` is the opposite of orca unread. Mapping running→unread would be a false drop-in. `interrupted` is closer to blocked/waiting. Done vs idle is missing on `SessionCardDto`. Ack timestamps are client view state **if** keyed by host session id and not treated as session metadata the host must round-trip — but orca persists acks in the desktop store. A mobile client ack store is local UX, fail-closed as long as it never edits the session DTO; it can go stale vs another device.
**Verdict:** do-not-badge-working → **drop-in** (keep working as a status pill, put unread elsewhere). True unread → **needs a new host field** (`attention: blocked|waiting|completed-unacked`) **or** a view-join of our Inbox. Client-only ack store → portable as **drop-in view affordance** with a multi-device staleness caveat.

### F-ITER003-DOT Live attention dots omit resting done
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-row-display.tsx:53:55]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:18:28]

History SessionMetadata: `'done' is the resting state of every finished pane — badging it would mark most rows; only live attention states earn a dot.` Compact/dashboard rows still show a done dot in the working list because that list is live agents.

**UX to copy:** on a recency-sorted home list of many finished sessions, do not put a done dot on every card. Reserve the extra glyph for blocked/waiting/running.
**Constraint map:** our status pill already shows idle/running/interrupted. Adding a second "done" glyph without a host done state is invention.
**Verdict:** omit-done-dot on a history list → **drop-in view affordance**. Extra blocked/waiting glyph → **needs a new host field**.

### F-ITER003-TITLE Titles prefer conversation name / orchestration label / task preview, never dispatch preamble
[SOURCE: specs/context/orca-main/src/renderer/src/lib/agent-row-primary-text.ts:48:66]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/use-agent-row-conversation-name.ts:27:68]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agent-row.tsx:32:57]

Primary text chain: matching orchestration `displayName`/`taskTitle` → TASK-body preview → raw prompt. Compact primary: conversation name (tab auto-title) else that chain else state label. Compact secondary: interrupted reason → tool preview → last assistant message → agent type. Subagents must not steal the parent tab title.

**UX to copy:** never-blank title that is a **host-derived** conversation name, not the first 40 chars of a system preamble.
**Constraint map:** we cannot parse Pi prompts on the client to invent titles (fail-closed, and our home copy says "Opaque identifiers only. No prompts"). Auto-generated titles belong on the host (orca's `tabAutoGenerateTitle` is a host setting producing a tab title).
**Verdict:** **needs a new host field** (`title` / `summary`). Client-side prompt slicing → **not portable**.

### F-ITER003-COMPACT Compact rows stopPropagation so nested activate ≠ open worktree
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agent-row.tsx:68:74]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:55:59]

Enter/Space on nested agent buttons stay local; activate passes `paneKey` so the caller can mark-visit that row. Same idea as mobile History Resume `stopPropagation`.

**UX to copy:** if home cards grow nested "open" vs "peek", nested controls must not trigger the card navigation.
**Constraint map:** pure interaction.
**Verdict:** **drop-in view affordance**.

### F-ITER003-META Electron history metadata: msgs, subagents, Not saved, live tick, model
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-row-display.tsx:56:99]
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-time.tsx:5:29]

Row meta: agent label, `N msgs`, optional subagent count, dashed **Not saved** badge for recoverable-empty, `SessionTime` (`<time dateTime>` + relative), optional model. `SessionTime` is computed at render from `Date.now()` (not a live 30s tick in this component; dashboard agents use shared `useNow`).

**UX to copy:** `messageCount` already shown as "blocks"; rename to messages; add ISO `datetime` on the time element; absolute-on-tap can wrap the same `updatedAt`. Not-saved badge needs recoverable-empty fields.
**Verdict:** message-count label + time `datetime` → **drop-in**. Model / subagent / Not saved → **needs a new host field**. Shared live-tick clock for relative times → **drop-in view affordance**.

## Questions Answered
Partial: q-home-parallel-sessions unread/needs-you vocabulary is now cross-surface. q-card-content-model: title derivation is host-side, not client parse.

## Questions Remaining
- [ ] Unified field matrix (iteration 4)
- [ ] Message-level chat
- [ ] Composer
- [ ] Session→chat nav

## Ruled Out
- Treat `status=running` as unread: orca unread is done/blocked/waiting, not working.
- Fuse agent-row conversation titles from client-side prompt prefixes: orca strips dispatch preambles on the host and prefers tab/orchestration names.

## Dead Ends
- Copying desktop ack maps keyed by `paneKey`: we have session ids, not Electron pane keys.

## Sources Consulted
- specs/context/orca-main/src/renderer/src/components/activity/useActivityUnreadCount.ts:33
- specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx:92
- specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:18
- specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agent-row.tsx:32
- specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-row-display.tsx:30
- specs/context/orca-main/src/renderer/src/lib/agent-row-primary-text.ts:48
- specs/context/orca-main/src/renderer/src/components/dashboard/use-agent-row-conversation-name.ts:27
- specs/context/orca-main/src/renderer/src/components/right-sidebar/ai-vault-session-time.tsx:5

## Assessment
- newInfoRatio: 0.84
- noveltyJustification: Desktop unread definition, sessionBoundary exclusion, ack-unvisited, and host-side title chain are new versus mobile home/history.
- confidence: high on unread/title; chat message menus still untouched.

## Reflection
- What worked and why: Reading unread counting separate from status dots prevented a running=unread mistake.
- What did not work and why: Looking for a live-tick in SessionTime — it is render-time Date.now(), not useNow.
- What I would do differently: Next, freeze a field matrix so later chat iterations stop rediscovering DTO gaps.

## Recommended Next Focus
Session-card content-model matrix: one table of orca fields across History / home worktree / Electron agent row versus SessionCardDto, with a minimum host-field bundle.
