---
title: "Research — orca UX/chat mining for our SvelteKit mobile client"
description: "Authoritative synthesis of the 20×2 deep-research run: verified, deduped, verdict-checked findings for porting orca's UI/UX + chat logic into our host-authoritative, fail-closed mobile client."
packet: "007-orca-ux-mining"
source_target: "specs/context/orca-main (orca v1.4.178-rc.2)"
lineages: ["grok", "luna"]
verified_by: "fresh independent Opus verifier (skeptical spot-check against real orca source)"
---

# orca UX mining — authoritative synthesis

## How to read this

Every finding below carries a **verdict tag** against THE CONSTRAINT (our client is host-authoritative and fail-closed; it owns no editable session metadata):

- **✅ drop-in view affordance** — a client-side view/interaction over EXISTING DTO fields (`status`, `messageCount`, `updatedAt`, `epoch`) or a pure layout/interaction pattern. Ship without host changes.
- **⚠️ needs a new host field** — worthwhile, but requires the host to publish a new (client-read-only) field or RPC. See "Needs host support".
- **❌ not portable** — depends on the client owning mutable session truth, or on an orca object we don't have (worktree/PTY/pane). Do not copy.

Findings that are **mixed** get the dominant tag with the caveat stated inline (e.g. chrome ✅ but body ⚠️).

A note on our current state (from `research-angles.md` and confirmed in `app-mobile/src/pages/home/screen-home.svelte`): we ALREADY have per-answer Copy/Share, a provider-grouped model/effort sheet, a virtualized transcript with live-edge follow + jump-to-latest + unread count, "Working…" + stall detect, an ask-question ticketed card, and rich a11y live regions. Recommendations below deliberately avoid re-proposing those; they target the documented *gaps*.

---

## Angle 1 — Parallel-session surfacing / home list

Orca's richest analog for our thin home is **Agent Session History** (a list of past sessions), NOT orca "Home" (a list of git *worktrees*). The worktree Home is the wrong object — its PR badges, PTY counts, and lineage children do not map onto a Pi session card. Every worktree-chrome idea is ❌; the History card + panel chrome is where the portable wins are.

| # | Finding (plain English) | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 1.1 | **Sort the home list most-recent-first** by `updatedAt`. | `agent-history-sections.ts` (`sort:'updated'`); `ai-vault-session-filters.ts:72` | ✅ | **DO — HIGH.** Free: `updatedAt` already in our DTO. Turns a flat grid into a triaged list; biggest cheap home win. |
| 1.2 | **Pull-to-refresh** that re-requests the host list and keeps the last-good snapshot on failure. | `MobileAgentSessionHistoryList.tsx:64` (`RefreshControl`); `MobileAgentSessionHistoryList.tsx:107` | ✅ | **DO — HIGH.** Named gap; trivial; fail-closed friendly (reuse our Live/Stale banner on error). |
| 1.3 | **Time-bucket sections with counts** (Active / Today / Yesterday / Older) derived from `updatedAt`. | `agent-history-sections.ts:20`; `formatTimeAgo` in `agent-row-display.ts` | ✅ for time buckets | **DO — MED.** Folder/project/agent grouping is ⚠️ (needs `cwd`/`projectLabel`/`agent`); time buckets need nothing new. |
| 1.4 | **Status-segmented filter** (Active / Idle / Interrupted) as our stand-in for orca's Workspace/Project/All scope tabs. | `MobileAgentSessionHistoryPanel.tsx:46` | ✅ | **DO — MED.** Filters over existing `status`; real scope tabs need host path/project fields (⚠️). |
| 1.5 | **Search box chrome** with two distinct empty states ("no sessions match" vs "no sessions here"). | `MobileAgentSessionHistoryPanel.tsx:310`; `parseVaultQuery` `ai-vault-session-filters.ts:177` | ✅ chrome / ⚠️ useful query | **DO the chrome — MED.** Searching the opaque `id` alone is low value; useful search needs host `title`/`preview`. |
| 1.6 | **"Needs-you" attention badge ON the card.** Orca unread = `done \| blocked \| waiting`, and **never `working`**; a `sessionBoundary` done (idle re-connect) is excluded. | `useActivityUnreadCount.ts:33` (`isUnreadAgentState`; STA-3386 boundary exclusion) | ⚠️ (new `attention` field) — or ✅ via Inbox-join **if** Inbox items carry `sessionId` | **DO — HIGH.** The single biggest home-selection gap. Fast path is a host `attention` enum; the Inbox-join alternative is unverified (see Needs host support). **Never badge a running session as unread.** |
| 1.7 | **Omit the resting "done" dot** on a recency list of mostly-finished sessions; reserve a live glyph for blocked/waiting/running. | `ai-vault-session-row-display.tsx:53` ("done is the resting state… only live attention earns a dot"); `DashboardAgentRow.tsx:18` | ✅ | **DO — LOW/MED.** Presentation nuance over our existing status pill; a second "done" glyph without a host state is invention. |
| 1.8 | **Stale-decay a "running" card** to a dimmed/idle look after 30 min of host silence, using `updatedAt` — **without writing status**. | `agent-row-display.ts:7` (`AGENT_STATUS_STALE_AFTER_MS = 30*60*1000`; decay at :28) | ✅ | **DO — MED.** Fail-closed presentation; stops a crashed agent from looking live forever. Pairs with our Live/Stale banner. Do NOT flip `status` in a local store. |
| 1.9 | **Four-kind list state machine**: loading | error+Retry | capability-missing | ready; keep showing previous data while refetching. | `use-mobile-agent-history-state.ts:22`; `MobileAgentSessionHistoryPanel.tsx:273` | ✅ | **DO — MED.** Don't flash empty on refetch; "host too old" ≠ "no sessions". Skeletons are OUR chrome (orca uses a spinner), fine but not an orca port. |
| 1.10 | **Reserved Resume slot**, populated from cache immediately, inert until the host is live (don't hide it during reconnect). | `home-resume-card.ts:5` (`selectHomeResumeCard`, `actionable:false`) | ✅ (as a last-opened highlight) | **DO — MED.** Orca's slot resumes a *worktree* (❌ to copy literally); the inert-until-live *pattern* over our freshness banner is portable. |
| 1.11 | **Single-flight nested Open/Resume**: disable all resume buttons while one launch is in flight; spinner on the chosen row; `stopPropagation` so it doesn't toggle peek. | `agent-history-session-card.ts:55` (`buildMobileAgentHistoryResumeActionState`); `MobileAgentSessionHistoryList.tsx:139` | ✅ | **DO — MED.** Pure interaction state; navigation still routes through the host. |
| 1.12 | **Haptics taxonomy** (selection / success / error / edge-bump) on picker ticks, open/refresh success, fail-closed errors, overscroll. | `haptics.ts:3` (five helpers; Android avoids VIBRATE permission) | ✅ | **DO — LOW.** Pure interaction. PWA caveat: `navigator.vibrate` is weaker/optional on Safari. |
| 1.13 | **"New session" control on home**, disabled-until-live, with a host picker when several hosts exist. | `MobileHomeQuickActions.tsx:35` | ✅ chrome / ⚠️ create needs host RPC | **DO the chrome — MED.** Copying orca "New Workspace" is ❌ (it creates a git worktree, not a chat session). |
| 1.14 | **Device-local favorite / pin** as pure view-state that only reorders the local list. | orca pin is host-backed: `workspace-list-sections.ts:119` (`isWorktreePinned = w.isPinned \|\| localPins.has(...)`) | ✅ as a local preference / ⚠️ cross-device authoritative pin | **DO — LOW/MED.** *Verdict corrected — see Verification notes.* A device-local favorite is a view preference (category b), not session truth. Only a pin users expect to be authoritative/cross-device needs a host field. |
| 1.15 | **Absent in orca** (do not present as ports): swipe-to-action, multi-select, long-press card menus; worktree PR/PTY/lineage chrome; New Workspace; a device pin masquerading as host truth. | grep `swipe\|longPress\|multiSelect` in `agent-history/` → none; `workspace-list-types.ts:4` | ❌ | Record as backlog exclusions. Adding swipe/multi-select is a product invention, not an orca copy. |

---

## Angle 2 — Session-card content model

Orca's card is a **host-scanned projection**, never client-authored. `buildMobileAgentHistoryCard(session, activeWorktreePath, now)` derives `{ id, agent, agentLabel, title, lastMessage, messageCount, timeAgo, isCurrentWorktree }` from a much richer host `AiVaultSession` (`title`, `cwd`, `branch`, `model`, `previewMessages[]`, `queuedMessageCount`, `subagentTranscriptCount`, `resumeCommand`, timestamps…). This is the map from "what orca shows" to "what we'd need".

| # | Finding | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 2.1 | **Relabel + enrich what we already have**: `messageCount` "blocks" → "messages"; add ISO `datetime` on the time element; absolute-time-on-tap; optional 30-s live tick over `updatedAt`. | `ai-vault-session-row-display.tsx:56`; `ai-vault-session-time.tsx:5`; `formatTimeAgo` `agent-row-display.ts:89` | ✅ | **DO — HIGH.** Zero host work; closes "coarse time / opaque blocks" cheaply. orca's history list itself does NOT live-tick (pure `(ts, now)` function) — a tick is our optional extra. |
| 2.2 | **Human title, last-message preview, agent/model chip** on the card. Title falls back to "Untitled session". | `agent-history-session-card.ts:36` (`title: session.title \|\| 'Untitled session'`); `ai-vault-types.ts:83` | ⚠️ (host `title`, `lastMessagePreview`/`previewMessages[]`, `agent`) | **REQUEST — HIGH.** The core home-quality unlock. Compacted `id` stays as a *fallback*, not a title. |
| 2.3 | **Titles must be host-derived** (conversation name / orchestration label / task preview), never client-sliced from a prompt preamble. | `agent-row-primary-text.ts:48`; `use-agent-row-conversation-name.ts:27` | ⚠️ host / ❌ client prompt-slicing | Informs the host request; client-side title invention violates fail-closed AND our "opaque ids only" home copy. |
| 2.4 | **Recoverable-empty preservation** — don't hide zero-turn sessions that still have queued prompts or subagent transcripts. | `ai-vault-types.ts` (`queuedMessageCount`, `subagentTranscriptCount`; `isAiVaultSessionRecoverableEmpty`) | ⚠️ needs host field | **MED.** Hiding `messageCount === 0` today is a *lossy* drop-in; faithful hide-empty needs `queuedMessageCount` or a `resumable` flag. |
| 2.5 | **Peek-before-open** — expand-in-place, ≤5 recent turns, without navigating; separate Open control. | `MobileAgentSessionHistoryList.tsx:12,165`; `ai-vault-session-display.ts:20` | ✅ accordion chrome / ⚠️ body needs `previewMessages[]` | **MED.** The accordion is pure interaction; without host preview turns it's an empty accordion — do NOT synthesize previews from a client transcript cache (second source of truth). |
| 2.6 | **`title` does not violate "opaque identifiers only".** The `id` stays opaque; a redacted host `title`/`projectLabel` is a *projection*, not an id. Raw `cwd` on home WOULD violate the path ban. | `screen-home.svelte:82` ("Opaque identifiers only. No prompts, paths, or host context") | policy note | Frames the host request so it survives the product rule. |

---

## Angle 3 — Message-level chat interactions

Key negative result (verified by grep): orca native-chat has **no** regenerate, reply/quote, edit-and-resend, message reactions, per-message context menu, or in-conversation search — on mobile OR Electron. These are our gaps, not orca ports. What orca *does* have is copy + turn-scroll + tool folding.

| # | Finding | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 3.1 | **Per-turn "scroll this message to top"** arrow as cheap per-turn navigation. | `MobileNativeChatMessage.tsx:244,282` (`onScrollToMessage`, ArrowUp icon) | ✅ | **DO — MED.** Closes "no per-turn nav" over the already-rendered list. |
| 3.2 | **In-transcript per-fence copy-code button** on every code block we render. | orca's **editor** `CodeBlockCopyButton.tsx:1` (walks `<pre><code>` children); native-chat itself lacks it | ✅ | **DO — HIGH.** Directly closes "copy-code lives only in the artifact viewer". Bytes are already on screen — no new session truth. (Ported from orca's editor, not its native-chat.) |
| 3.3 | **Whole-message prose copy** with a transient tint/icon-swap confirm (700 ms), no toast; tool/image blocks skipped. | `mobile-native-chat-message-text.ts` ("Copy is for the agent's prose"); `MobileNativeChatMessage.tsx:257` | ✅ | **LOW.** We already copy per answer; adopt the non-shifting tint confirm. |
| 3.4 | **Tool-run folding as flat expandable lines**: one-line `▸ ToolName` previews; call↔result pairing (unpaired = visibly in-flight); file-open tap independent of expand; a global expand/collapse key. | `MobileNativeChatMessage.tsx:46`; `native-chat-message-grouping.ts:21` ("result is null while the call is still in flight") | ✅ layout | **LOW/MED.** We have boxed evidence groups; orca's flat treatment is denser for long tool runs. Opening a file from a tool path is ⚠️ unless routed through our existing artifact viewer. |
| 3.5 | **Scoped selection-copy** (long-press / bottom sheet), disabled on empty selection, scoped to the transcript root so a foreign selection can't be copied as this session's. | `use-native-chat-context-menu.tsx:35` | ✅ | **LOW.** Read-only; no host field. |
| 3.6 | **Session-level action sheet with SAFE actions only** (open / copy-id / refresh); forward host slash-commands the child already understands (`/rename`, `/archive`, `/new`, `/fork`) as chrome. | `native-chat-slash-commands.ts:46` (rename/archive/delete/fork are documented CLI strings); `use-native-chat-context-menu.tsx` (pane menu, not a conversation menu) | ✅ safe chrome / ❌ client-owned rename/pin/archive / ⚠️ host title RPC | **LOW/MED.** A "…" sheet that *dispatches existing host commands* is fine; a SvelteKit pencil that PATCHes a local title is ❌. |
| 3.7 | **Absent → backlog exclusions** (NOT orca ports): regenerate, reply/quote, edit-and-resend, reactions, per-message menu, in-conversation search. | grep `regenerat\|editAndResend\|replyTo\|reaction` in `mobile/src/session/` → only unrelated GitHub-PR parsers | ❌ | If built later, edit/resend and regenerate are host operations (new turns / fork identity) needing host RPCs + reconciliation — out of orca-copy scope. |

---

## Angle 4 — Composer / input

| # | Finding | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 4.1 | **Image-or-text send**: image-only is a valid send; never disable the TextInput on a transient lock (iOS yanks the keyboard) — only gate *sending*; restore the EXACT raw draft when the host rejects a send. | `MobileNativeChatComposer.tsx:95` (`canSend = (trimmed \|\| attachments) && !disabled…`; `sendingRef`); `:216` (editable never revoked) | ✅ | **DO — MED.** Draft restore + keep-keyboard are pure view state. |
| 4.2 | **@-file mentions** (whitespace-bounded trigger), debounced 120 ms, capped at 16, stale-safe via generation counters, empty-while-in-flight. | `use-mobile-native-chat-file-search.ts:5` (`FILE_SEARCH_DEBOUNCE_MS = 120`); `mobile-native-chat-autocomplete.ts:21` | ⚠️ needs host file-search RPC | **MED.** The client must NOT walk the device FS. The *shape* (query in → relative paths out) is the request; orca method names (`files.searchPaths`) are ❌ to copy. |
| 4.3 | **Slash stays line-leading only** (prose `/foo` isn't a command); cap suggestions (12); source from the host command catalog. | `MobileNativeChatComposer.tsx:102`; `native-chat-slash-commands.ts` | ✅ | **LOW.** We have slash; adopt the line-leading rule + cap. |
| 4.4 | **Prompt-history recall of THIS session's sent prompts** via a sheet/chip (skip empties + consecutive dups; empty-composer-only). | Electron `use-native-chat-composer-keydown.ts:93` + `native-chat-composer-state.ts:183` (desktop-only; orca **mobile has none**) | ✅ device-local | **DO — MED.** Closes "no up-arrow prompt-history" honestly. Surface via a sheet — don't hijack a hardware ArrowUp we lack; it's view state over sends the host already accepted, not a host field. |
| 4.5 | **Pending image chips** (thumbnail strip + remove); image-vs-text paste classification. | `MobileNativeChatComposer.tsx:44`; `mobile-clipboard-image.ts:5` | ✅ chrome / ⚠️ paste-upload needs host media RPC | **LOW/MED.** The chips are chrome; a paste that uploads to the host needs a media lease RPC (base64-in-DTO is ❌). |
| 4.6 | **Dictation**: hold-vs-toggle chrome + a fail-closed setup sheet when the host can't dictate (not a dead toast). | `mobile-dictation-setup.ts:9`; `MobileNativeChatComposer.tsx:50` | ✅ chrome / ⚠️ host STT RPC / ❌ on-device STT as host truth | **LOW.** On-device STT is acceptable ONLY as a local editable draft the user confirms before send (same as typing). |
| 4.7 | **Session-option pickers in the composer action row**; keep send disabled while a host option dispatch is in flight. | `MobileNativeChatComposer.tsx:41` | ✅ layout | **LOW.** We have a model/effort sheet already. |
| 4.8 | **Keep our host-RPC model/effort sheet** — do NOT copy orca's model/effort-via-typed-`/model`-into-the-TUI. Reconcile the host's reported model onto the picker; a re-reported identical model must not revert a user pick; refuse to apply an option with no known baseline. | `use-mobile-native-chat-session-options.ts:32,133,227` | ❌ TUI slash / ✅ reconciliation logic | orca's option rows are a *terminal remote-control* pattern; our host RPC sheet is already the portable equivalent. The reconciliation *bugs-to-avoid* (don't revert on re-report; disable on unknown baseline) are worth adopting (✅). |

---

## Angle 5 — Streaming & progress logic

Our streaming is already mature; these are reconciliation refinements plus two gap-closers (partial-typing feedback, hardened ask/permission).

| # | Finding | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 5.1 | **Don't reset streaming when the user peeks another pane/tab.** Split `streamIdentity` (session-scoped) from `streamScopeKey` (tab-scoped); throttle UI updates (~50 ms in orca — tune to ours); drop the synthetic streaming bubble once the host transcript contains the same text. | `use-mobile-native-chat-controller.ts:25` (`NATIVE_CHAT_STREAM_THROTTLE_MS = 50`, streamIdentity/scopeKey); `mobile-native-chat-render-data.ts:52` | ✅ reconciliation | **DO — MED.** Prevents a "data loss" flicker on peek. |
| 5.2 | **Working-vs-streaming split**: animated dots ONLY while working-with-no-tokens-yet; the streaming bubble IS the partial text once tokens exist; Stop lives on the working bar. | `MobileAgentWorkingIndicator.tsx:4`; `MobileNativeChatView.tsx:36` | ✅ | **DO — MED.** Closes "no partial-text typing indicator" without faking a typing ghost (a fake typing indicator with no host `agentWorking` is ❌). |
| 5.3 | **Optimistic user echo** reconciled by host message id; keep local image previews as a view cache keyed by message id until the host URI arrives; on reject, remove echo + restore draft. Never persist a pending message as the session. | `mobile-native-chat-render-data.ts:38`; `use-mobile-native-chat-controller.ts:91` | ✅ | **DO — MED.** The image-preview splice is the delta if we add paste-image. |
| 5.4 | **Input-lock reasons**: distinguish "waiting for lease" (transient) from "disconnected" (hard); a 600 ms settle so a dying socket can't flash the composer send-enabled for one frame; never revoke `editable`. | `MobileNativeChatView.tsx:36` (`INPUT_LOCK_SETTLE_MS = 600`); `use-mobile-native-chat-controller.ts:38` | ✅ fail-closed | **DO — MED.** |
| 5.5 | **Ask card as a stepped wizard** for multi-question prompts; answer with option **indices**, not pasted labels; dismissal state lives OUTSIDE the card so a view-toggle can't lose the ticket; `Other… = -1` sentinel. | `MobileNativeChatAsk.tsx:9` (`OTHER = -1`, index-based "so Claude's arrow-navigate selector can be driven by the stable number"); `MobileNativeChatView.tsx:353` | ✅ over existing host ask tickets | **DO — MED.** We have an ask-question card; add the wizard + indices + out-of-tree dismissal. Sending indices (not labels) survives redaction/paraphrase. |
| 5.6 | **Permission/approval buttons over a HOST ticket** (primary = first option); never scrape approvals from last-assistant prose; never answer a working agent (paused = `blocked \| waiting` only); single-flight submit. | `mobile-native-chat-permission.ts:69` (`PAUSED_STATES = {blocked, waiting}`; "no structured permission event on mobile") | ✅ over ticket / ❌ heuristic TUI scrape | **DO — MED.** We have Review tickets; render buttons from the typed ticket. orca's `"1"`/Escape keystroke sends are ❌ (TUI). |
| 5.7 | **One blocking prompt at a time**, strict precedence (structured Ask > permission > heuristic question). | `MobileNativeChatView.tsx:353` | ✅ | **LOW.** Never stack two blocking overlays. |
| 5.8 | **Named empty/loading/error transcript copy** — don't show "Start a chat" when the transcript RPC failed; a single **assertive** a11y banner for send failure, cleared on the next accepted write. | `native-chat-empty-state.ts:9`; `MobileNativeChatView.tsx:419` | ✅ | **LOW.** We have live regions; adopt the copy split + assertive send-failure channel. |

---

## Angle 6 — Session → chat transition & navigation

| # | Finding | orca source | Verdict | Recommendation |
|---|---|---|---|---|
| 6.1 | **Carry the opaque session id RAW into the router**, encode once at the router boundary, then **re-validate id + epoch at the chat page** before loading the transcript or issuing any command. A URL param or a tapped card is navigation *intent*, not proof the session still exists. | `mobile-session-route.ts:3` ("Identities stay raw — the navigator owns the params…"); `active-session-tab.ts` | ✅ | **DO — HIGH.** Fail-closed navigation correctness; prevents opening a dead/wrong session from a stale card. We already have exact-session command scope for the second check. |
| 6.2 | **Navigation-intent precedence**: keep the user-selected session through ordinary snapshot refreshes; let a host-issued follow/deep-link supersede it; model "selected" vs "host-active" vs "navigation-requested" as separate states; retry only idempotent activation (never message send / Stop). | `active-session-tab.ts:24` (`navigationIntent?: 'follow'`, "the only host action allowed to supersede phone-local intent"); `mobile-session-tab-activation.ts` | ✅ local precedence / ⚠️ true host "follow" needs a host intent field | **DO local — MED.** Local selection controls presentation only, never session truth. |
| 6.3 | **Live-edge follow atBottom-gated; jump-to-latest FAB only when scrolled up**; per-turn arrow (this message) ≠ list FAB (latest). | `MobileNativeChatView.tsx:166,295` (`atBottom` = distanceFromBottom < 80) | ✅ | **LOW/MED.** We have jump-to-latest + unread; adopt the FAB-vs-turn-arrow split. Our unread count on the FAB is our own extra (orca's FAB has none). |
| 6.4 | **Load-earlier pagination** near the top + explicit header button. | `MobileNativeChatView.tsx:57,232` (host `hasMore` + `onLoadEarlier`) | ✅ chrome / ⚠️ real pages need host `hasMore` token | **LOW.** Skip if the host already sends the full redacted snapshot (as ours does); inventing earlier messages from a stale client cache across epochs is ❌. |
| 6.5 | **Per-session device-local view-mode overlay**, fail-closed if the preference store is unreadable (don't treat unreadable as "no overrides"). | `use-mobile-session-view-mode.ts:47` | ✅ | **LOW.** orca's chat-vs-terminal split itself is ❌ (we have no PTY). |
| 6.6 | **File links / rich media are authorized host routes only** — resolve a tap through the existing artifact viewer when the host supplies a stable reference; otherwise keep the link inert with an "unavailable" state. A markdown path / local URI / image URL is not permission. | `native-chat-file-link.ts:60` (resolver requires worktree context, returns null when unresolved); `MobileNativeChatMessage.tsx:277` (`onOpenFile` callback, never opens paths itself) | ✅ inert/routed presentation / ❌ arbitrary local-file open / ⚠️ new authorized artifact ref | **LOW/MED.** |

---

## Cross-cutting engineering guardrail

**Extract home filter/sort/group, message grouping, draft reconciliation, and scope guards as PURE functions** over immutable snapshots (each carrying session `id` + host `epoch` + revision). Differential-test each against a simple canonical implementation; boundary-test that stale / unknown / mismatched data stays *visibly unresolved*, never promoted to success. orca ships exactly this test discipline.
Source: `native-chat-incremental-assembler.test.ts:22` (every incremental prefix vs a full rebuild); `mobile-native-chat-draft-reconcile.test.ts:25`; `mobile-session-last-tab-close.test.ts:9`. **✅ practice — HIGH value** as the seam that keeps every "drop-in view affordance" above provably faithful and fail-closed.

---

## Top recommendations (ranked, highest leverage first)

Weighted toward chat UX + home session-selection UX. Each is ✅ ship-now unless flagged.

1. **Recency-sort the home list by `updatedAt`.** ✅ [Home] — Zero host work; the DTO already carries it. Turns a flat grid into a triaged list — the biggest cheap win for a "thin" home.
2. **In-transcript per-fence copy-code button.** ✅ [Chat] — Closes a named gap ("copy-code only in the artifact viewer"); operates on bytes already rendered, so no new session truth.
3. **Re-validate session `id` + `epoch` at chat entry** (carry the id raw, encode once). ✅ [Nav/Chat] — Fail-closed navigation correctness; prevents opening a dead or wrong session from a stale card.
4. **"Needs-you" attention badge on the card** (unread = done/blocked/waiting, never working). ⚠️ host `attention` field (or Inbox-join if `sessionId` present) [Home] — The single biggest home-selection gap; attention currently lives only in a separate Inbox.
5. **Working-vs-streaming indicator split** (dots pre-token, streaming bubble post-token). ✅ [Chat] — Real partial-progress feedback without faking a typing indicator.
6. **Pull-to-refresh with keep-last-good on failure.** ✅ [Home] — Named gap; trivial; fail-closed by design.
7. **Prompt-history recall sheet** of this session's sent prompts (device-local). ✅ [Composer] — Closes "no up-arrow history" honestly; no host change; orca mobile itself lacks it, so surface it as a sheet, not a hardware key.
8. **Per-turn "scroll this message to top" arrow.** ✅ [Chat] — Closes "no per-turn nav" cheaply.
9. **Stale-decay a "running" card to a dimmed look after 30 min** via `updatedAt`, without writing status. ✅ [Home] — Stops a crashed agent from looking live forever; strictly presentational.
10. **Ask-card wizard + index-based answers + out-of-tree dismissal.** ✅ over existing tickets [Chat] — Hardens a surface we already have; index answers survive redaction, and dismissal survives a view toggle.

Runners-up worth batching with the above: relabel `messageCount` "blocks" → "messages" + ISO datetime / absolute-on-tap (✅, HIGH-cheap); the four-kind list state machine + keep-last-good on refetch (✅); image-or-text send + exact-draft-restore-on-reject (✅); scoped selection-copy + a safe session-action sheet (✅).

---

## Needs host support (new host/DTO fields to request)

These unlock the high-value home-quality wins. All are host-authored, client-read-only — compatible with fail-closed, and (per orca's own `AGENTS.md` wire-compat rule) "a new optional field is safe" for mixed client/host versions.

**Minimum home-card bundle (the core request):**

| Field | Type / shape | Unlocks |
|---|---|---|
| `title` | string; host may send `"Untitled session"` | Human card title (replaces the opaque compacted id as the primary label). |
| `lastMessagePreview` | short redacted string (or `previewMessages[]` capped) | Last-message line on the card; peek-before-open body. |
| `agent` | label the host already knows (`model` optional) | Agent/model identity chip. |
| `attention` | enum `none \| blocked \| waiting \| completed` | "Needs-you" badge ON the card; attention-first ordering. **Unread ≠ working.** |

**Optional / product-gated:**

| Field | Type | Note |
|---|---|---|
| `queuedMessageCount` / `subagentTranscriptCount` (or a `resumable` flag) | number / bool | Faithful hide-empty that preserves recoverable zero-turn sessions. |
| `cwd` / `projectLabel` / `branch` | string (a **redacted project label**, not a filesystem path) | Folder/project grouping + Workspace/Project tabs. Raw `cwd` on home violates the "opaque ids, no paths" product rule; a redacted label would not. |
| `pinned` + a pin RPC | bool + mutation | Cross-device authoritative pin (orca pins *worktrees*, not sessions — this would be a NEW Pi mutation, not an orca copy). A device-local favorite needs nothing (see 1.14). |
| `previewMessages[]` | capped array of turns | Full peek-before-open (heavier than one preview string). |
| `hasMore` / transcript page token | token | Only if we stop sending full transcript snapshots. |

**Chat RPCs (distinct from the card DTO):**

| Capability | Verdict |
|---|---|
| `@`-file search (query in → relative paths out) | ⚠️ needs host RPC — never a device FS walk. |
| Image-paste upload lease | ⚠️ needs host media RPC (if not already present). |
| Host-backed dictation / STT | ⚠️ paired-host RPC, or on-device only as an editable local draft. |
| Typed approval envelope | ⚠️ only if our Review ticket doesn't already cover it; TUI keystroke sends are ❌. |

**Open operator/product questions (not answerable from orca):**
1. **Does our Inbox payload already carry `sessionId`?** If yes, the "attention badge on card" can ship as a ✅ view-join with no new `attention` field. The research *inferred* this but did not verify our protocol — confirm before choosing the join over the field.
2. Will product lift the "no paths on home" rule for a redacted `projectLabel`?
3. Do paste-image / file-search RPCs already exist on the Pi relay (out of orca's scope)?

---

## Verification notes

**Method.** Fresh, independent skeptical pass. I read all 40 iteration reports (20 grok + 20 luna), then opened the cited orca files under `specs/context/orca-main/` (read-only) and confirmed each claim against real source — constants, comments, ticket IDs, type shapes, and negatives. I did NOT trust the registry `text` fields alone (they are fragmentary) or the loop's own metrics.

**Spot-checks that passed (20+, spanning all six angles), file opened → claim confirmed:**

| Claim | File opened | Result |
|---|---|---|
| Card model `{id, agent, agentLabel, title, lastMessage, messageCount, timeAgo, isCurrentWorktree}`; `title \|\| 'Untitled session'` | `agent-history-session-card.ts` | Exact match. |
| Richer `AiVaultSession` (title/cwd/branch/model/previewMessages/queuedMessageCount/subagentTranscriptCount/resumeCommand…) | `ai-vault-types.ts:83` | Exact match, incl. recoverable-empty comments. |
| Unread = `done\|blocked\|waiting`, never working; `sessionBoundary` done excluded (STA-3386) | `useActivityUnreadCount.ts:33` | Exact match, incl. ticket ref. |
| Stale decay `AGENT_STATUS_STALE_AFTER_MS = 30*60*1000`, decay-to-idle | `agent-row-display.ts:7` | Exact match. |
| Worktree pin `isWorktreePinned = w.isPinned \|\| localPins.has(worktreeId)` | `workspace-list-sections.ts:119` | Exact match. |
| Streaming throttle `= 50`; streamIdentity vs streamScopeKey ("goes session-less the moment the user peeks the terminal") | `use-mobile-native-chat-controller.ts:25` | Exact match, incl. comment. |
| Permission `PAUSED_STATES = {blocked, waiting}`; "no structured permission event on mobile"; heuristic scrape | `mobile-native-chat-permission.ts` | Exact match. |
| Ask wizard `OTHER = -1`, index-based "so Claude's arrow-navigate selector can be driven by the stable number" | `MobileNativeChatAsk.tsx` | Exact match, incl. comment. |
| File-search debounce `= 120` | `use-mobile-native-chat-file-search.ts:5` | Exact match. |
| Input-lock settle `= 600` | `MobileNativeChatView.tsx:36` | Exact match. |
| Composer `canSend = (trimmed \|\| attachments) && …`; editable never revoked | `MobileNativeChatComposer.tsx:95` | Exact match (image-only send confirmed). |
| Five haptic helpers (medium/selection/success/error/edge) | `haptics.ts` | Exact match. |
| Slash catalog rename/archive/delete/fork are documented CLI strings | `native-chat-slash-commands.ts:46` | Exact match. |
| Message Copy + `onScrollToMessage` (per-turn); "Copy is for the agent's prose" | `MobileNativeChatMessage.tsx`, `mobile-native-chat-message-text.ts` | Exact match. |
| Editor per-fence copy walks `<pre><code>` children; native-chat lacks it | `CodeBlockCopyButton.tsx` | Exact match. |
| **Negative**: no regenerate/editAndResend/replyTo/reaction in mobile chat | grep `mobile/src/session/` | Confirmed absent (only unrelated GitHub-PR reaction parsers). |
| Raw route identity ("navigator owns the params… pre-encoding would reach the screen escaped") | `mobile-session-route.ts` | Exact match. |
| `navigationIntent: 'follow'` precedence | `active-session-tab.ts` | Exact match. |
| File-link resolver requires worktree context, returns null unresolved | `native-chat-file-link.ts` | Exact match. |
| Tool call↔result pairing, "result is null while the call is still in flight" | `native-chat-message-grouping.ts` | Exact match. |

**Corrections made:**
- **Device-local favorite/pin (1.14).** Both lineages tagged *any* client pin ❌ ("mutable session truth, violates fail-closed"). That is correct for copying orca's host-backed pin RPC, but over-strict for a **device-local favorite that only reorders the local view** — that is a pure client view-preference (category b), not session truth, and is portable. I re-tagged it ✅-as-local-preference; only a cross-device authoritative pin needs a host field.

**Rejected as unverified / hallucinated:** none. Every citation I opened resolved to real code that matched the claim.

**Dedup.** The 124 registry `keyFindings` are ~100 fragmentary grok one-liners (with iteration-level, not per-finding, citations) plus 24 label-only luna summaries (no citations in the JSON). Consolidating grok fragments and merging the two lineages (which cover the same orca surfaces and reach the same verdicts) yields ~48 distinct recommendations — the set above. Luna added genuine unique depth on Angle 6 (route identity, navigation-intent, file-link routing) and the pure-function test discipline; grok owned the numeric/behavioral detail. There were no verdict conflicts between the lineages worth adjudicating.

**Confidence: HIGH** on the portable/verdict conclusions. The findings' *content* is accurate and well-cited. Two caveats: (1) the "attention via Inbox-join" path rests on an unverified assumption about our own Inbox payload (flagged above); (2) the loop's *bookkeeping* is unreliable — `convergenceScore 0.28`, `resource-map.md` fully degraded (129 rows skipped, 0 references), and `fanout-attribution.md` shows luna with "Iterations: 0 / model unknown" despite 20 real luna reports on disk. Trust the (verified) content, not the loop's metrics.
