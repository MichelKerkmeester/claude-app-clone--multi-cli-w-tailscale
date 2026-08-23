# Iteration 3: KQ5 — Hook-Reply Approve/Deny Producer Half

## Focus

Answer KQ5 [ease-of-use]: how nodeterm delivers deterministic approvals without keystroke injection — the permission hook holds the request open and polls a per-decision answer file any answerer writes atomically. Sub-topics targeted per the iteration prompt pack: pendingId generation and PENDING_ID_RE path-traversal validation, stale-request sweeping, fail-open timeout back to the interactive prompt, askKind distinction (question picker strips pendingId vs genuine approval), re-read-before-send guard, and the adjacent approval-mode/permission-mode mapping.

Interpretation notes: strategy §11 still projected "KQ6", but the state log's `focus_override` row (run 3) already moved this iteration to KQ5 after iteration 2 resolved KQ6 — the dispatch prompt pack and state log agree, so no ambiguity remains. All researched paths were READ-ONLY; no writes touched `specs/context/nodeterm-main`.

## Actions Taken

1. Read `src/core/agents/pending-approvals.ts` in full (136 lines) — the answer-file writer, validator, sweeper, and synthetic-event builder.
2. Read `docs/hook-reply-approvals.md` in full (67 lines) — the v1 contract: request/poll/reply lifecycle, answerer set, env gating, cleanup rules.
3. Grep across `src/` for `askKind|resolvePermissionMode|activePermissionMode` — mapped the enrichment seam and the permission-mode resolver surfaces.
4. Read `src/shared/agents/normalize.ts` (lines 1–110) — `NormalizedAgentEvent` docs for `pendingId`, `askKind`, `nodeterm_answered`.
5. Read `src/core/agent-status-mirror.ts` (lines 1180–1264) — `recordAgentEvent` enrichment and the stash-priority classification reuse.
6. Read `src/shared/agents/approval-mode.ts` in full (222 lines) — per-agent approval-flag dialects and the interpolation-site re-validation.

## Findings

### F-1 — Held-hook + answer-file contract: the reply channel is a file on the host the agent runs on

The managed hook script's `PermissionRequest` branch (env-gated on `NODETERM_PERM_WAIT_SECS` > 0) generates `pendingId = <nodeId>-<epoch-ms>-$$`, writes the incoming hook JSON to `~/.nodeterm/pending/<pendingId>.json` (mkdir -p, umask 077), POSTs to the loopback hook server fire-and-forget (this is how the mirror/inbox learns the pendingId), then polls `<pendingId>.answer` every 0.5 s up to the wait budget (default injected: 45 s, kept under Claude's own hook timeout). When the answer file appears it reads `allow`|`deny`, removes both files, and prints the decision JSON to stdout — Claude Code applies the decision BEFORE ever painting the prompt. The design exists because the answerer may be a phone reaching the host over SSH with no route to the desktop's loopback server; a file on the agent's host is reachable by every answerer (inspired by claude-island's EventServer). POSIX sh only, no deps; the wait branch is a no-op when the env var is absent (user's own terminals, older nodeterm). [SOURCE: specs/context/nodeterm-main/docs/hook-reply-approvals.md:3-35] [SOURCE: specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:1-9]

**PWA adoption note:** Pi Remote's SvelteKit PWA should adopt the same inversion — never inject keystrokes into a PTY prompt; hold the decision as a durable per-decision ticket keyed by an unguessable id that ANY answering surface (phone UI, desktop, CLI) can resolve through whatever transport it has. The ticket decouples the asker (agent host) from the answerer (any client), which is exactly the property a mobile PWA behind flaky connections needs.

### F-2 — pendingId generation and PENDING_ID_RE: the only value interpolated into a filename is allowlisted

`PENDING_ID_RE = /^[A-Za-z0-9_-]+$/` documents the shape the script generates (`<node>-<ms>-<pid>`) and is "the ONLY thing we interpolate into a filename. Validated everywhere a pendingId becomes a path so a forged value can't traverse (`../`) or inject. Keep in sync with the managed script's `tr -c 'A-Za-z0-9_-'`." `isValidPendingId` adds a non-empty, ≤256-char cap before the regex test; `writePendingAnswerLocal` returns false on an invalid id rather than writing anything. On the event side, `pendingId` rides the raw POST body's `nodeterm_pending_id` (merged into the payload by the hook server) and its absence means "no held hook — legacy prompt path". [SOURCE: specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:16-28,46] [SOURCE: specs/context/nodeterm-main/src/shared/agents/normalize.ts:31-35]

**PWA adoption note:** any Pi Remote decision-ticket id must pass a strict allowlist regex plus a length cap at EVERY point it becomes a path, filename, or URL segment — validate at the writer, not just the generator, because the id arrives over the network from clients. Mirror the generator's charset in one shared constant so script and server cannot drift.

### F-3 — Atomic answer write with fail-open error semantics

`writePendingAnswerLocal` writes the one-line decision atomically: mkdir 0o700, write `${file}.${pid}.tmp` at mode 0o600, then rename over the final `.answer` name; on any fs error it removes the tmp file and resolves false — "fail-open — the hook simply times out to the interactive prompt". Every function in the module fails soft: an invalid pendingId or fs error resolves false/logs, never throws. The module is Electron-free (fs/path/os only) so both shells (desktop main + server) boot it. [SOURCE: specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:8-9,36-60]

**PWA adoption note:** tmp+rename atomicity plus restrictive modes are directly portable to any file-backed state Pi Remote keeps on the Pi (answer tickets, mirror files). The deeper pattern is the failure direction: a failed answer delivery must degrade to the pre-existing interactive flow, never wedge the agent or throw into the UI.

### F-4 — Fail-open timeout and stale-request sweeping bound every ticket's lifetime

On poll timeout the hook script removes the request file, prints NOTHING, and exits 0 — Claude shows its normal interactive prompt and legacy send-keys still works as the fallback (bit-for-bit legacy behavior). Orphans from killed/timed-out sessions are bounded by `PENDING_MAX_AGE_MS` (10 min) with `sweepPendingDir` removing `.json`/`.answer` files older than the max by mtime, best-effort (missing dir or unreadable entry silently skipped, raced deletions tolerated); `startPendingSweep` runs one sweep at boot then hourly on an unref'd interval, wired once per shell. Answerers additionally never create answer files for pendingIds they didn't read from a live approval event, and re-check the event is still unresolved before writing (the re-read-before-send guard). [SOURCE: specs/context/nodeterm-main/docs/hook-reply-approvals.md:13-14,30-32,57-60] [SOURCE: specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:21-24,84-135]

**PWA adoption note:** every async decision in Pi Remote needs all three bounds: a TTL that fails open to the previous UX, a periodic reaper for orphaned tickets, and a re-read-before-resolve guard so two surfaces (phone + desktop) racing on the same ticket cannot double-apply a decision.

### F-5 — askKind distinction: a question strips its pendingId so approve/deny UI can never render on a picker

`NormalizedAgentEvent.askKind?: 'question' | 'approval'` is an ENRICHED field the shells broadcast — produced by the mirror, never by the normalizers. In `recordAgentEvent`, the ONE stash-priority classification the mirror already computes for the inbox is reused to enrich the broadcast: a fresh AskUserQuestion stash gains `askKind:'question'` and has its `pendingId` STRIPPED (field report: the approve/deny buttons showed during an AskUserQuestion — approve/deny on a question is wrong UX), while a genuine approval gains `askKind:'approval'` and keeps its `pendingId` unchanged. Every non-needs-you event passes through untouched (same reference). The canvas keys its buttons off `pendingId`, which is now absent on questions — two consumers, one source of truth. [SOURCE: specs/context/nodeterm-main/src/shared/agents/normalize.ts:36-43] [SOURCE: specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1189-1236]

**PWA adoption note:** classify each needs-you event once, server-side, and enrich the broadcast payload with both the kind and the (possibly stripped) action capability — the phone UI should switch on what the event CARRIES, not re-derive ask-type from message text. This kills an entire class of wrong-action bugs at the source.

### F-6 — Optimistic answered event and the second-POST handshake: instant UI, idempotent convergence

When the desktop/phone writes the answer file, `syntheticAnsweredEvent` builds the same normalized event the managed hook's second POST would produce (payload `nodeterm_answered=<decision>` + `nodeterm_pending_id`, routed through the identical `normalizeClaude` path) so the caller can OPTIMISTICALLY flip the badge to working before the round trip lands; the later real POST is an idempotent duplicate (a same-state working re-assert is a no-op in the mirror + renderer store). On the wire, `nodeterm_answered` is matched BEFORE `hook_event_name` and maps to a synthetic working transition, not a new ask. Claude-only (PermissionRequest is a Claude concept); returns null on an invalid decision. [SOURCE: specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:62-82] [SOURCE: specs/context/nodeterm-main/src/shared/agents/normalize.ts:99-106]

**PWA adoption note:** the optimistic-local-echo + idempotent-server-replay pair is the right mobile pattern for approvals over high-latency links: reflect the user's tap instantly from a locally synthesized event shaped EXACTLY like the authoritative one, and let the real confirmation be a no-op when it arrives.

### F-7 — Approval-mode mapping: per-agent dialects, no nearest-match substitution, re-validation at the interpolation site

Launch-time permission modes translate through ONE `ApprovalDialect` record per agent (flag + accepted values together, so a third agent added to the table cannot silently emit another agent's flag): gemini `--approval-mode plan|auto_edit|yolo`, codex `--ask-for-approval untrusted|on-request|never`. Two honesty rules: a mode the CLI cannot express emits NO flag (never a substituted nearest match — mapping gemini's default `auto` to `auto_edit` would have silently switched on edit auto-approval for every existing node at upgrade), and codex's `manual` DOES emit `untrusted` because its built-in default (OnRequest) does not match the "Ask each time" label. `approvalFlags` re-validates the mode at the top because the value comes from hand-editable git-shared JSON interpolated into a shell command line — without the guard a forged `constructor` indexes the plain-object table and hands back a Function headed for a tmux `send-keys` line; `dialectFor` closes the same hole on the open AgentId via `Object.hasOwn`. `withPermissionMode` is the single launch funnel; flag placement (before grok's `--` end-of-options separator) is decided at the composed layer. UI copy (`unsupportedModesNote`, `bypassSandboxCaveat`) is DERIVED from the mapping so sentences cannot drift from what the table does. The runtime resolver `activePermissionMode` binds project override → global setting and applies the `auto` version gate for claude ONLY (probed CLI version; unknown/fail ⇒ bare command), with SSH projects gated on the remote host's CLI. [SOURCE: specs/context/nodeterm-main/src/shared/agents/approval-mode.ts:1-13,27-33,35-51,53-70,83-104,106-137,139-222] [SOURCE: specs/context/nodeterm-main/src/renderer/state/permissionMode.ts:97-162] [SOURCE: specs/context/nodeterm-main/src/shared/agents/config.ts:211,599]

**PWA adoption note:** Pi Remote settings that become flags or API params need the same three guards: one record per target dialect (flag + vocabulary inseparable), unexpressible values emit nothing rather than a nearest match (especially dangerous on DEFAULT-valued settings), and re-validation at the interpolation site because stored settings are user-editable data, not typed facts.

## Questions Answered

- KQ5 [ease-of-use] How does hook-reply Approve/Deny deliver deterministic approvals without keystroke injection (per-decision answer files, pendingId generation and path-traversal validation, stale sweeping, fail-open timeout, askKind distinction, re-read-before-send)? — answered in full: every named sub-mechanism is now cited from primary sources (F-1 through F-6), with the launch-mode half (F-7) covering the approval-mode/permission-mode angle.

## Questions Remaining

- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)?
- KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?

## Sources Consulted

- specs/context/nodeterm-main/src/core/agents/pending-approvals.ts:1-136 (answer-file writer, PENDING_ID_RE, sweeper, synthetic event)
- specs/context/nodeterm-main/docs/hook-reply-approvals.md:1-67 (v1 contract: request/poll/reply, answerers, env gating, cleanup)
- specs/context/nodeterm-main/src/shared/agents/normalize.ts:1-110 (NormalizedAgentEvent: pendingId, askKind, nodeterm_answered docs)
- specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1180-1264 (recordAgentEvent enrichment, NeedsYouClassification, state-leave resolution)
- specs/context/nodeterm-main/src/shared/agents/approval-mode.ts:1-222 (dialect table, modeSupported, approvalFlags, withPermissionMode, derived copy)
- specs/context/nodeterm-main/src/renderer/state/permissionMode.ts:97-162 (activePermissionMode resolver, claude-only auto gate, SSH handling — via grep line evidence)
- specs/context/nodeterm-main/src/shared/agents/config.ts:211,599 (gate ownership note, resolvePermissionMode home — via grep line evidence)

## Assessment

- New information ratio: 1.0 (7 of 7 findings fully new — first pass over all six named KQ5 sources; no prior packet evidence overlapped them beyond the KQ6 inbox quick-approve context already answered in iteration 2).
- Questions addressed: KQ5 (complete).
- Questions answered: KQ5.
- Coverage note: the managed-script side (`managed-script.ts` PermissionRequest branch) was read through its contract documentation and the writer-side sync comments rather than directly; the doc + code agree on every point cross-checked (charset, poll cadence, timeout behavior, sweep ages). Direct script read is available if a later iteration needs the sh internals.

## Reflection

- What worked and why: reading the contract doc FIRST then verifying against code repeated iteration 2's winning sequence — every documented rule (atomic write, fail-open, sweep ages, askKind stripping) was confirmed at specific lines, and the code-only halves (syntheticAnsweredEvent optimism, Object.hasOwn prototype-hole guard, derived UI copy) surfaced where the doc is silent. One grep pass mapped three files' relevant regions before any read, keeping total calls at 12.
- What did not work and why: nothing failed. Budget pressure was real: the 12-call cap forced folding the permissionMode.ts read into grep line-evidence instead of a full read — acceptable because the resolver's load-bearing behavior (claude-only gate, SSH branch) is visible in the matched lines and pinned by its test file's assertions in the same output.
- What I would do differently: for remaining iterations, prefer one alternation-pattern grep per question up front (it cost one call and de-risked three reads), and keep the doc-first ordering.

## Recommended Next Focus

KQ7 [ux] drop resilience (heartbeat/reap, backpressure, frame caps, reconnect-in-place) — it shares the ws-bridge/relay seam with KQ1's carrier work and completes the connectivity story the PWA depends on most; KQ8 (push decisioning) naturally follows since it consumes the same mirror/inbox events KQ6 established. Alternatively KQ3 (reduceEntry) if the loop prefers logic-layer depth next; both were carried forward since iteration 1.

## SCOPE VIOLATIONS

None. All writes stayed inside the three allowed paths. Note: config sets `progressiveSynthesis: true`, but the dispatch allow-list for this iteration names exactly three write targets and `research/research.md` is not among them — per the prompt pack's scope protocol the narrower dispatcher constraint wins, so no synthesis update was attempted this iteration; the workflow/reducer owns that surface.

## Edge Cases

- Ambiguous input: none material (strategy §11's stale KQ6 projection was already superseded by the logged focus_override to KQ5).
- Contradictory evidence: none — doc and implementation agree on every cross-checked rule.
- Missing dependencies: `resource-map.md` absent (coverage gate skipped, per config); `managed-script.ts` read only via its documented contract (see Assessment coverage note).
- Partial success: none — all planned reads succeeded within budget.
