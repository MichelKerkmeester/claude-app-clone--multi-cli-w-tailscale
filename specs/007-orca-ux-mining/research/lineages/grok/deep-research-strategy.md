---
title: Deep Research Strategy - Orca UX mining (grok lineage)
description: Persistent research brain for the grok fan-out lineage mining orca mobile/renderer chat and session-selection UX.
trigger_phrases:
  - "orca ux mining"
  - "session-selection UX"
  - "chat UX portability"
importance_tier: important
contextType: planning
version: 1.0.0.0
---

# Deep Research Strategy - Session Tracking Template

Runtime strategy for `{artifact_dir}` = `specs/007-orca-ux-mining/research/lineages/grok`.

## 1. OVERVIEW

### Purpose

Persistent brain for this grok fan-out lineage. Records what to investigate, what worked, what failed, and where to focus next.

---

## 2. TOPIC
Mine `specs/context/orca-main` for portable UI/UX and chat-feature logic to improve our SvelteKit mobile client, prioritising (1) user chat UX and (2) home-screen session-selection UX. Investigate orca `mobile/` (React Native) and `src/renderer/` (Electron). For each finding: orca file/pattern, concrete UX/logic to copy, mapping onto host-authoritative/fail-closed, portability verdict (drop-in view affordance / needs a new host field / not portable). Weight toward session-selection and chat UX.

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
- [ ] How does orca list, group, sort, filter, and badge parallel sessions on mobile home / agent-history, and which of those are drop-in view affordances versus new host fields?
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`)?
- [ ] What message-level chat interactions exist (context menu, copy-code, reply/quote, edit-and-resend, regenerate/retry, in-conversation search, per-turn nav) and which logic is portable under fail-closed?
- [ ] What composer/input patterns (attachments, paste-image, voice/dictation, @-mentions, slash/command-arg UI, prompt history) can we copy as interaction chrome versus host-backed capabilities?
- [ ] How do streaming/progress, peek/preview, and session→chat navigation (resume marker, tabs, back-swipe, single-flight open) map onto view affordances versus new host fields?
- [ ] What is orca's session-card content model (title, last-message preview, identity, progress, cwd/branch) versus our SessionCardDto (id, status, updatedAt, messageCount)?

<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS
- Implementing any of these patterns in `app-mobile/` during this research run.
- Client-owned mutable session truth (local rename/pin/archive that the host does not already persist).
- Copying orca-host CLI strings (`resumeCommand`), Electron window chrome, or native-module-only features that have no Pi-relay equivalent.
- Rewriting our host-authoritative/fail-closed transport contract.
- Mining orca for unrelated product surfaces (browser emulator, SSH, pet, billing) except where they leak into chat or session-selection UX.

---

## 5. STOP CONDITIONS
- `config.stopPolicy: max-iterations` — run all 20 iterations; treat early convergence as telemetry only and broaden angles instead of synthesizing early.
- Do not write outside `specs/007-orca-ux-mining/research/lineages/grok`.
- Do not run `generate-context.js`, `validate.sh`, or git write/checkout/commit.
- Halt if three consecutive iterations produce no new cited orca evidence.

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet]

<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
- Reading the shared `ai-vault-*` modules alongside the mobile adapters showed the card is a view, not a client store. (iteration 1)
- Separating History (chat sessions) from Home (worktrees) prevented a false drop-in of PR/PTY chrome onto Pi cards. (iteration 2)
- Reading unread counting separate from status dots prevented a running=unread mistake. (iteration 3)
- Tabular cross-walk made "needs host field" vs "wrong object" explicit. (iteration 4)
- Absence greps are negative knowledge and belong in Ruled Out. (iteration 5)
- Separating CLI slash verbs from in-app session mutations avoided a false "orca has rename/archive menus" finding. (iteration 6)
- Distinguishing streamIdentity vs streamScopeKey is the portable "don't reset on peek" rule. (iteration 7)
- Distinguishing card content from panel chrome avoided repeating iter 1. (iteration 8)
- Reading the FAB comment prevented treating jump-to-latest as scroll-to-turn. (iteration 9)
- Generation counters are the portable stale-RPC pattern for any host search. (iteration 10)
- The file-header comment is the load-bearing negative finding. (iteration 11)
- Comparing the same native-chat product on two surfaces prevented a false "orca has no history". (iteration 12)
- Following `CommentMarkdown` vs `RichMarkdownCodeBlock` split avoided a false "orca copies fences in chat". (iteration 13)
- Catalog file-header ("no machine-readable list") explains why these are strings not APIs. (iteration 14)
- Distinguishing keep-last-good refetch from skeleton fashion. (iteration 15)
- `dispatchCommand` vs `set_model` is the portability fork. (iteration 16)
- Negative grep is the finding for three home gaps. (iteration 17)
- Separating card DTO from chat RPCs keeps the host conversation small. (iteration 18)
- Checking whether Inbox already has sessionId is the cheap alternative to a DTO change (operator must confirm payload). (iteration 19)
- A gap×verdict table is the synthesis input the host packet needs. (iteration 20)

<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
- Assuming History is orca's home screen. It is a dedicated agent-history route, not the worktree home. (iteration 1)
- Searching for a session-pin RPC on mobile home — pins are worktree pins. (iteration 2)
- Looking for a live-tick in SessionTime — it is render-time Date.now(), not useNow. (iteration 3)
- Treating Electron paneKey ack as a DTO candidate — we have session ids, not panes. (iteration 4)
- Looking for ChatGPT-style message menus in orca — the product chose always-visible copy instead. (iteration 5)
- Expected a generic file picker; orca uses @path + image attach. (iteration 6)
- Looking for a typing-indicator component — it is the streaming bubble plus working dots. (iteration 7)
- Expected search to hit an RPC; it is in-memory over host snapshot. (iteration 8)
- Prompt-history still absent (ArrowUp in composer is Send). (iteration 9)
- Looking for in-chat rename/pin/archive UI — still only slash catalog strings. (iteration 10)
- Expected a structured mobile permission event like desktop. (iteration 11)
- Assumed mobile would mirror desktop keydown. (iteration 12)
- Expected mobile chat markdown to grow a copy chip. (iteration 13)
- Hoped Electron context menu would rename threads. (iteration 14)
- Expected a live clock on timeAgo. (iteration 15)
- Catalog grok is explicitly excluded (CLI-default model would no-op). (iteration 16)
- Expected pin to be a swipe action; it is an explicit control on worktree rows (iter 2). (iteration 17)
- Pin looks portable until you notice it is a worktree RPC. (iteration 18)
- Did not re-open Inbox DTO in this pass — inferred from research-angles "attention lives only in Inbox". (iteration 19)
- Inbox sessionId was not re-verified in protocol types this pass (call out as inferred). (iteration 20)

<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
### Answering Ask prompts by pasting option label text (breaks redaction/stable ids). -- BLOCKED (iteration 10, 1 attempts)
- What was tried: Answering Ask prompts by pasting option label text (breaks redaction/stable ids).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Answering Ask prompts by pasting option label text (breaks redaction/stable ids).

### Client-invented typing indicator without host `agentWorking`/streaming. -- BLOCKED (iteration 7, 1 attempts)
- What was tried: Client-invented typing indicator without host `agentWorking`/streaming.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-invented typing indicator without host `agentWorking`/streaming.

### Client-side `/rename` `/archive` `/delete` as session-metadata edits: those are Codex CLI strings in a suggestion catalog. -- BLOCKED (iteration 6, 1 attempts)
- What was tried: Client-side `/rename` `/archive` `/delete` as session-metadata edits: those are Codex CLI strings in a suggestion catalog.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-side `/rename` `/archive` `/delete` as session-metadata edits: those are Codex CLI strings in a suggestion catalog.

### Client-side load-earlier from a stale cache across epoch. -- BLOCKED (iteration 9, 1 attempts)
- What was tried: Client-side load-earlier from a stale cache across epoch.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-side load-earlier from a stale cache across epoch.

### Client-side pin/archive of Pi sessions without a host field. -- BLOCKED (iteration 14, 1 attempts)
- What was tried: Client-side pin/archive of Pi sessions without a host field.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-side pin/archive of Pi sessions without a host field.

### Client-side regex over the last assistant bubble as our source of truth for approvals. -- BLOCKED (iteration 11, 1 attempts)
- What was tried: Client-side regex over the last assistant bubble as our source of truth for approvals.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-side regex over the last assistant bubble as our source of truth for approvals.

### Client-side Set Title from a message menu: orca's setTitle here is PR title, and session title is host-owned. -- BLOCKED (iteration 5, 1 attempts)
- What was tried: Client-side Set Title from a message menu: orca's setTitle here is PR title, and session title is host-owned.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Client-side Set Title from a message menu: orca's setTitle here is PR title, and session title is host-owned.

### Copy `AiVaultSession.resumeCommand` into the SvelteKit client: execution-host CLI string, not a Pi relay session id. -- BLOCKED (iteration 1, 1 attempts)
- What was tried: Copy `AiVaultSession.resumeCommand` into the SvelteKit client: execution-host CLI string, not a Pi relay session id.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copy `AiVaultSession.resumeCommand` into the SvelteKit client: execution-host CLI string, not a Pi relay session id.

### Copying desktop ack maps keyed by `paneKey`: we have session ids, not Electron pane keys. -- BLOCKED (iteration 3, 1 attempts)
- What was tried: Copying desktop ack maps keyed by `paneKey`: we have session ids, not Electron pane keys.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copying desktop ack maps keyed by `paneKey`: we have session ids, not Electron pane keys.

### Copying iOS Mail-style swipe on session cards from orca (absent). -- BLOCKED (iteration 17, 1 attempts)
- What was tried: Copying iOS Mail-style swipe on session cards from orca (absent).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copying iOS Mail-style swipe on session cards from orca (absent).

### Copying Orca Home worktree chrome onto Pi session cards. -- BLOCKED (iteration 19, 1 attempts)
- What was tried: Copying Orca Home worktree chrome onto Pi session cards.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copying Orca Home worktree chrome onto Pi session cards.

### Copying skeleton-card loading from orca history (it uses a spinner). -- BLOCKED (iteration 15, 1 attempts)
- What was tried: Copying skeleton-card loading from orca history (it uses a spinner).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copying skeleton-card loading from orca history (it uses a spinner).

### Copying terminal/chat dual view as a home-screen pattern. -- BLOCKED (iteration 9, 1 attempts)
- What was tried: Copying terminal/chat dual view as a home-screen pattern.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Copying terminal/chat dual view as a home-screen pattern.

### Derive human titles from compacted session id: duplicates current home UX; not a port of `session.title`. -- BLOCKED (iteration 1, 1 attempts)
- What was tried: Derive human titles from compacted session id: duplicates current home UX; not a port of `session.title`.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Derive human titles from compacted session id: duplicates current home UX; not a port of `session.title`.

### Deriving title from compact id (false drop-in). -- BLOCKED (iteration 18, 1 attempts)
- What was tried: Deriving title from compact id (false drop-in).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Deriving title from compact id (false drop-in).

### Device filesystem listing for @-mentions. -- BLOCKED (iteration 10, 1 attempts)
- What was tried: Device filesystem listing for @-mentions.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Device filesystem listing for @-mentions.

### Device-only pin as a substitute for host pin. -- BLOCKED (iteration 18, 1 attempts)
- What was tried: Device-only pin as a substitute for host pin.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Device-only pin as a substitute for host pin.

### Device-only pin set without host `isPinned`: mutable session truth, violates fail-closed. -- BLOCKED (iteration 2, 1 attempts)
- What was tried: Device-only pin set without host `isPinned`: mutable session truth, violates fail-closed.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Device-only pin set without host `isPinned`: mutable session truth, violates fail-closed.

### Equating `use-mobile-native-chat-drafts` with up-arrow prompt history — it is current-draft restore, not a stack. -- BLOCKED (iteration 7, 1 attempts)
- What was tried: Equating `use-mobile-native-chat-drafts` with up-arrow prompt history — it is current-draft restore, not a stack.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Equating `use-mobile-native-chat-drafts` with up-arrow prompt history — it is current-draft restore, not a stack.

### Further mining of orca PR sidebar, git history, or mermaid as session-selection sources (wrong object / out of ranked angles). -- BLOCKED (iteration 20, 1 attempts)
- What was tried: Further mining of orca PR sidebar, git history, or mermaid as session-selection sources (wrong object / out of ranked angles).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Further mining of orca PR sidebar, git history, or mermaid as session-selection sources (wrong object / out of ranked angles).

### Fuse agent-row conversation titles from client-side prompt prefixes: orca strips dispatch preambles on the host and prefers tab/orchestration names. -- BLOCKED (iteration 3, 1 attempts)
- What was tried: Fuse agent-row conversation titles from client-side prompt prefixes: orca strips dispatch preambles on the host and prefers tab/orchestration names.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Fuse agent-row conversation titles from client-side prompt prefixes: orca strips dispatch preambles on the host and prefers tab/orchestration names.

### Grep `copyFence` / `Copy code` under `mobile/src/session` — no matches. -- BLOCKED (iteration 13, 1 attempts)
- What was tried: Grep `copyFence` / `Copy code` under `mobile/src/session` — no matches.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Grep `copyFence` / `Copy code` under `mobile/src/session` — no matches.

### Hosting prompt history as session metadata. -- BLOCKED (iteration 12, 1 attempts)
- What was tried: Hosting prompt history as session metadata.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Hosting prompt history as session metadata.

### Hunting a long-press ContextMenu on `MobileNativeChatMessage` — controls are always-visible icon buttons, not a menu. -- BLOCKED (iteration 5, 1 attempts)
- What was tried: Hunting a long-press ContextMenu on `MobileNativeChatMessage` — controls are always-visible icon buttons, not a menu.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Hunting a long-press ContextMenu on `MobileNativeChatMessage` — controls are always-visible icon buttons, not a menu.

### Inventing Workspace/Project tabs without cwd: would filter everything out or lie. -- BLOCKED (iteration 8, 1 attempts)
- What was tried: Inventing Workspace/Project tabs without cwd: would filter everything out or lie.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Inventing Workspace/Project tabs without cwd: would filter everything out or lie.

### Local filesystem walk for `@` mentions. -- BLOCKED (iteration 6, 1 attempts)
- What was tried: Local filesystem walk for `@` mentions.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Local filesystem walk for `@` mentions.

### Local full-text index of transcripts for home search: second session truth. -- BLOCKED (iteration 4, 1 attempts)
- What was tried: Local full-text index of transcripts for home search: second session truth.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Local full-text index of transcripts for home search: second session truth.

### Looking for a `session.setOption` RPC on mobile — options are composed CLI strings. -- BLOCKED (iteration 16, 1 attempts)
- What was tried: Looking for a `session.setOption` RPC on mobile — options are composed CLI strings.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Looking for a `session.setOption` RPC on mobile — options are composed CLI strings.

### Looking for a dedicated mobile permission RPC — orca mobile comments that it does not exist. -- BLOCKED (iteration 11, 1 attempts)
- What was tried: Looking for a dedicated mobile permission RPC — orca mobile comments that it does not exist.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Looking for a dedicated mobile permission RPC — orca mobile comments that it does not exist.

### Looking for a files/docs paperclip next to ImagePlus — this composer is image-only plus @path mentions. -- BLOCKED (iteration 6, 1 attempts)
- What was tried: Looking for a files/docs paperclip next to ImagePlus — this composer is image-only plus @path mentions.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Looking for a files/docs paperclip next to ImagePlus — this composer is image-only plus @path mentions.

### Looking for unread-count on orca's jump FAB — it has none. -- BLOCKED (iteration 9, 1 attempts)
- What was tried: Looking for unread-count on orca's jump FAB — it has none.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Looking for unread-count on orca's jump FAB — it has none.

### On-device STT as host-authoritative transcript. -- BLOCKED (iteration 6, 1 attempts)
- What was tried: On-device STT as host-authoritative transcript.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: On-device STT as host-authoritative transcript.

### Orca Home as a template for Pi session cards (wrong object, iter 2 + 19). -- BLOCKED (iteration 20, 1 attempts)
- What was tried: Orca Home as a template for Pi session cards (wrong object, iter 2 + 19).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Orca Home as a template for Pi session cards (wrong object, iter 2 + 19).

### Persisting optimistic pending messages as the session. -- BLOCKED (iteration 7, 1 attempts)
- What was tried: Persisting optimistic pending messages as the session.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Persisting optimistic pending messages as the session.

### Port full worktree row onto Pi session cards: wrong object (PR/sleep/PTY/lineage). -- BLOCKED (iteration 4, 1 attempts)
- What was tried: Port full worktree row onto Pi session cards: wrong object (PR/sleep/PTY/lineage).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Port full worktree row onto Pi session cards: wrong object (PR/sleep/PTY/lineage).

### Porting an orca native-chat overflow menu (it does not exist). -- BLOCKED (iteration 14, 1 attempts)
- What was tried: Porting an orca native-chat overflow menu (it does not exist).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Porting an orca native-chat overflow menu (it does not exist).

### Porting the full worktree row (PR, PTY count, lineage, folder workspaces) onto session cards: wrong object. -- BLOCKED (iteration 2, 1 attempts)
- What was tried: Porting the full worktree row (PR, PTY count, lineage, folder workspaces) onto session cards: wrong object.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Porting the full worktree row (PR, PTY count, lineage, folder workspaces) onto session cards: wrong object.

### Prompt-history up-arrow still absent (composer ArrowUp is Send). -- BLOCKED (iteration 10, 1 attempts)
- What was tried: Prompt-history up-arrow still absent (composer ArrowUp is Send).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Prompt-history up-arrow still absent (composer ArrowUp is Send).

### Renderer context menu looked like a conversation menu; it is pane/terminal identity copy. -- BLOCKED (iteration 14, 1 attempts)
- What was tried: Renderer context menu looked like a conversation menu; it is pane/terminal identity copy.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Renderer context menu looked like a conversation menu; it is pane/terminal identity copy.

### Replacing our `set_model` / thinking RPCs with orca's slash-to-TUI option catalog. -- BLOCKED (iteration 16, 1 attempts)
- What was tried: Replacing our `set_model` / thinking RPCs with orca's slash-to-TUI option catalog.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Replacing our `set_model` / thinking RPCs with orca's slash-to-TUI option catalog.

### Search for skeleton components under `mobile/src/worktree` and `agent-history` — none. -- BLOCKED (iteration 15, 1 attempts)
- What was tried: Search for skeleton components under `mobile/src/worktree` and `agent-history` — none.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Search for skeleton components under `mobile/src/worktree` and `agent-history` — none.

### Searching mobile for `HistoryState` / `recallPrevious` — absent. -- BLOCKED (iteration 12, 1 attempts)
- What was tried: Searching mobile for `HistoryState` / `recallPrevious` — absent.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Searching mobile for `HistoryState` / `recallPrevious` — absent.

### Shipping path/cwd on the home card under current product copy. -- BLOCKED (iteration 18, 1 attempts)
- What was tried: Shipping path/cwd on the home card under current product copy.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Shipping path/cwd on the home card under current product copy.

### Treat `status=running` as unread: orca unread is done/blocked/waiting, not working. -- BLOCKED (iteration 3, 1 attempts)
- What was tried: Treat `status=running` as unread: orca unread is done/blocked/waiting, not working.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treat `status=running` as unread: orca unread is done/blocked/waiting, not working.

### Treat New Workspace as our home new-session control: creates an IDE worktree, not a Pi chat session. -- BLOCKED (iteration 2, 1 attempts)
- What was tried: Treat New Workspace as our home new-session control: creates an IDE worktree, not a Pi chat session.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treat New Workspace as our home new-session control: creates an IDE worktree, not a Pi chat session.

### Treating `navigator.vibrate` as a required port of expo-haptics. -- BLOCKED (iteration 17, 1 attempts)
- What was tried: Treating `navigator.vibrate` as a required port of expo-haptics.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating `navigator.vibrate` as a required port of expo-haptics.

### Treating `status=running` as unread. -- BLOCKED (iteration 19, 1 attempts)
- What was tried: Treating `status=running` as unread.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating `status=running` as unread.

### Treating Agent Session History as our only home analogue: orca splits History (past sessions) from Home (worktrees/hosts). Next iteration must cover the Home/worktree list separately. -- BLOCKED (iteration 1, 1 attempts)
- What was tried: Treating Agent Session History as our only home analogue: orca splits History (past sessions) from Home (worktrees/hosts). Next iteration must cover the Home/worktree list separately.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating Agent Session History as our only home analogue: orca splits History (past sessions) from Home (worktrees/hosts). Next iteration must cover the Home/worktree list separately.

### Treating decayed idle as a client write of session status. -- BLOCKED (iteration 15, 1 attempts)
- What was tried: Treating decayed idle as a client write of session status.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating decayed idle as a client write of session status.

### Treating History search as a server round-trip — it filters the already-scanned host list. -- BLOCKED (iteration 8, 1 attempts)
- What was tried: Treating History search as a server round-trip — it filters the already-scanned host list.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating History search as a server round-trip — it filters the already-scanned host list.

### Treating mobile native-chat as the source for up-arrow prompt history (it has none). -- BLOCKED (iteration 12, 1 attempts)
- What was tried: Treating mobile native-chat as the source for up-arrow prompt history (it has none).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating mobile native-chat as the source for up-arrow prompt history (it has none).

### Treating orca native-chat as having per-fence copy-code (it does not). -- BLOCKED (iteration 13, 1 attempts)
- What was tried: Treating orca native-chat as having per-fence copy-code (it does not).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Treating orca native-chat as having per-fence copy-code (it does not).

### Trying to unlock History-quality cards from `messageCount` alone. -- BLOCKED (iteration 18, 1 attempts)
- What was tried: Trying to unlock History-quality cards from `messageCount` alone.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Trying to unlock History-quality cards from `messageCount` alone.

### Use orca native-chat as source for reply/quote/edit/regen menus: those verbs do not exist there. -- BLOCKED (iteration 5, 1 attempts)
- What was tried: Use orca native-chat as source for reply/quote/edit/regen menus: those verbs do not exist there.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Use orca native-chat as source for reply/quote/edit/regen menus: those verbs do not exist there.

### Using History dots as unread (they hide resting done). -- BLOCKED (iteration 19, 1 attempts)
- What was tried: Using History dots as unread (they hide resting done).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Using History dots as unread (they hide resting done).

### Waiting for cwd before shipping recency sort / message-count relabel / pull-to-refresh — those are already legal. -- BLOCKED (iteration 4, 1 attempts)
- What was tried: Waiting for cwd before shipping recency sort / message-count relabel / pull-to-refresh — those are already legal.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Waiting for cwd before shipping recency sort / message-count relabel / pull-to-refresh — those are already legal.

### Waiting for orca to grow ChatGPT-style message menus (not present at v1.4.178-rc.2). -- BLOCKED (iteration 20, 1 attempts)
- What was tried: Waiting for orca to grow ChatGPT-style message menus (not present at v1.4.178-rc.2).
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Waiting for orca to grow ChatGPT-style message menus (not present at v1.4.178-rc.2).

### Worktree list swipe search — home rows also tap-to-open + pin control, not swipe. -- BLOCKED (iteration 17, 1 attempts)
- What was tried: Worktree list swipe search — home rows also tap-to-open + pin control, not swipe.
- Why blocked: Repeated iteration evidence ruled this direction out.
- Do NOT retry: Worktree list swipe search — home rows also tap-to-open + pin control, not swipe.

<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
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

<!-- /ANCHOR:ruled-out-directions -->

---

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergence-frontier -->

---

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS
- [ ] Streaming, peek-from-home transition, tabs, back-swipe (iteration 1)
- [ ] Composer/input patterns (iteration 1)
- [ ] Electron / home worktree parallel-session surfacing (pin, attention, new session) (iteration 1)
- [ ] Message-level chat interactions (iteration 1)
- [ ] Composer/input (iteration 2)
- [ ] Session→chat navigation (iteration 2)
- [ ] Electron sidebar agent-row unread/unvisited/sessionBoundary (cross-surface) (iteration 2)
- [ ] Session→chat nav (iteration 3)
- [ ] Message-level chat (iteration 3)
- [ ] Composer (iteration 3)
- [ ] Unified field matrix (iteration 4) (iteration 3)
- [ ] Streaming / nav (iteration 4)
- Composer, streaming, session nav. (iteration 5)
- Electron/desktop native-chat menus may still differ — check renderer native-chat next if a later iteration needs parity. (iteration 5)
- Generic file/doc attach (only images in this composer). (iteration 6)
- Prompt-history / up-arrow (not seen in this composer). (iteration 6)
- Streaming/pending reconciliation. (iteration 6)
- Load-earlier / jump-to-latest in this view. (iteration 7)
- Prompt history stack. (iteration 7)
- Session tabs / chat vs terminal view toggle / back-swipe. (iteration 7)

<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
Session tabs / chat vs terminal view toggle / back-swipe.

<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT
resource-map.md not present; skipping coverage gate.

Prior memory_context: unavailable in this detached CLI lineage (Spec Kit Memory MCP not registered). Seeded from `research-angles.md`, `goal.md`, and a pointer snapshot of the two codebases.

### Bounded Context Snapshot

- Source pointers:
  - Orca mobile history: `specs/context/orca-main/mobile/src/agent-history/`
  - Orca mobile home/worktree: `specs/context/orca-main/mobile/src/worktree/`, `mobile/src/components/WorktreeListRow.tsx`, `WorktreeAgentRow.tsx`, `MobileHomeQuickActions.tsx`
  - Orca mobile chat: `specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx`, `MobileNativeChatComposer.tsx`
  - Orca shared session model: `specs/context/orca-main/src/shared/ai-vault-types.ts`, `ai-vault-session-filters.ts`, `ai-vault-session-display.ts`
  - Orca renderer: `specs/context/orca-main/src/renderer/`
  - Our DTO: `packages/pi-rpc-protocol/src/types.ts` `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`)
  - Our home/chat: `app-mobile/src/pages/home/screen-home.svelte`, `app-mobile/src/pages/chat/screen-chat.svelte`
- Reuse candidates: shared `ai-vault-*` display/filter helpers (already cross-surface in orca); our existing status pill, relativeTime, messageCount, freshness banner, Inbox/Review split.
- Integration points: host session list DTO; composer send/steer/stop; transcript virtualization already mature on our side.
- Constraints and risks: host-authoritative/fail-closed — no client-owned session metadata. Write surface for this lineage is `research/lineages/grok` only. Spec.md pre-init mutation and `validate.sh` skipped because they write outside the lineage. Continuity save (`generate-context.js`) skipped per fan-out contract.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 20
- Convergence threshold: 0.05 (telemetry only; stopPolicy max-iterations)
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true
- research.md ownership: workflow-owned canonical synthesis output at lineage root
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A, including Section 10A
- Canonical pause sentinel: `.deep-research-pause`
- Current generation: 1
- Started: 2026-08-26T04:46:56Z
- Session ID: fanout-grok-1787718935950-gxg4a7
- Executor: cli-cursor model=cursor-grok-4.6-xhigh
