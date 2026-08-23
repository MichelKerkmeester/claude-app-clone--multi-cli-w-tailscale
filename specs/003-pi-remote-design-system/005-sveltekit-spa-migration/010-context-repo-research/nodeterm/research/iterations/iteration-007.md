# Iteration 7: KQ3 — reduceEntry Status State Machine

## Focus

KQ3 [logic]: How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips — DONE_HOLDOFF, the stale-working sweeper (WORKING_STALE_MS), interrupt inference, the awaitingInput hold, the idle-rescue signal, newTurn gating, and transient-vs-persisted fields. This was the focus set by the run-7 `focus_override` event (adopted leaf-authored recommendation); strategy §11's KQ7 anchor was a stale projection already answered in iteration 4.

## Actions Taken

1. Read config, strategy, and state log; verified boundary (6 prior iteration records → this is 7; `iteration-007.md` and `iter-007.jsonl` absent; append-only state log intact).
2. Batched full read of the four named sources: `src/renderer/state/agentStatus.ts` (653 lines), `src/shared/agents/stale.ts` (31 lines), `src/shared/agents/normalize.ts` (719 lines).
3. Read `src/core/agent-status-mirror.ts` (1815 lines) in two passes — the 50 KB read cap split it at line 1072; the continuation captured `recordAgentEvent`, `produceInboxFromState`, `loadPersisted`, `sweepStaleWorking`, and `flush`.
4. All researched files READ-ONLY; no writes outside the three allowed artifact paths.

## Findings

### F-01 — DONE_HOLDOFF: a 3 s parallel-hook guard duplicated on both sides of the seam
Claude Code runs hooks in PARALLEL, so the last PostToolUse `working` POST can arrive after the Stop `done` POST [SOURCE: specs/context/nodeterm-main/src/renderer/state/agentStatus.ts:196-198]. Both copies of `DONE_HOLDOFF_MS = 3000` (renderer agentStatus.ts:198; mirror agent-status-mirror.ts:28-31) drop a `working` event when `!newTurn && prev === 'done' && now - clock < 3000` [SOURCE: agentStatus.ts:330-337; SOURCE: agent-status-mirror.ts:422-436]. Only a genuine newTurn (UserPromptSubmit) may resurrect the turn. The mirror leaves `state` + `updatedAt` untouched on a holdoff so the window keeps measuring from the `done` [SOURCE: agent-status-mirror.ts:424-425]; the renderer returns the same state object (no re-render) [SOURCE: agentStatus.ts:336-337]. The holdoff also gates downstream seams: a held-off working keeps `nextState === 'done'`, so no spurious Live Activity `start` fires and no duplicate `done` lands inside the window [SOURCE: agent-status-mirror.ts:1239-1241, 1263-1265].
**PWA adoption**: copy verbatim for any PWA status reducer fed by parallel/out-of-order webhook events — hold terminal states against non-turn-start progress events for a short window, with one explicit "genuine new turn" flag as the only bypass.

### F-02 — Stale-working sweeper: ONE constant, ONE decider, one synthetic end edge
`WORKING_STALE_MS = 20 * 60_000` lives in shared/agents/stale.ts:21 under a "ONE rule, three surfaces" docblock — each surface used to invent its own timeout (30 min renderer, 20 notch, none on the phone) [SOURCE: specs/context/nodeterm-main/src/shared/agents/stale.ts:1-12]. The core mirror sweep is the single DECIDER: every 60 s (`STALE_SWEEP_MS`, agent-status-mirror.ts:634, 1714-1720) it moves stale `working` entries to `done` and fires ONE synthetic `onNodeStateChange` end edge marked `stale: true` so no consumer celebrates it [SOURCE: agent-status-mirror.ts:1690-1712]; no inbox event is pushed (nothing finished) [SOURCE: agent-status-mirror.ts:1683-1688]. `updatedAt` is deliberately NOT touched: falsifying it would rewrite history AND arm the 3 s done-holdoff, swallowing a real event right after a wrong guess; the sweep is self-healing (one later event puts the node back to working) [SOURCE: agent-status-mirror.ts:1684-1688]. 20 min is long on purpose: a single silent tool run (a long build) fires no hooks between Pre- and PostToolUse, so anything shorter flips genuinely-running turns to idle [SOURCE: agentStatus.ts:199-205; SOURCE: stale.ts:16-20]. The renderer keeps its own sweeper as a safety net for badges whose events never reached the mirror — and it blanks to `state: undefined` (Unknown bucket) stamping both clocks, unlike the mirror's `done` [SOURCE: agentStatus.ts:203-206, 419-433]. A related hole was closed separately: a session END mid-turn resets state to `undefined`, which `isStaleWorking` cannot match — the 20-min net was structurally bypassed until a dedicated session-end-mid-turn synthetic end edge was added [SOURCE: agent-status-mirror.ts:1395-1428].
**PWA adoption**: one shared stale constant + one server-side decider emitting a clearly-flagged synthetic end event beats per-surface timers; never mutate the freshness timestamp during a sweep; add the explicit "session ended mid-turn" edge or the sweeper's predicate misses resets.

### F-03 — Interrupt inference: settle window + unchanged freshness baseline
Claude fires NO hook when the user cancels a turn, so an interrupted node would sit on `working` forever [SOURCE: agentStatus.ts:229-233]. On a lone Esc/Ctrl-C from the input path, `inferInterruptAfterSettle` waits `INTERRUPT_SETTLE_MS = 1500` [SOURCE: agentStatus.ts:209, 591-602]; if the node is still `working` AND `stateAt` is unchanged (not one hook event arrived since the keystroke), it concludes the turn was cancelled and flips to `done`. A wrong guess self-corrects: the next real hook event sets `working` again (it is past the holdoff) [SOURCE: agentStatus.ts:233-235]. The baseline is `stateAt` — the freshness clock every same-state event refreshes in place [SOURCE: agentStatus.ts:40-45, 348-356] — which is exactly why `stateAt` must never be persisted (see F-07).
**PWA adoption**: for phone-initiated stop/cancel, run the same inference: schedule one settle check comparing the freshness stamp and flip only when zero events arrived in the window.

### F-04 — awaitingInput hold: a needs-you that survives its own turn-end done
Codex `request_user_input` is NOT a blocking tool: the turn ENDS (Stop fires) with the question still unanswered, and the answer arrives as a fresh UserPromptSubmit (observed live, codex-cli 0.145.0) [SOURCE: specs/context/nodeterm-main/src/shared/agents/normalize.ts:311-316]. `normalizeCodex` emits `waiting` + `awaitingInput` on the PreToolUse only — the PostToolUse ack returns null so it cannot clear the ask [SOURCE: normalize.ts:316-328]. `reduceEntry` sets the flag [SOURCE: agent-status-mirror.ts:412-413]; when the turn-end `done` arrives with the flag set and NOT interrupted, it commits `waiting` using THIS POST's evidence (the held state's proof is the done POST's, not the ask's) and returns [SOURCE: agent-status-mirror.ts:414-418]; anything else supersedes — a new turn, other tool activity, an interrupt, a session boundary [SOURCE: agent-status-mirror.ts:409-411, 419-421, 444]. `recordAgentEvent` then REWRITES the broadcast `done` → `waiting` so canvas store, notch, and phone all agree instead of each re-deriving from the raw done [SOURCE: agent-status-mirror.ts:1222-1228]. Grok deliberately omits `awaitingInput`: whether its elicitation crosses a turn boundary is unmeasured, and a wrong hold keeps NEEDS YOU on a genuinely finished node — the worse failure (device checklist item 33) [SOURCE: normalize.ts:676-688].
**PWA adoption**: when an ask ends the turn, hold the needs-you state through the turn-end event and rewrite the event stream once at the reducer boundary so every consumer sees one truth.

### F-05 — Idle-rescue: may only move a still-working node, and remembers which kind of done it is
Claude `idle_prompt` = the CLI sitting at its prompt; it cannot be true while a turn runs, making it the ONE signal that rescues a node stuck on `working` when no turn-end hook fired (the Esc-during-a-tool-call case) [SOURCE: normalize.ts:269-281]. Mapping it to `waiting` (the obvious reading) is what stuck NEEDS YOU on finished nodes before, so it maps to `done` + `interrupted` + `idle` with a deliberate no-op default for unknown notification types [SOURCE: normalize.ts:273-282]. `reduceEntry` enforces the narrow rule: `if (ev.idle && prev?.state !== 'working') return next` — a blocked/waiting node is ALSO idle-at-prompt (clearing it would drop a live approval) and a done node needs nothing [SOURCE: agent-status-mirror.ts:401-405]. `commitState` records `idleInferred` on the SAME edge as the state so a downstream gate (agent messaging gate 2) can tell a turn that ended from a CLI that merely went quiet; a later genuine turn-end done clears the marker [SOURCE: agent-status-mirror.ts:99-113, 384-388]. Grok's equivalent is keyed off message PROSE (`GROK_IDLE_MESSAGES`), not a type, and is checked AFTER the ask branches so a payload claiming both ask and idle reads as asking [SOURCE: normalize.ts:692-704].
**PWA adoption**: rescue signals must be edge-narrow (only from `working`), and the resulting state should carry a provenance marker so downstream gates can distrust it.

### F-06 — newTurn gating: one explicit turn-start flag gates resurrection, fan-out reset, and guard clearing
`newTurn` is set ONLY by a genuine user turn: Claude UserPromptSubmit [SOURCE: normalize.ts:223-231], codex UserPromptSubmit [SOURCE: normalize.ts:306-310], gemini BeforeAgent [SOURCE: normalize.ts:358-362], copilot UserPromptSubmit [SOURCE: normalize.ts:424-426], opencode user `message.updated` [SOURCE: normalize.ts:470-474], grok `userpromptsubmit` [SOURCE: normalize.ts:592-595]. Claude's `<task-notification>` prompt (a completed async subagent delivered back) is explicitly NOT newTurn — flagging it would clear subagent fan-out at the exact moment a card completes [SOURCE: normalize.ts:223-229]. newTurn is the sole bypass of done-holdoff on both sides [SOURCE: agentStatus.ts:330-337; SOURCE: agent-status-mirror.ts:426-430], gates per-turn fan-out reset (once per turn, not per tool event) [SOURCE: normalize.ts:26-28], and carries the working-start "You: …" prompt line [SOURCE: agent-status-mirror.ts:1266-1273]. Notably, the `backgroundTaskAt` guard clear is deliberately NOT keyed on newTurn (same task-notification reason) and fires only on the done→working edge [SOURCE: agentStatus.ts:379-405].
**PWA adoption**: never infer "new turn" from activity; carry an explicit flag from the turn-start event and let notification-driven prompts ride as plain `working`.

### F-07 — Transient vs persisted: persist identity, never live state or clocks; label restored evidence
The renderer persists ONLY `unread/session/sessionId/agentId/loop/hibernated` (+ `hibernatedPane` only alongside the flag) via an allowlist `save()` [SOURCE: agentStatus.ts:289-311]; the live `state` is not persisted because "it'd be stale on relaunch" [SOURCE: agentStatus.ts:8-11]. Each transient field's docblock names the failure it prevents: `stateAt` drives the holdoff/sweeper/interrupt baseline and is refreshed by same-state events [SOURCE: agentStatus.ts:40-45]; `lastEventAt` is the idle clock — a stale stamp read as "idle since before the restart" would hibernate a session the moment the app came back; absent ⇒ unknown idle ⇒ never a hibernation candidate [SOURCE: agentStatus.ts:54-62]; `stateVerified` — a restored `true` would assert proof never presented this run [SOURCE: agentStatus.ts:47-53]; `backgroundTaskAt` — a stale stamp would exempt the node from Eco forever [SOURCE: agentStatus.ts:63-73]; `pendingId` is cleared the moment the node leaves `blocked` [SOURCE: agentStatus.ts:102-108]. The mirror takes the opposite side (it MUST persist state for the phone) and pays with evidence labels: `buildFile` is an allowlist that never writes `stateVerified` [SOURCE: agent-status-mirror.ts:486-515, 1125-1128]; `loadPersisted` forces `restored: true` + `stateVerified: false` whatever the file said [SOURCE: agent-status-mirror.ts:1125-1131]; `restored` means "this state came off disk" — 6-hour-old evidence about a pane that has since done anything — and messaging gate 2 refuses it (`targetNotIdleUnknown`); without it a restored `done` is indistinguishable from a fresh one and the most dangerous moment (just after relaunch) would read as the safest [SOURCE: agent-status-mirror.ts:88-97]; it is cleared only by `commitState`, so a held-off working or idle rescue leaves it intact [SOURCE: agent-status-mirror.ts:389-394]. `EXPIRE_MS` (6 h) is the horizon at which the module stops believing anything about a node [SOURCE: agent-status-mirror.ts:34, 1751-1753]; restore applies the same expiry so a stale `working` from a crashed session is never resurrected [SOURCE: agent-status-mirror.ts:1096-1097, 1112-1118]. The restore exists for a measured bug: three identical APNs pushes, one per restart, because memory-only dedup let a re-done re-fire the done edge [SOURCE: agent-status-mirror.ts:1080-1097]. Persisting `stateAt`/`lastEventAt` would be wrong for the same class of reason: those clocks measure freshness of events THIS run has seen; a restored value would arm the holdoff against legitimate turns, fake an idle age that instantly hibernates, or sweep nodes that are fine.
**PWA adoption**: persist durable identity (session ids, unread, loop facts) and rebuild live status from the server event stream on reconnect; when a server snapshot must be cached, cache it with an evidence label (restored/unverified) + TTL and refuse to gate anything safety-relevant on it until a live event confirms.

## Questions Answered

- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)? — answered: all seven sub-mechanisms pinned to file:line with rationale from the code's own design comments.

## Questions Remaining

- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?

## Ruled Out

- Nothing ruled out this iteration; no approach failed. One near-misreading corrected en route: the renderer sweeper and the mirror sweep are NOT one mechanism — they are two deliberate layers with different semantics (renderer blanks to Unknown for local badges; mirror commits `done` + synthetic stale end edge for phone/notch surfaces). Recorded as F-02 evidence, not a dead end.

## Edge Cases

- Ambiguous input: none — focus was fully specified by the prompt pack and the run-7 focus_override event.
- Contradictory evidence: none; the four sources are mutually consistent (the mirror docblock explicitly states it "intentionally mirrors" the renderer store, agent-status-mirror.ts:14-25).
- Missing dependencies: the mirror file exceeded the 50 KB single-read cap; handled with one planned offset continuation read (lines 1073-1815) inside budget.
- Partial success: none — all planned reads completed.

## SCOPE VIOLATIONS

- None. All writes stayed within the three allowed artifact paths; researched sources untouched.

## Sources Consulted

- specs/context/nodeterm-main/src/renderer/state/agentStatus.ts:1-653 (full)
- specs/context/nodeterm-main/src/core/agent-status-mirror.ts:1-1072, 1073-1815 (full, two passes)
- specs/context/nodeterm-main/src/shared/agents/normalize.ts:1-719 (full)
- specs/context/nodeterm-main/src/shared/agents/stale.ts:1-31 (full)
- specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-config.json
- specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-strategy.md
- specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-state.jsonl

## Assessment

- New information ratio: 1.0 (7 of 7 findings fully new; KQ3 had only been seeded as a carried-forward question since iteration 1)
- Questions addressed: KQ3
- Questions answered: KQ3

## Reflection

- What worked and why: the batched full-read of all four named files in one parallel pass (the pattern that won iterations 1-6) again gave complete, line-cited coverage — nodeterm's design comments carry the rationale (parallel-hook history, the duplicate-APNs field bug, the codex 0.145.0 live observation), so findings cite primary intent rather than inference.
- What did not work and why: nothing failed; the only friction was the 50 KB read cap splitting the mirror file, which was planned for and absorbed by one offset continuation.
- What I would do differently: nothing material. A useful observation for KQ4: this iteration already captured the full normalizer half of that question (normalize.ts in full), so its remaining budget can go to the transcript-tail half (context-tail.ts, subagent-tail.ts).

## Recommended Next Focus

KQ4 [logic] event normalization + live transcript tails: the NormalizedAgentEvent contract and all six per-agent normalizers are already captured this iteration (normalize.ts:1-719), so the next pass should target the tail machinery — `core/context-tail.ts`, `core/subagent-tail.ts`, and the shells' raw listeners — to answer the transcript-tail/subagent fan-out/context-fill half. KQ2 (E2EE relay security envelope) remains the final open question after that.
