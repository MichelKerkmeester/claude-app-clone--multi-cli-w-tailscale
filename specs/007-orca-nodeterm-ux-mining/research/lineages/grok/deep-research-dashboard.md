---
title: Deep Research Dashboard
description: Auto-generated reducer view over the research packet.
---

# Deep Research Dashboard - Session Overview

Auto-generated from JSONL state log, iteration files, findings registry, and strategy state. Never manually edited.

<!-- ANCHOR:overview -->
## 1. OVERVIEW

Reducer-generated observability surface for the active research packet.

<!-- /ANCHOR:overview -->
<!-- ANCHOR:status -->
## 2. STATUS
- Topic: Mine specs/context/orca-main for portable UI/UX and chat-feature logic to improve our SvelteKit mobile client, prioritising (1) user chat UX and (2) home-screen session-selection UX. The full angles, our current-state gaps, and the host-authoritative/fail-closed constraint are documented in specs/007-orca-nodeterm-ux-mining/research-angles.md — read it first. Investigate orca's mobile/ (React Native) and src/renderer/ (Electron) surfaces. For each finding, name the orca file/pattern, the concrete UX or logic to copy, how it maps onto our host-authoritative/fail-closed constraint, and a portability verdict (drop-in view affordance / needs a new host field / not portable). Weight findings toward session-selection and chat UX.
- Started: 2026-08-26T04:46:56Z
- Status: COMPLETE
- Iteration: 20 of 20
- Session ID: fanout-grok-1787718935950-gxg4a7
- Parent Session: none
- Lifecycle Mode: new
- Generation: 1
- continuedFromRun: none

<!-- /ANCHOR:status -->
<!-- ANCHOR:progress -->
## 3. PROGRESS

| # | Focus | Track | Ratio | Findings | Status |
|---|-------|-------|-------|----------|--------|
| 1 | unknown | - | 0.92 | 0 | complete |
| 2 | unknown | - | 0.88 | 0 | complete |
| 3 | unknown | - | 0.84 | 0 | complete |
| 4 | unknown | - | 0.62 | 0 | complete |
| 5 | unknown | - | 0.86 | 0 | complete |
| 6 | unknown | - | 0.85 | 0 | complete |
| 7 | unknown | - | 0.80 | 0 | complete |
| 8 | unknown | - | 0.72 | 0 | complete |
| 9 | unknown | - | 0.74 | 0 | complete |
| 10 | unknown | - | 0.78 | 0 | complete |
| 11 | unknown | - | 0.76 | 0 | complete |
| 12 | unknown | - | 0.70 | 0 | complete |
| 13 | unknown | - | 0.64 | 0 | complete |
| 14 | unknown | - | 0.58 | 0 | complete |
| 15 | unknown | - | 0.61 | 0 | complete |
| 16 | unknown | - | 0.67 | 0 | complete |
| 17 | unknown | - | 0.55 | 0 | complete |
| 18 | unknown | - | 0.48 | 0 | complete |
| 19 | unknown | - | 0.42 | 0 | complete |
| 20 | unknown | - | 0.22 | 0 | complete |

- iterationsCompleted: 20
- keyFindings: 100
- openQuestions: 6
- resolvedQuestions: 0

<!-- /ANCHOR:progress -->
<!-- ANCHOR:questions -->
## 4. QUESTIONS
- Answered: 0/6
- [ ] How does orca list, group, sort, filter, and badge parallel sessions on mobile home / agent-history, and which of those are drop-in view affordances versus new host fields? [analyst-strategy]
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`)? [legacy-import]
- [ ] What message-level chat interactions exist (context menu, copy-code, reply/quote, edit-and-resend, regenerate/retry, in-conversation search, per-turn nav) and which logic is portable under fail-closed? [analyst-strategy]
- [ ] What composer/input patterns (attachments, paste-image, voice/dictation, @-mentions, slash/command-arg UI, prompt history) can we copy as interaction chrome versus host-backed capabilities? [analyst-strategy]
- [ ] How do streaming/progress, peek/preview, and session→chat navigation (resume marker, tabs, back-swipe, single-flight open) map onto view affordances versus new host fields? [analyst-strategy]
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our SessionCardDto (id, status, updatedAt, messageCount)? [analyst-strategy]

<!-- /ANCHOR:questions -->
<!-- ANCHOR:uncovered-questions -->
## Uncovered Questions
- Count: 6
- [ ] How does orca list, group, sort, filter, and badge parallel sessions on mobile home / agent-history, and which of those are drop-in view affordances versus new host fields?
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`)?
- [ ] What message-level chat interactions exist (context menu, copy-code, reply/quote, edit-and-resend, regenerate/retry, in-conversation search, per-turn nav) and which logic is portable under fail-closed?
- [ ] What composer/input patterns (attachments, paste-image, voice/dictation, @-mentions, slash/command-arg UI, prompt history) can we copy as interaction chrome versus host-backed capabilities?
- [ ] How do streaming/progress, peek/preview, and session→chat navigation (resume marker, tabs, back-swipe, single-flight open) map onto view affordances versus new host fields?
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our SessionCardDto (id, status, updatedAt, messageCount)?

<!-- /ANCHOR:uncovered-questions -->
<!-- ANCHOR:trend -->
## 5. TREND
- newInfoRatio sparkline: ██▇▅▇▇▇▆▆▇▆▆▅▅▅▆▄▄▃▁
- score sparkline: ██▇▅▇▇▇▆▆▇▆▆▅▅▅▆▄▄▃▁
- Last 3 ratios: 0.48 -> 0.42 -> 0.22
- Stuck count: 0
- Guard violations: none recorded by the reducer pass
- convergenceScore: 0.22
- coverageBySources: {"code":64,"other":3}
- Advisory events: none

<!-- /ANCHOR:trend -->
<!-- ANCHOR:dead-ends -->
## 6. DEAD ENDS
- Copy `AiVaultSession.resumeCommand` into the SvelteKit client: execution-host CLI string, not a Pi relay session id. (iteration 1)
- Derive human titles from compacted session id: duplicates current home UX; not a port of `session.title`. (iteration 1)
- Treating Agent Session History as our only home analogue: orca splits History (past sessions) from Home (worktrees/hosts). Next iteration must cover the Home/worktree list separately. (iteration 1)
- Device-only pin set without host `isPinned`: mutable session truth, violates fail-closed. (iteration 2)
- Porting the full worktree row (PR, PTY count, lineage, folder workspaces) onto session cards: wrong object. (iteration 2)
- Treat New Workspace as our home new-session control: creates an IDE worktree, not a Pi chat session. (iteration 2)
- Copying desktop ack maps keyed by `paneKey`: we have session ids, not Electron pane keys. (iteration 3)
- Fuse agent-row conversation titles from client-side prompt prefixes: orca strips dispatch preambles on the host and prefers tab/orchestration names. (iteration 3)
- Treat `status=running` as unread: orca unread is done/blocked/waiting, not working. (iteration 3)
- Local full-text index of transcripts for home search: second session truth. (iteration 4)
- Port full worktree row onto Pi session cards: wrong object (PR/sleep/PTY/lineage). (iteration 4)
- Waiting for cwd before shipping recency sort / message-count relabel / pull-to-refresh — those are already legal. (iteration 4)
- Client-side Set Title from a message menu: orca's setTitle here is PR title, and session title is host-owned. (iteration 5)
- Hunting a long-press ContextMenu on `MobileNativeChatMessage` — controls are always-visible icon buttons, not a menu. (iteration 5)
- Use orca native-chat as source for reply/quote/edit/regen menus: those verbs do not exist there. (iteration 5)
- Client-side `/rename` `/archive` `/delete` as session-metadata edits: those are Codex CLI strings in a suggestion catalog. (iteration 6)
- Local filesystem walk for `@` mentions. (iteration 6)
- Looking for a files/docs paperclip next to ImagePlus — this composer is image-only plus @path mentions. (iteration 6)
- On-device STT as host-authoritative transcript. (iteration 6)
- Client-invented typing indicator without host `agentWorking`/streaming. (iteration 7)
- Equating `use-mobile-native-chat-drafts` with up-arrow prompt history — it is current-draft restore, not a stack. (iteration 7)
- Persisting optimistic pending messages as the session. (iteration 7)
- Inventing Workspace/Project tabs without cwd: would filter everything out or lie. (iteration 8)
- Treating History search as a server round-trip — it filters the already-scanned host list. (iteration 8)
- Client-side load-earlier from a stale cache across epoch. (iteration 9)
- Copying terminal/chat dual view as a home-screen pattern. (iteration 9)
- Looking for unread-count on orca's jump FAB — it has none. (iteration 9)
- Answering Ask prompts by pasting option label text (breaks redaction/stable ids). (iteration 10)
- Device filesystem listing for @-mentions. (iteration 10)
- Prompt-history up-arrow still absent (composer ArrowUp is Send). (iteration 10)
- Client-side regex over the last assistant bubble as our source of truth for approvals. (iteration 11)
- Looking for a dedicated mobile permission RPC — orca mobile comments that it does not exist. (iteration 11)
- Hosting prompt history as session metadata. (iteration 12)
- Searching mobile for `HistoryState` / `recallPrevious` — absent. (iteration 12)
- Treating mobile native-chat as the source for up-arrow prompt history (it has none). (iteration 12)
- Grep `copyFence` / `Copy code` under `mobile/src/session` — no matches. (iteration 13)
- Treating orca native-chat as having per-fence copy-code (it does not). (iteration 13)
- Client-side pin/archive of Pi sessions without a host field. (iteration 14)
- Porting an orca native-chat overflow menu (it does not exist). (iteration 14)
- Renderer context menu looked like a conversation menu; it is pane/terminal identity copy. (iteration 14)
- Copying skeleton-card loading from orca history (it uses a spinner). (iteration 15)
- Search for skeleton components under `mobile/src/worktree` and `agent-history` — none. (iteration 15)
- Treating decayed idle as a client write of session status. (iteration 15)
- Looking for a `session.setOption` RPC on mobile — options are composed CLI strings. (iteration 16)
- Replacing our `set_model` / thinking RPCs with orca's slash-to-TUI option catalog. (iteration 16)
- Copying iOS Mail-style swipe on session cards from orca (absent). (iteration 17)
- Treating `navigator.vibrate` as a required port of expo-haptics. (iteration 17)
- Worktree list swipe search — home rows also tap-to-open + pin control, not swipe. (iteration 17)
- Deriving title from compact id (false drop-in). (iteration 18)
- Device-only pin as a substitute for host pin. (iteration 18)
- Shipping path/cwd on the home card under current product copy. (iteration 18)
- Trying to unlock History-quality cards from `messageCount` alone. (iteration 18)
- Copying Orca Home worktree chrome onto Pi session cards. (iteration 19)
- Treating `status=running` as unread. (iteration 19)
- Using History dots as unread (they hide resting done). (iteration 19)
- Further mining of orca PR sidebar, git history, or mermaid as session-selection sources (wrong object / out of ranked angles). (iteration 20)
- Orca Home as a template for Pi session cards (wrong object, iter 2 + 19). (iteration 20)
- Waiting for orca to grow ChatGPT-style message menus (not present at v1.4.178-rc.2). (iteration 20)

<!-- /ANCHOR:dead-ends -->
<!-- ANCHOR:divergent-pivots -->
## 6A. DIVERGENT PIVOTS
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergent-pivots -->
<!-- ANCHOR:next-focus -->
## 7. NEXT FOCUS
Session tabs / chat vs terminal view toggle / back-swipe.

<!-- /ANCHOR:next-focus -->
<!-- ANCHOR:active-risks -->
## 8. ACTIVE RISKS
- None active beyond normal research uncertainty.

<!-- /ANCHOR:active-risks -->
<!-- ANCHOR:blocked-stops -->
## 9. BLOCKED STOPS
No blocked-stop events recorded.

<!-- /ANCHOR:blocked-stops -->
<!-- ANCHOR:graph-convergence -->
## 10. GRAPH CONVERGENCE
- graphConvergenceScore: 0.00
- graphDecision: [Not recorded]
- graphBlockers: none recorded

<!-- /ANCHOR:graph-convergence -->
