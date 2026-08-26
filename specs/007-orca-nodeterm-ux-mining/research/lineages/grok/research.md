---
title: "Research Synthesis — Orca UX mining (grok lineage)"
description: "Portable UI/UX and chat-feature logic from orca mobile/renderer into the SvelteKit Pi Remote client under host-authoritative/fail-closed."
session_id: "fanout-grok-1787718935950-gxg4a7"
loop_type: "research"
iterations: 20
stop_policy: "max-iterations"
executor: "cli-cursor / cursor-grok-4.6-xhigh"
generation: 1
---

# Orca UX mining — grok lineage synthesis

Detached fan-out lineage. Write surface: `specs/007-orca-nodeterm-ux-mining/research/lineages/grok`.
Topic: mine `specs/context/orca-main` (orca v1.4.178-rc.2) for portable chat UX and home session-selection UX. Constraint: our client holds no editable session metadata.

Skipped (out of this lineage's write surface): `generate-context.js`, `validate.sh`, git, parent `fanout-merge.cjs`, and `spec.md` generated-fence writeback.

---

## 1. Executive Summary

Copy **Agent Session History** (not Orca Home) and **native-chat** interaction chrome. Do not copy worktree rows, New Workspace, PTY/chat dual view, TUI keystroke approvals, or ChatGPT-style message menus (orca native-chat does not have them).

**Home (session-selection).** Today's card is a status pill, compacted `id`, `messageCount` as "blocks", and coarse `relativeTime`. Orca History cards are a **view over host `AiVaultSession`**: human title, last-message preview, agent identity, recency, peek of preview turns. Those strings are **not** on `SessionCardDto`. Drop-in without a host change: recency sort, pull-to-refresh, search chrome with two empty copies, status segmented filter, keep-last-good loading, fail-closed capability/error screens, 30-minute stale-dot decay, haptics on failed/successful open. Not drop-in: title/preview/agent, useful search, peek body, Workspace/Project path tabs, pin, swipe/multi-select (orca lacks those gestures).

**Minimum host bundle for ranked home gaps:** `title`, `lastMessagePreview`, `agent` (optional `model`), `attention` (`none|blocked|waiting|completed`). Unread ≠ `running`. Our `AttentionItemDto` uses opaque `lookupId`, not `sessionId`, so an Inbox join onto home cards is **not** confirmed — treat `attention` as the request unless the host adds a session id on attention items.

**Chat.** We are already ahead of orca native-chat on Send/Steer/Stop, slash palette, model/effort sheet, virtualized live-edge, artifacts, ticketed ask-question. Portable deltas: per-turn scroll-to-top, whole-message copy flash (we have Copy/Share), global tools fold, jump-to-latest FAB (we have this), 600ms input-lock settle, never revoke `editable`, optimistic echo with reject-restore, gated streaming bubble that survives pane peek, Ask wizard that submits **option indices**, one overlay at a time, device-local prompt-history **sheet** (Electron ArrowUp stack; mobile orca has none), in-transcript **fence copy** taken from the **editor** `CodeBlockCopyButton` (native-chat itself copies whole messages). Needs host RPCs: `@` path search (shape of `files.searchPaths`), clipboard image upload lease, optional dictation. Not portable: heuristic TUI Allow/Deny, slash-to-TUI session options (keep `set_model`), on-device STT, `/rename` as local metadata, regen/reply/quote/edit-and-resend (absent in orca; would need host RPCs).

---

## 2. Research Question and Decision Frame

How much of orca's mobile (`mobile/`) and Electron (`src/renderer/`) UI/UX and chat **logic** can improve our SvelteKit client, weighting (1) chat UX and (2) home session-selection, while every idea is either:

- (a) a view over existing DTO fields (`id`, `status`, `updatedAt`, `messageCount`, `epoch`),
- (b) pure interaction/layout, or
- (c) an explicit new host-provided field/RPC —

and never client-owned mutable session truth (`research-angles.md`).

Inbox questions: `q-home-parallel-sessions`, `q-card-content-model`, `q-message-level-chat`, `q-composer-input`, `q-session-chat-nav`.

---

## 3. Method, Evidence, and Confidence

Twenty LEAF iterations, `stopPolicy: max-iterations` (threshold 0.05 was telemetry only). Evidence is file:line citations in `iterations/iteration-001.md` … `iteration-020.md` against `specs/context/orca-main` plus `packages/pi-rpc-protocol/src/types.ts` and `app-mobile/src/pages/home/screen-home.svelte`.

Confidence is high on orca presence/absence. Inbox→session-card join was **corrected at synthesis**: `AttentionItemDto` has `lookupId`, not `sessionId` (`packages/pi-rpc-protocol/src/types.ts:1068`).

Reducer `resolvedQuestions` stayed 0 because `answeredQuestions` were question **ids**; the reducer matches **normalized question text**. This synthesis still treats the five inbox questions as answered. A duplicate legacy-import question remains in the registry.

---

## 4. Constraint mapping

| Kind | Rule | Example |
|---|---|---|
| Drop-in view | Project host bytes already on the wire; may keep last-good snapshot | Sort by `updatedAt`; PTR refetch; copy rendered prose |
| New host field/RPC | Client must not invent the string/path/ticket | `title`, `files.searchPaths`-shaped search, image upload lease |
| Not portable | Wrong object, TUI keystroke, or client-owned metadata | Worktree pin, `/rename` as local title, heuristic Allow/Deny, `status=running` as unread |

Fail-closed specifics copied from orca: do not flash composer enabled on a dying socket (600ms settle); do not apply flip-only options without a known baseline; do not treat an unreadable view-mode store as empty; capability-missing ≠ empty list; decay "working" using host `updatedAt` rather than writing a new status.

---

## 5. Session selection — History is the analog, Home is the wrong object

Orca **Home** lists **worktrees** (pin via `worktree.set {isPinned}`, New Workspace, PR/sleep/PTY, nested agent dots, unread bell). Our home lists **Pi sessions**. Porting Home chrome onto `session--card` would create git workspaces and lie about object identity (iterations 2, 14, 19).

Orca **Agent Session History** lists host-scanned `AiVaultSession` rows: title, last message, agent, timeAgo, messageCount, folder groups, sort `updated`, hide-empty (with queued/subagent exceptions), peek of five `previewMessages`, nested single-flight Resume, PTR (iteration 1). Panel chrome: Workspace/Project/All, local search with `repo:`/`path:` placeholder, skipped-transcript notice, host-too-old screen, resume haptics (iteration 8).

**Copy History. Discard Home-as-session-list.**

---

## 6. Session-card content model vs `SessionCardDto`

`SessionCardDto` (`types.ts` ~428): `id`, `status: idle|running|interrupted|unknown`, `updatedAt`, `messageCount`.

Orca History card projects `AiVaultSession`: `title`, `previewMessages`, `agent`/`model`, `cwd`/`branch`, tokens, queued/subagent counts, `resumeCommand` (CLI string — **not portable**).

| Field | Verdict |
|---|---|
| Compacted `id` | Keep as fallback identity, not a title |
| `status` pill | Drop-in; add `blocked/waiting/done` only if we want orca dots |
| `updatedAt` → timeAgo | Drop-in (`just now` / `Xm` / `Xh` / `Xd`; no live tick in orca) |
| `messageCount` | Drop-in; relabel "blocks" → "messages" |
| `title`, last-message preview, agent | **Needs host fields** |
| `attention` / unread | **Needs host field**; Inbox `lookupId` does not join |
| `cwd` / path | **Not portable** on home under current product copy; optional redacted `projectLabel` |
| Pin | Worktree RPC; session pin would be a **new** host mutation |
| Peek body | Needs `previewMessages`; expand chrome is drop-in |
| `resumeCommand` | **Not portable** |

Electron unread = `done|blocked|waiting`, excluding `sessionBoundary` done, ack when `ackAt < stateStartedAt`. History **omits** resting done dots. Never badge `running` as unread (iterations 3, 19).

---

## 7. Chat message interactions

Orca `MobileNativeChatMessage`: agent bubbles get Copy (prose via `nativeChatMessageText`, skips tools) plus optional scroll-this-turn-to-top; user bubbles have **no** controls; tools fold to expandable runs (cap 6); copy tints ~700ms (iteration 5). Electron `NativeChatCopyButton` is the same whole-message pattern (iteration 13).

**Absent in native-chat (grep-confirmed):** regenerate, reply/quote, edit-and-resend, long-press menu, in-conversation search. Those are **our gaps, not an orca port**. Adding them later is a host-RPC product, not a copy.

Per-fence Copy lives on Electron **editor** `CodeBlockCopyButton` (`src/renderer/src/components/editor/CodeBlockCopyButton.tsx`), not native-chat. `MobileMarkdown` has path taps and mermaid, no fence copy. Portable: add a fence chip on transcript markdown we already render (drop-in view).

---

## 8. Composer and input

Slash is **line-leading only**; `@file` is whitespace-bounded and calls host search (`files.searchPaths`, debounce 120ms, cache 20, cap 16, generation bump; legacy `files.list` + client rank) (iterations 6, 10). Image-only send is valid. Composer never revokes `editable` (iOS keyboard). Clipboard image is a **host upload lease**, not a data-URL in the DTO. Dictation is paired-desktop `speech.models.*`; on-device STT as session transcript is **not portable**.

Electron-only: `HistoryState` of sent strings; ArrowUp on empty draft recalls; ArrowDown walks forward (iteration 12). Mobile orca has **no** stack (ArrowUp icon = Send). Port as a **recent-prompts sheet**, not a hardware key.

Session option rows **type slash into the agent TUI** (`setOption` → `dispatchCommand`). Reported model is authority; identical re-reports must not revert a user pick; flip-only fails closed without a baseline (iteration 16). **Do not replace** our `set_model` / thinking RPCs with this. Row layout over host lists is drop-in.

Codex `/rename` `/archive` `/new` `/fork` `/delete` are **catalog strings**, not in-app metadata APIs (iterations 6, 14). No conversation overflow menu on mobile or Electron native-chat (Electron context menu copies pane/terminal ids).

---

## 9. Streaming, navigation, blocking prompts

List = folded transcript + **gated** synthetic streaming bubble + pending echoes. Throttle ~50ms. `streamScopeKey` stays tab-keyed so peeking terminal does not reset streaming. Pending image URIs splice onto host `image-ref` until the host URI arrives; reject restores exact draft (iteration 7).

Live-edge: `atBottom` if distance < 80; FAB "Scroll to latest" only when `!atBottom`; per-message up-arrow is turn-nav (iteration 9). Load-earlier: host `hasMore` + header button + `contentOffset.y < 60`. Unnecessary if our host always sends the full redacted snapshot.

Chat vs terminal is a **device** overlay; unreadable store is fail-closed; **not portable** as a PTY split.

Blocking stack: structured AskUserQuestion **wins**, then heuristic permission, then heuristic question. Ask answers are **option indices** (`OTHER = -1`); dismissal lives outside the card so view toggles do not lose the ticket (iteration 10). Permission: often **heuristic TUI scrape** of last assistant text (no structured mobile permission event); `parseApprovalFromStatus` JSON envelope is the reliable host signal; paused states only (`blocked|waiting`); Allow/Deny send `"1"` / Escape — **keystrokes not portable**. Prefer our ticketed Review (iteration 11).

Haptics (`haptics.ts`): selection / medium / success / error / edge-bump; Android uses `performAndroidHapticsAsync` (no VIBRATE permission). History has **no** swipe, multi-select, or long-press menu (iteration 17).

Empty/loading: History is `loading|error|capability-missing|ready` with spinner (not skeletons) and keep-last-good on refetch. Chat empty copy is shared (`native-chat-empty-state.ts`): "Start a chat with {agent}" vs "Could not load conversation" — do not show start-a-chat on RPC error. Active dots decay to idle after **30 minutes** (iteration 15).

---

## 10. Implementation handoff (portability)

**Do now (drop-in, ranked):**

1. Home: sort by `updatedAt`; PTR; search field with "no matches" vs "no sessions"; status chips; keep-last-good; error/retry; haptic on open fail/success; relabel blocks; 30min running decay.
2. Chat: per-turn scroll-to-top; fence copy on rendered markdown; 600ms send-lock settle; never disable the textarea on transient lock; Ask multi-question wizard + index submit; one blocking overlay; recent-prompts sheet from local sent stack; Stop/working already exist.

**Request from host (ranked):**

1. Session card: `title`, `lastMessagePreview`, `agent`, `attention`.
2. Optional: `previewMessages[]` (peek), redacted `projectLabel` (grouping without paths).
3. Chat RPCs if missing: path search `{query → relativePaths[]}`, image upload lease.

**Do not port:** Orca Home/worktree pin/New Workspace; `resumeCommand`; TUI option slash; heuristic permission; device pin; path/cwd on home; regen/reply menus "because orca"; skeletons-as-orca (orca uses a spinner).

---

## 11. Recommendations

1. Treat **History + native-chat** as the source surface; treat **worktree Home** as out of scope for session cards.
2. Ship drop-in home chrome immediately; do not wait on the DTO for sort/PTR/search-empty/haptics.
3. Ask the host for the four-field bundle before building title/preview/agent/attention UI that would otherwise lie.
4. Keep model/effort on existing RPCs; steal only reconciliation (reported-model wins, no clobber on identical reconnect).
5. For chat gaps orca does not have (reply/regen/in-chat search), decide as a **Pi product**, not an orca port.
6. Put fence-copy in the transcript markdown renderer (editor pattern), not a fake native-chat widget.
7. Confirm whether paste-image and file-search already exist on the Pi relay before specifying new RPCs.

## Eliminated Alternatives

| Approach | Reason Eliminated | Evidence | Iteration(s) |
|---|---|---|---|
| Copy `AiVaultSession.resumeCommand` | Execution-host CLI string, not a Pi session id | `ai-vault-types.ts:119` | 1 |
| Derive titles from compacted session id | Duplicates current home; not a port of `session.title` | `screen-home.svelte:101` | 1, 18 |
| Port full worktree row onto Pi cards | Wrong object (PR/sleep/PTY) | `workspace-list-types.ts:4` | 2, 4 |
| Device-only pin as session pin | Orca pin is `worktree.set`; local overlay is not host truth | Home `togglePin` | 2, 18 |
| Treat `status=running` as unread | Unread is `done\|blocked\|waiting` | `useActivityUnreadCount` | 3, 19 |
| Fuse titles from dispatch preambles | Orca strips preambles; prefers conversation/orchestration names | `agent-row-primary-text.ts` | 3 |
| Reply/quote/edit/regen from native-chat | Verbs absent | grep `mobile/src/session` | 5, 20 |
| `/rename` `/archive` as client metadata | Codex CLI catalog strings | `native-chat-slash-commands.ts:46` | 6, 14 |
| Fake typing indicator | Needs host `agentWorking` + gated stream | `MobileNativeChatView.tsx:51` | 7 |
| Workspace/Project tabs without cwd | Would empty or lie | History panel tabs | 8 |
| Terminal/chat dual view on home | No PTY | `use-mobile-session-view-mode.ts` | 9 |
| Device filesystem listing for `@` | Fail-closed host search only | `use-mobile-native-chat-file-search.ts` | 10 |
| Regex last-assistant as approval truth | Heuristic; sends unsolicited TUI keys | `mobile-native-chat-permission.ts:1` | 11 |
| Mobile native-chat as prompt-history source | No `HistoryState`; ArrowUp is Send | Electron `native-chat-composer-state.ts` | 12 |
| Host prompt-history field | Local sent-stack is enough | same | 12 |
| Native-chat already copies fences | Whole-message prose only | `NativeChatCopyButton.tsx` | 13 |
| Orca conversation overflow menu | Does not exist; context menu copies pane ids | `use-native-chat-context-menu.tsx` | 14 |
| New Workspace as New session | Creates worktrees | `MobileHomeQuickActions.tsx` | 2, 14 |
| Skeleton-card loading as orca port | Spinner + keep-last-good | History panel | 15 |
| Replace `set_model` with TUI option slash | Wrong authority | `use-mobile-native-chat-session-options.ts` | 16 |
| Swipe-to-pin from orca history | Gesture absent | `MobileAgentSessionHistoryList.tsx` | 17 |
| Raw `cwd` on home card | Product forbids paths; opaque id ≠ path | `screen-home.svelte` | 4, 18 |
| Inbox join on `sessionId` without checking DTO | `AttentionItemDto` is `lookupId` | `types.ts:1068` | 19 (corrected at synthesis) |
| PR sidebar / git history as session-selection sources | Wrong object vs ranked angles | `research-angles.md` | 20 |
| Wait for orca ChatGPT message menus | Not in v1.4.178-rc.2 native-chat | iter 5, 20 | 20 |

## Divergence Map

`stopPolicy: max-iterations` with `antiConvergence.convergenceMode: off`. Divergence registry fields (`saturatedDirections`, `remainingFrontier`, `activePivotId`) are empty — this lineage broadened **research angles**, not a divergent-mode pivot machine.

| Wave | Saturated direction | Pivot | Remaining |
|---|---|---|---|
| 1–4 | History card + Home worktree + Electron unread + field matrix | Discarded Home-as-session-list | Chat surfaces |
| 5–10 | Native-chat message, composer, stream, panel, nav, @/Ask | Prompt-history not on mobile | Desktop delta, copy-code, actions |
| 11–17 | Permission, Electron history stack, fence copy, slash-actions, empty/stale, option rows, haptics | TUI options ≠ Pi RPC | Bundle freeze |
| 18–20 | Host-field bundle, Inbox join hypothesis, gap audit | Inbox join **corrected**: lookupId | Product: projectLabel? paste/search RPCs already on relay? |

No Council artifacts. No audited divergence overrides. Frontier after iteration 20 is **product/host**, not missing orca files.

---

## 12. Open Questions

Answered in this lineage (orca side): all five inbox questions (see §§5–9). Residual **operator/host** items:

1. Does any attention/inbox payload expose a session id, or only `lookupId`? (Confirmed DTO: `lookupId` only on `AttentionItemDto`.)
2. Lift home path ban for a redacted `projectLabel`?
3. Do paste-image and path-search RPCs already exist on the Pi relay?
4. Peek (`previewMessages[]`) vs single `lastMessagePreview` — product weight vs bytes.

Registry still lists 6 open questions (5 inbox + 1 legacy-import duplicate) because iteration `answeredQuestions` used ids. Do not treat that counter as unanswered orca work.

---

## 13. Residual product decisions

- **Skeletons:** allowed as our chrome; not an orca copy.
- **Live time tick / absolute-on-tap:** allowed; orca history does not tick.
- **Unread count on jump-to-latest FAB:** our extra; orca FAB has none.
- **Home New session button:** needs host create RPC (likely exists off-home); do not copy New Workspace.
- **In-chat "…" sheet:** allowed if it only forwards host `get_commands` / tickets.

---

## 14. Source notes

Primary: `specs/context/orca-main/mobile/src/agent-history/*`, `mobile/src/session/*`, `mobile/src/worktree/*`, `mobile/src/platform/haptics.ts`, `src/shared/ai-vault-*.ts`, `src/shared/native-chat-slash-commands.ts`, `src/shared/native-chat-empty-state.ts`, `src/renderer/src/components/native-chat/*`, `src/renderer/src/components/editor/CodeBlockCopyButton.tsx`, activity unread hook (iter 3).

Ours: `packages/pi-rpc-protocol/src/types.ts` (`SessionCardDto`, `AttentionItemDto`), `app-mobile/src/pages/home/screen-home.svelte`, `specs/007-orca-nodeterm-ux-mining/research-angles.md`.

`config.resource_map_present` was **false** at init. Lineage `resource-map.md` is emitted from deltas at synthesis (coverage inventory), not cited as a pre-existing packet map.

---

## 15. Coverage vs research-angles.md

Chat-gap and home-gap tables: `iterations/iteration-020.md`. Ranked angles 1–6 all sampled. Electron and mobile native-chat both sampled. No remaining in-scope orca surface that would flip the ranked verdicts.

---

## 16. Convergence Report

- Stop reason: `maxIterationsReached`
- Total iterations: 20
- Questions answered: 5 / 5 inbox (registry still 0 / 6 due to id-vs-text matching + 1 legacy duplicate)
- Remaining questions: product/host items in §12, not orca-unknown
- Last 3 iteration summaries: (18) host-field bundle freeze; (19) Inbox join hypothesis — **corrected** at synthesis; (20) gap audit
- Convergence threshold: 0.05 (telemetry only under max-iterations)
- Last newInfoRatio: 0.22 (iter 20); earlier ratios 0.92 → 0.22 as angles saturated
- Divergence summary: angle broadening only; registry `saturatedDirections` empty
- Segment transitions, wave scores, and checkpoint metrics are experimental and omitted from the live report.

---

## 17. Final Recommendation

Build home chrome that History already proves as view-only, then unblock the rest with four host fields (`title`, `lastMessagePreview`, `agent`, `attention`). On chat, steal fence-copy, turn-nav, Ask indices, lock settle, and a local recent-prompts sheet. Do not clone Orca Home, TUI permissions, or missing ChatGPT menus. Fail closed whenever the host is quiet, the store is unreadable, or the ticket is gone.
