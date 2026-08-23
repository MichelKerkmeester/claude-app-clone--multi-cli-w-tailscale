# Iteration 2: KQ6 — Mirror/Inbox Data Contract

## Focus

KQ6 [ux]: What data contract (MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow) powers the mobile companion screen, and what are its event production, title/dedup, resolve/archive, live-card, and quick-approve rules?

Selected interpretation (narrowest, evidence-backed): mine the three named READ-ONLY sources under `specs/context/nodeterm-main` — `docs/mobile-usage-inbox.md` (the cross-repo protocol contract), `src/core/agent-status-mirror.ts` (types + production code), and `src/main/remote-ssh/remote-status-push.ts` (SSH slice transport) — and extract the contract plus its production/dedup/resolve/live-card/quick-approve rules with file:line citations and a PWA adoption note per finding. Deferred alternatives: none; the prompt pack named exactly these sources for this focus.

## Actions Taken

1. Read state (config, strategy, state log) and verified packet boundary: `iterations/iteration-002.md` and `deltas/iter-002.jsonl` did not exist; exactly one prior `type:"iteration"` record (run 1) confirmed iteration number 2.
2. Read `docs/mobile-usage-inbox.md` in full (143 lines) — the v1 protocol contract.
3. Read `src/core/agent-status-mirror.ts` in full (1815 lines, two passes) — types, constants, `reduceEntry`, `filterMirrorForNodes`, `buildFile`, `trimInboxFeed`, `onInboxActionable`, `produceInboxFromState`, `recordAgentEvent`, `recordRawToolEvent`, `recordContextUsage`, `clearNode`, `ackDone`, `sweepStaleWorking`, `flush`, `loadPersisted`.
4. Read `src/main/remote-ssh/remote-status-push.ts` in full (90 lines) — throttle/heartbeat push wiring.
5. Wrote this narrative, the delta stream, and appended the canonical iteration record.

## Findings

### F-1 — Additive inbox block rides the existing v1 mirror file; no new transport

The entire inbox rides the pre-existing agent-status mirror side-channel: `MirrorFile.v` stays `1`; `inbox?: MirrorInbox` and `usage?` are optional additive fields old readers ignore [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:5-7,17-29]. `buildFile` attaches the inbox only when non-empty, so the on-disk shape is byte-identical to before the block existed [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:510-511]. Transport recap: desktop writes `<userData>/agent-status.json` atomically (tmp+rename, mode 0600, 300 ms debounce) [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:11-12; specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1722-1782]; for connected SSH projects the desktop pushes per-project slices to `~/.nodeterm/agent-status-<projectId>.json` on the host (2 s throttle, 60 s heartbeat) [SOURCE: specs/context/nodeterm-main/src/main/remote-ssh/remote-status-push.ts:15-22]; the phone polls every 8 s while foregrounded [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:15].
**PWA adoption note:** a single versioned JSON side-channel with additive optional blocks lets the Pi Remote PWA poll one small blob over its existing carrier — no new endpoints, and old clients survive schema growth. Version-stay-flat + optional-fields is cheaper than version-bump migration.

### F-2 — InboxEvent / InboxNodeNow / MirrorInbox shapes with hard caps

`InboxEvent`: `id` monotonic per writer as ``${ts}-${seq}``, `ts`, `nodeId`, optional `agentId`/`sessionId`, `kind: 'approval'|'question'|'done'`, `title` (first line, ≤120), optional `detail` (≤240, lastMessage snippet), `interrupted?` (done: user hit Esc/Ctrl-C), `resolved?` (ask left blocked/waiting, or done was read), plus later additions `options?` (question only, ≤4 labels × ≤60 chars), `multiSelect?`, and `pendingId?` (approval-only deterministic hook-reply ticket) [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:304-335]. `InboxNodeNow`: `activity?` ≤80 chars, `tool?`, `contextPercent?` 0–100, `prompt?` ≤120 ("You: …" current-turn line), `updatedAt` [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:336-348]. `MirrorInbox`: `events` oldest→newest capped at `INBOX_EVENTS_CAP` = 50, plus per-node `nodes` map [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:349-354,284]. Constants: `INBOX_TITLE_MAX`=120, `INBOX_DETAIL_MAX`=240, `INBOX_ACTIVITY_MAX`=80, `PROMPT_MAX`=120, `QUESTION_DEDUP_WINDOW_MS`=10 min, `STASH_MAX_AGE_MS`=5 min [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:284-302,792].
**PWA adoption note:** hard per-field caps + a 50-event rolling cap bound the polled payload for a mobile link; the `${ts}-${seq}` id gives stable keys for list diffing without a server-side cursor.

### F-3 — Event production: stash-priority classification, not raw state mapping

Production folds the transition `prevState → nextState` that `reduceEntry` just computed, so the same done-holdoff/newTurn semantics gate the feed as gate the badge [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1238-1243]. Default mapping: normalized `blocked` → `approval`, `waiting` → `question`, `done` → `done` (edge-guarded, one per turn; `interrupted` flips the title to "Stopped" vs "Finished") [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:102-107; specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1374-1392]. But classification is STASH-PRIORITY: a fresh AskUserQuestion raw-hook stash (options present, <5 min old) forces `kind:'question'` regardless of which needs-you state the CLI signaled, because a picker reaches the mirror as a permission-style `blocked` signal; a PermissionRequest stash instead supplies the approval's derived title/detail ("Edit foo.ts", "Run command", …) [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1284-1300,1456-1498,886-968]. Title precedence: stashed summary → first non-empty line of `lastMessage` (≤120) → kind-generic ("Needs approval" / "Waiting for input"); approval detail is dropped when it merely repeats the title; `pendingId` rides ONLY approvals — a question strips it because approve/deny is wrong UX for a picker [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1301-1321]. `recordAgentEvent` returns the broadcast event enriched from the SAME classification (`askKind` set; `pendingId` stripped on questions) so canvas, notch, and phone cannot disagree [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1214-1236].
**PWA adoption note:** classify once at production time and enrich the single broadcast, rather than letting each consumer re-derive kind from raw state — this kills the whole class of "buttons shown on a question" bugs Pi Remote would otherwise rediscover per surface.

### F-4 — Dedup is TITLE-based and bounded, and survives restarts

Approval/question dedup is title-based, not edge-based: if the node's newest UNRESOLVED same-title ask is younger than `QUESTION_DEDUP_WINDOW_MS` (10 min), the re-assertion is suppressed; an OLDER lingering same-title event (restored across a restart, long-abandoned turn) is superseded — marked resolved — and the new ask fires; a different-title unresolved ask never suppresses [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1329-1338,296-302]. When a genuinely new ask lands, ALL older unresolved asks for that node settle first (`resolveUnresolvedFor`) — sequential asks keep the state pinned at `blocked`, so transition-based resolve alone would stack cards [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1357-1372,1003-1010]. Restart persistence: `loadPersisted` restores main state + the inbox feed verbatim (re-applying the cap and per-node retention) WITHOUT firing any listener, so the done-edge guard and title-dedup survive a process restart — the fix for a field bug that produced three identical APNs pushes, one per Server-Edition restart [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1076-1164]. `onInboxActionable` fires exactly once per newly-appended actionable event, POST-dedup — the seam push-notify hooks [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:656-671,970-986].
**PWA adoption note:** any dedup that lives only in memory duplicates notifications on every deploy/restart; persist the dedup inputs (prior state + feed) and restore silently. Bound the window so a stale generic title ("Waiting for input") can't muzzle a real new ask forever.

### F-5 — Resolve/archive/live-card lifecycle: host owns resolution, phone owns reading

Leaving blocked/waiting via ANY newer state (including a session reset to idle) marks the node's unresolved approval/question events `resolved: true` — they move to the phone's Archived section [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1255-1260; specs/context/nodeterm-main/docs/mobile-usage-inbox.md:108-109]. Node removal (`clearNode`, permanent destroy only) drops the node's status/activity entries but keeps its events as feed history, marked resolved; a mid-turn deletion fires exactly one synthetic end edge so no surface holds a card forever [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1530-1575]. `ackDone` marks the newest unresolved `done` resolved when the desktop/browser user reads the session, firing an `ack` end edge that dismisses the phone's DONE Live Activity [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1577-1673]. Feed hygiene: `flush` ages out ALL events (resolved and unresolved alike) past the shared 6 h `EXPIRE_MS` horizon — an abandoned blocked node otherwise stays a red card forever; `trimInboxFeed` keeps each node's newest done + newest unresolved ask even past the 50-event cut (audit P2-7) [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1737-1761,598-628]. Live cards: `InboxNodeNow.activity` comes from the RAW hook listener — `Edit|Write|NotebookEdit → "Editing <basename>"`, `Read → "Reading <basename>"`, `Bash → "Running <command ≤60ch>"`, `Grep|Glob → "Searching <pattern>"`, `Task → "Delegating: <description>"`, `WebFetch|WebSearch → "Fetching <host|query>"`, else `"Using <tool>"` — cleared on Stop/done/session-end; `contextPercent` is recorded where the shells broadcast context updates; a working session with an activity string renders as a live card even with no event yet [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:537-587,1439-1507,1509-1528; specs/context/nodeterm-main/docs/mobile-usage-inbox.md:112-118,133-134]. Phone layout: merged events across connections, newest first; unresolved approval/question cards on top, done/resolved under a collapsible Archived group; read/unread + archive state are phone-local — host `resolved` only moves cards out of the actionable list [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:122-134,141-142].
**PWA adoption note:** split ownership cleanly — host owns truth (`resolved`, activity, context%), client owns presentation (read/unread, archive collapse). Pi Remote should copy the protected-trim rule (never let a live ask or newest-done age out of a capped feed) and the 6 h expiry so abandoned sessions self-clean.

### F-6 — Quick-approve: re-read-before-send; SSH slices keep a filtered inbox

Quick approve (claude only in v1): approval cards get Approve/Deny buttons that send the single key `1` / `Escape` to the node's tmux session (`nt-<nodeId>`) over the connection's existing command channel; BEFORE sending, the phone re-reads the status file and only sends when the node is still `blocked`, else shows "already handled"; non-claude approvals fall back to Open session [SOURCE: specs/context/nodeterm-main/docs/mobile-usage-inbox.md:135-140]. The `pendingId` hook-reply ticket rides the mirror to the phone but is dropped from the push body — the phone re-reads the mirror before acting [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:330-334]. SSH slices: `filterMirrorForNodes` keeps `inbox` but filters both `events` and `nodes` to the project's node ids, while dropping `settings`/`usage`/`server` (host-local blocks) — the full mirror would leak other projects' ids to every host [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:450-481; specs/context/nodeterm-main/docs/mobile-usage-inbox.md:119-120,67-70]. Push discipline: 2 s per-project throttle with a trailing push so the final state always ships, plus a 60 s heartbeat that re-flushes `updatedAt` — without it a disconnected desktop's stale file is indistinguishable from an idle-but-connected one, so the phone treats a stale file as "no data" [SOURCE: specs/context/nodeterm-main/src/main/remote-ssh/remote-status-push.ts:15-22,49-79].
**PWA adoption note:** re-read-before-send is the exact guard a PWA quick-action needs over a high-latency carrier — act only on freshly confirmed state, degrade to "already handled" otherwise. Per-project slice filtering + heartbeat-as-liveness is directly adoptable for Pi Remote's multi-host story.

## Questions Answered

- KQ6 [ux] What data contract (MirrorFile/MirrorInbox, InboxEvent, InboxNodeNow) powers the mobile companion screen, and what are its event production, title/dedup, resolve/archive, live-card, and quick-approve rules? — ANSWERED: contract shapes + caps (F-2), additive transport (F-1), production/classification (F-3), dedup (F-4), resolve/archive/live-card (F-5), quick-approve + slicing (F-6), all cited file:line above.

## Questions Remaining

- KQ1 [architecture] How does nodeterm drive one agent core over three carriers (Electron preload, browser WebSocket, E2EE relay tunnel) behind a single RpcClient/FrameTransport contract, and what is the exact transport interface, frame discrimination, in-flight failure, and RPC envelope shape?
- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)?
- KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)?
- KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?

(Note: KQ1 was marked answered in iteration 1; it is restated here verbatim from the strategy's remaining list because the reducer owns Section 3 — the leaf does not edit machine-owned sections.)

## Next Focus

Recommend **KQ5 (hook-reply approvals)**: KQ6 surfaced the consumer half of that contract — `pendingId` tickets riding the mirror, askKind distinction, re-read-before-send [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:330-334,1316-1321] — and the producer half (`~/.nodeterm/pending/<pendingId>.answer` decision files, path-traversal validation, stale sweeping, fail-open timeout, documented in `docs/hook-reply-approvals.md`) is the natural next read. Alternative: KQ7 (drop resilience), for which iteration 1 noted `ws-bridge.ts` lines 400–907 unread (strategy §8).

## Ruled Out

- Nothing ruled out this iteration; no approach failed. No exhausted-approach categories exist in strategy §9 and none were hit.

## Dead Ends

- None. All three named sources were readable and mutually consistent.

## Edge Cases

- Ambiguous input: none.
- Contradictory evidence: none — the doc (v1 contract) and code agree; the code additionally carries post-v1 additive fields (`options`, `multiSelect`, `pendingId`, `prompt`, Live Activity seams) that strictly extend the documented contract [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:322-334,343-346,673-748], consistent with the doc's "additions are optional fields" rule.
- Missing dependencies: `resource-map.md` absent (coverage gate skipped per config) — no impact on this focus. Progressive synthesis is enabled in config, but the prompt pack's ALLOWED WRITE PATHS enumerate exactly three targets and exclude `research/research.md`; the pack is the governing task definition, so no synthesis update was made this iteration. Flagged here for the orchestrator/reducer to own.
- Partial success: none — all planned actions completed.

## SCOPE VIOLATIONS

- None. All writes stayed within the three allowed paths; researched sources untouched (READ-ONLY respected).

## Sources Consulted

- specs/context/nodeterm-main/docs/mobile-usage-inbox.md:1-143
- specs/context/nodeterm-main/src/core/agent-status-mirror.ts:31-36,146-354,360-448,468-481,510-511,537-587,589-628,656-748,771-803,805-868,886-968,970-1001,1003-1010,1076-1164,1214-1236,1238-1429,1431-1437,1439-1507,1509-1528,1530-1575,1592-1673,1690-1712,1733-1782
- specs/context/nodeterm-main/src/main/remote-ssh/remote-status-push.ts:1-90

## Assessment

- New information ratio: 1.0 (6 of 6 findings fully new; first pass over all three sources)
- Questions addressed: KQ6
- Questions answered: KQ6

## Reflection

- What worked and why: reading the protocol doc FIRST gave the contract vocabulary, then the implementation pass verified every documented rule against code and surfaced the undocumented halves (stash-priority classification, bounded dedup, restart persistence, protected trim, mid-turn end edges) that live only in code comments — two batched passes covered 2000+ lines within budget.
- What did not work and why: nothing failed; the only friction was the file's 50 KB read cap requiring a second offset read (planned for, budget held).
- What I would do differently: none material; for KQ5, start from `docs/hook-reply-approvals.md` and grep `pendingId` producers rather than reading whole files, mirroring this iteration's doc-first ordering.
