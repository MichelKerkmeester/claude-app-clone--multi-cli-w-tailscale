# Iteration 8: KQ4 — Universal Event Shape + Live Transcript Tails

## Focus

KQ4 [logic]: How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?

The dispatch focus directed priority to the transcript-tail half (iteration 7 had already covered `normalize.ts` field docs en route): `transcript-index-core.ts`, `transcript-reader.ts`, `subagent-tail.ts`, `context-tail.ts`, `docs/mobile-usage-inbox.md` activity rules, plus raw-format fixtures under `specs/context/nodeterm-main`. No ambiguity in the focus; no exhausted approaches applied (strategy §9 categories do not touch this area). Researched surface treated as READ-ONLY throughout.

## Actions Taken

1. Batched full read: `src/core/transcript-index-core.ts` (102 lines), `src/core/transcript-reader.ts` (371 lines), `src/core/context-tail.ts` (367 lines).
2. Batched full read: `docs/mobile-usage-inbox.md` (143 lines), `src/core/subagent-tail.ts` (238 lines).
3. Targeted grep of `src/shared/agents/normalize.ts` for the `NormalizedAgentEvent` interface body and all normalizer signatures (interface re-read kept narrow because iteration 7 documented the field semantics).
4. Fixture inspection: listed `src/core/__fixtures__/` (codex, gemini, grok) and sampled `codex/rollout.jsonl`, `gemini/session.jsonl` heads to compare raw dialects against Claude's transcript shape.
5. Wrote artifacts: this narrative, the canonical state-log append, `deltas/iter-008.jsonl`.

## Findings

### F-01 — One universal event shape; per-agent normalizers absorb every dialect
`NormalizedAgentEvent` (`src/shared/agents/normalize.ts:7-40`) is a discriminated union on `kind`: `'state' | 'subagent-start' | 'subagent-end' | 'recurring' | 'session' | 'background-task'`, carrying `nodeId`/`agentId`/`state?` plus optional semantic flags each with a named downstream consumer: `interrupted` (done-only — skip completion alert because the user was present), `idle` (done-only rescue that may only move a still-`working` node), `awaitingInput` (codex waiting-hold through a turn-end `done`), `newTurn` (genuine UserPromptSubmit — clears per-turn fan-out), `pendingId` (blocked-only deterministic-approval ticket merged by the hook server). Six normalizers — `normalizeClaude` (:142), `normalizeCodex` (:301), `normalizeGemini` (:353), `normalizeCopilot` (:414), `normalizeOpencode` (:465), `normalizeGrok` (:583) — map native hook envelopes into the shape; `normalizeFor(agentId, env)` (:711) is the single dispatch point, and agent-specific field names live only inside the normalizers (:5-6).
**PWA adoption note:** adopt one discriminated event union + per-provider adapter functions behind one dispatcher; status reducers and UI never see provider dialects.

### F-02 — Fixtures confirm how heterogeneous the raw formats are
Codex wraps everything in `{timestamp, type, payload}` envelopes — `session_meta`, `event_msg` (`task_started` with `model_context_window: 258400` stated inline), `turn_context` (`src/core/__fixtures__/codex/rollout.jsonl:1-3`). Gemini is event-sourced: a header line followed by `$set` message-array replays (`src/core/__fixtures__/gemini/session.jsonl:1-2`). Grok ships `summary.json` (`src/core/__fixtures__/grok/summary.json`). Claude's transcript is flat `{type, message:{content}}` JSONL (`transcript-reader.ts:47-76`). The normalizer layer is what lets one status machine (KQ3's reduceEntry) serve all agents.
**PWA adoption note:** pin a fixture file per provider dialect as a test asset — per-agent fixtures are what made nodeterm's capability parity measurable rather than assumed.

### F-03 — Transcript reader: bounded tails, traversal-proof ids, account-scoped caching
Reads cap at the last 5 MB (`READ_CAP_BYTES`, `transcript-reader.ts:20-22`) so a huge session cannot block the main process; a capped read drops the partial leading line (:78-103). Extraction is role-tagged: assistant text verbatim, `tool_use` rendered `$ name arg` with the argument picked from `command/file_path/path/pattern/description/prompt` (:39-61), `tool_result` summarized to 3 lines / 500 chars (:35-37). `parseChatMessages` correlates a later `tool_result` back onto its tool part by `tool_use_id` (:125-181). `SESSION_ID_RE = /^[0-9a-fA-F-]{8,64}$/` rejects malformed ids BEFORE any filesystem touch — alone preventing path traversal (:189-191, :208). `resolveTranscriptPath` caches per `${accountId}:${sessionId}` and access-checks each hit to heal stale entries (:203-240); session-name resolution is STRICTLY by sessionId — no cwd fallback, else co-located nodes adopt each other's names (:290-294). Remote sessions answer through an injected `remoteReader` checked FIRST, because the title poll runs every ~4s and a local scan would be pure waste (:303-330). `encodeTranscriptDir` is exported as the ONE cwd-encoding so the remote locator cannot drift (:340-345).
**PWA adoption note:** cap every log read by bytes-from-end, validate ids against a charset allowlist before touching storage, and key caches by (account, session).

### F-04 — Transcript index: pure helpers, mtime-incremental refresh, parser-consistent with the chat view
`transcript-index-core.ts` is deliberately fs-free — the service layer reads files and calls these pure helpers, and indexing reuses the SAME `parseTranscriptLines` as the single-session reader so indexed text stays consistent with the find-bar (:1-6). Indexed text keeps only the newest 200 KB (`INDEX_TEXT_CAP_BYTES`, :10, :41); the title is the first user message whitespace-collapsed to 80 chars (:38-39); `cwd` comes from the first JSONL line carrying it — "reliable, unlike decoding the dashed directory name" (:21-34). `searchEntries` requires ≥2-char queries, filters title/text substrings, sorts mtime descending, limits to 20 (:55-74). `planRefresh` diffs a fresh scan against prior entries by mtime: re-read new/changed files, keep identical ones, drop absent ones (:85-102).
**PWA adoption note:** mtime-keyed incremental re-index plus one shared parser between search and detail views transfers directly to a SvelteKit session-list search.

### F-05 — Subagent tail: meta-correlated fan-out streaming with tear-safe carries
Each spawned subagent gets its own transcript at `<parentDir>/<sessionId>/subagents/agent-<id>.jsonl` plus a sibling `.meta.json` carrying the spawning `tool_use_id`; the tail resolves the file by matching that id (`subagent-tail.ts:1-7`). Resolution retries safely: only a meta that POSITIVELY names another subagent is blacklisted; an unparseable or mid-write meta is re-read next tick — blacklisting it would skip this subagent's own meta forever and its transcript would never stream (:163-179). Ticks run every 400 ms, offset-based, capped at 1 MB per tick — a capped read loses nothing because the next tick continues at the offset (:11-15, :184-192). `splitCompleteLines` splits at the last `0x0a` byte and carries the remainder as RAW bytes — `\n` never occurs inside a UTF-8 continuation, so a torn multibyte char always rejoins valid (:121-133). `finish()` flushes the held carry after a final read plus a 1500 ms grace late-flush for ticks that re-fill it (:220-236). Output format: prose verbatim, tools as `$ name arg`, results as one-line `↳` summaries; `formatSubagentChunk` mirrors the tail loop exactly so local and remote streamed output stay byte-identical (:73-119).
**PWA adoption note:** the byte-level carry + grace-flush pair is the correct recipe for tailing any append-only JSONL over chunked reads.

### F-06 — Context tail: backward-scanned usage, per-agent parse dep owns the denominator, two free side-channel signals
Context fill polls at 1 Hz per tracked session with offset reads, all async — sync syscalls here sat on the main thread servicing PTY streaming and IPC (`context-tail.ts:10`, :222-224). Both the first read of a resumed transcript and huge append bursts jump to the newest 1 MB — only the LATEST usage matters (:15, :238-242); truncation/rotation resets the offset (:237) and an offset jump discards stale carry bytes (:243). `parseLatestUsage` scans BACKWARD and stops at the first line settling both values; `includes('"usage"')`/`includes('"assistant"')` pre-filters skip 100 KB+ tool-result lines without any parse (:31-62). Claude's used = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` (:49-51). The `parse` dep is injectable per agent (gemini/codex pass their own) and OWNS the window: claude's `cachedWindowFor` always answers (200k catch-all) so it is consulted only on claude's path; a custom parser that cannot state a window yields `null` and pushes NOTHING — "a used count over a guessed denominator is worse than no meter at all" (:147-159, :282-297). Pushes are change-gated on used/model/window (:300-311); a `reading` flag prevents double-reads while async work is in flight (:172-173, :225-227). Two side channels ride the same tail: `parseTaskNotifications` sniffs `queue-operation` lines carrying `<task-notification>` with a `tool-use-id` — the REAL end signal for async-launched subagents whose PostToolUse was only a launch ack (:64-108); `hasToolResult` treats any `tool_result` as "the blocking tool settled" — the only signal when an AskUserQuestion ask ends via Esc (no PostToolUse, no Stop) (:110-139). ONE `split('\n')` serves all three scanners per tick (:17-20, :258-267).
**PWA adoption note:** backward-scan-with-prefilters for any "latest value" log query, and never render a percentage whose denominator the source did not state.

### F-07 — Activity strings + contextPercent: the raw-listener → mobile live-card pipeline
`InboxNodeNow.activity` (≤80 chars) derives from the RAW hook listener's `tool_name`/`tool_input` via a CLOSED mapping: `Edit|Write|NotebookEdit → "Editing <basename>"`, `Read → "Reading <basename>"`, `Bash → "Running <command ≤60ch>"`, `Grep|Glob → "Searching <pattern>"`, `Task → "Delegating: <description>"`, `WebFetch|WebSearch → "Fetching <host|query>"`, else `"Using <tool>"`; cleared on Stop/done/session-end (`docs/mobile-usage-inbox.md:91-96`, :112-116). `contextPercent` rides the same mirror where the shells broadcast context updates (:117-118) — the number `createContextTail` computes and pushes (:208-219). Working sessions with an activity string render as live cards even with no inbox event yet (:132-134); inbox events dedup by unresolved-same-title and flip `resolved: true` on any newer state event (:102-109).
**PWA adoption note:** a closed tool→verb table with a generic fallback delivers "what is it doing right now" UX for one small mapping — no transcript streaming required on the phone.

## Questions Answered

- **KQ4 (both halves).** Normalization: `NormalizedAgentEvent` union + six per-agent normalizers behind `normalizeFor`, with fixtures proving the dialect spread they absorb (F-01, F-02). Live transcript tails: bounded capped reads, sessionId-strict resolution, mtime-incremental index, subagent fan-out streaming with tear-safe carries, 1 Hz context-fill with per-agent-owned denominators, and the raw-listener activity-string pipeline feeding mobile live cards (F-03 through F-07).

## Questions Remaining

- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?

## Next Focus

KQ2 (E2EE security layers) — the only open key question, carried forward since iteration 1. Iterations 9–10 should close it by reading the relay tunnel crypto implementation and its docs under `specs/context/nodeterm-main` (NaCl box construction, HKDF key derivation, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), mapping each layer to the specific attack it defeats, with PWA adoption notes per layer.

## Sources Consulted

- specs/context/nodeterm-main/src/shared/agents/normalize.ts:5-40,142,301,353,414,465,583,711
- specs/context/nodeterm-main/src/core/transcript-reader.ts:20-103,125-181,189-240,270-345
- specs/context/nodeterm-main/src/core/transcript-index-core.ts:1-102
- specs/context/nodeterm-main/src/core/subagent-tail.ts:1-15,73-133,163-236
- specs/context/nodeterm-main/src/core/context-tail.ts:10-62,64-139,141-219,222-315
- specs/context/nodeterm-main/docs/mobile-usage-inbox.md:75-97,99-118,130-134
- specs/context/nodeterm-main/src/core/__fixtures__/codex/rollout.jsonl:1-3
- specs/context/nodeterm-main/src/core/__fixtures__/gemini/session.jsonl:1-2
- specs/context/nodeterm-main/src/core/__fixtures__/grok/summary.json

## Edge Cases

- Ambiguous input: none — the dispatch focus enumerated exact files and priorities.
- Contradictory evidence: none — docs and code agree (activity rules doc matches the mirror contract; fixture formats match the normalizers' expectations).
- Missing dependencies: none — all six named sources readable; fixture sampling used partial heads, sufficient for format comparison.
- Partial success: none — full coverage achieved within budget (9 of 12 tool calls used for research + state).

## Assessment

- New information ratio: 0.93 ((6×1.0 + 1×0.5) / 7 — F-01 partially overlaps iteration 7's en-route normalize.ts coverage; all transcript-tail findings are fully new).
- Questions addressed: KQ4.
- Questions answered: KQ4.

## Reflection

- What worked and why: the batched full-read of six modest files in two parallel passes (the pattern that won iterations 1–7) again gave complete line-cited coverage in 9 of 12 calls — nodeterm's design comments carry the rationale (torn-multibyte carries, denominator honesty, non-blacklisting meta retries), so findings cite primary intent rather than inference.
- What did not work and why: nothing failed; the only adjustment was re-reading `normalize.ts` narrowly (interface + signatures via grep) instead of a full re-read, since iteration 7 already documented its field semantics.
- What I would do differently: nothing material for this focus; for KQ2, front-load the relay crypto doc before the implementation pass (the iteration-2 lesson: doc-first gives the vocabulary, code verifies and surfaces undocumented halves).

## SCOPE VIOLATIONS

None. All writes stayed within the three allowed packet paths; the researched repo was only read.
