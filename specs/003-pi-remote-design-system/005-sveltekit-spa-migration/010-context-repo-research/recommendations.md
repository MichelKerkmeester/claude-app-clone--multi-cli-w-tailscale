---
title: "Context-repo research — consolidated recommendations for operator decision"
description: "Every adoptable recommendation surfaced by the five-repo context research sweep, written as rules with their mechanics, the concrete failure each one prevents, evidence at file:line, effort, blast radius, and a proposed home. NOTHING here is scaffolded: this document exists so the operator can approve or decline each item individually, per the standing research-approval rule in the program goal."
trigger_phrases:
  - "research recommendations"
  - "context repo findings decision"
  - "adopt research patterns"
importance_tier: "important"
contextType: "research"
---

# Consolidated research recommendations

**Status: AWAITING OPERATOR DECISION. Nothing below has been scaffolded.**

Per the program goal's standing rule — *"findings may create new phases or update existing phases, but
every research-surfaced recommendation is presented to the operator first; nothing is scaffolded
without explicit approval"* — this document is the presentation step. Approve, decline, or defer each
item by ID.

Each item is written as a rule: what to do, the mechanics that make it real, and the failure it
prevents. Every claim carries a `specs/context/<repo>/<file>:<line>` citation. No target repo was
modified.

---

## 1. WHAT WAS MINED

| Repo | What it is | Iterations | Stop |
|---|---|---|---|
| `OGAM-main` | React Native offline-AI chat app | 10 | iteration cap (still productive) |
| `mobilecli-main` | Rust daemon: phone remote for AI coding CLIs — closest product analog | 10 | iteration cap |
| `nodeterm-main` | Desktop/server/mobile trio for remote agent control | 9 | iteration cap |
| `openclaude-android-main` | Agent CLI + phone remote-control layer | 5 | converged (0.03) |
| `remote-for-opencode-master` | iOS client for OpenCode with a documented v1 protocol | 5 | converged (0.04) |

**Convergence is the most valuable property of this sweep.** Where four independent codebases solved
the same problem the same way, that beats any single repo's opinion. Items are ordered by how
strongly the evidence converges, not by how appealing they are.

---

## 2. RECOMMENDATIONS

Effort is rough implementation size. Blast radius names what breaks if it goes wrong.

### Tier A — Converged across 4–5 repos. Strongest evidence.

**R-01 · Reconnect replaces the transcript. It never silently continues it.**

Capture a snapshot boundary atomically with the snapshot itself. Queue every frame produced after
that boundary, server-side, for that attach. Flush the queue in sequence order. Only then send
ready, carrying the final live sequence. On the client: clear, apply the snapshot, set the expected
sequence to `boundary + 1`, apply queued frames only while they stay contiguous, drop anything at or
below the highest contiguous frame already applied for the active attach, and verify the ready
sequence equals that high-water mark before leaving replay. Persist it. On any gap, force an
explicit resync against a fresh authoritative snapshot — never continue.

MobileCLI's own server proves the loss window rather than hypothesising it. Live output increments
the sequence and broadcasts, but the per-socket forwarder drops broadcast items while no attach is
registered, and registration happens only *after* readiness; channel lag is ignored outright. Bytes
in that window exist in neither the snapshot nor the live stream, and the ready sequence — read after
replay — would mask them if a client used it as a discard barrier.

No source repo has a test that proves gap-free handoff. Write the one that injects output between
capture and readiness; it is the only thing that would catch a regression here.

*Evidence:* mobilecli `daemon.rs:1396-1437`, `1195-1248`, `2694-2743`, `2371-2424`, `protocol.rs:318-355`;
remote-for-opencode `TurnController.swift:118-188`; openclaude-android `flushGate.ts:28-70` (gate live
writes until initial history has flushed, then drain in order); ogam A8–A9.
*Prevents:* a transcript silently missing output after every reconnect — the worst class of bug,
because it looks fine.
*Effort:* L (protocol + relay + client). *Blast radius:* the relay wire contract. *Home:* new phase.

**R-02 · Answer every control request, including the ones you don't understand.**

An unsupported subtype returns an explicit typed error. It is never ignored. OpenClaude's server
kills the socket when a control request goes unanswered, so silence is a disconnect with extra steps.
Carry authority into the session manager too, not only the UI: a mutable request on a viewer-only
session returns an explicit unsupported error while initialization still succeeds. Nodeterm reaches
the same place from the other side — its stub API makes the compiler enforce coverage, subscriptions
return no-op unsubscribers, boot-awaited members resolve benign values, and everything else rejects
with a coded refusal.

*Evidence:* openclaude-android `bridgeMessaging.ts:234-242`, `212-232`, `RemoteSessionManager.ts:50-62`,
`187-213`; nodeterm `stubs.ts`.
*Prevents:* the phone silently dropping its session every time the host gains a capability the phone
has never heard of.
*Effort:* S. *Blast radius:* control-channel handling. *Home:* new phase, alongside R-01.

**R-03 · Classify close codes by recovery semantics, and fail every pending call before the overlay.**

Three classes, three behaviours: permanent (unauthorized) stops and re-authenticates; transient
(session-not-found during compaction) gets a small fixed retry budget; an ordinary drop gets bounded
backoff. The transport owns a 30-second ping loop and clears it on close. The server pings on the
same interval and terminates after one miss — that reaps ghosts in 30–60 seconds and keeps the
connection alive through proxies that idle out around 60.

Ordering matters on close: clear the pending map *first*, then reject, so no reject handler can
observe a stale id, and only then raise the reconnect overlay. Every waiter rejects with one coded
disconnect error. Cap frame size explicitly — nodeterm sets 8 MiB against a library default of 100 —
and check Origin on upgrade.

*Evidence:* openclaude-android `SessionsWebSocket.ts:17-36`, `234-287`, `301-323`; nodeterm
`ws-bridge.ts:88-114`, `server/ws.ts:24-33`, `35-106`, `126-146`.
*Prevents:* reconnecting forever against a permanent rejection, giving up on a recoverable one, and
promises that never settle so cleanup never runs.
*Effort:* S–M. *Blast radius:* connection layer. *Home:* new phase, alongside R-01.

**R-04 · One service owns the state machine. Stores are read-only projections.**

OGAM writes this down as doctrine and then shows the exact race it prevents: a shared abort flag,
reset by a concurrent turn, repaints a stopped turn as a fresh empty response. Model interruption
per turn, never as one shared flag. Give stop a fixed order — mark abort, flush, finalize partials,
reset, stop engines — because any other order loses the partial or resurrects the turn.
Remote-for-opencode arrives at the same architecture from the other direction: framing, permissions,
parsing and diff modelling live in pure policy modules, with I/O confined to adapters, so the policy
is testable without a transport.

*Evidence:* ogam `rules.md:166-175`, `generationToolLoop.ts:1235-1244`; remote-for-opencode
`docs/development.md:30-38`.
*Prevents:* two owners of one truth — the defect class this migration has already hit seven times as
`$effect` self-invalidation.
*Effort:* M–L (refactor). *Blast radius:* chat state. *Home:* updates 007-EXT's architecture
dimension, or takes its own phase.

### Tier B — Converged across 2–3 repos.

**R-05 · Compute approval risk in pure code, and make "always" state its scope.**

Reads and in-project edits can be quiet. Destruction, privilege escalation, network access and paths
outside the project are high risk. An unknown action never quietly becomes low risk. Show the exact
command and its scope. Separate Reject from Allow spatially, so a mis-tap is not a grant. Make
"always" name what it applies to and confirm in a second step, and withhold blanket grants entirely
for high-risk asks. Authenticate grants only, never declines — a decline should never be gated behind
a credential the user cannot produce.

Underneath: store pending requests by request id and answer either allow-with-updated-input or
deny-with-a-message. Model always-allow as a structured, destination-scoped update covering rules,
modes and directories — not a boolean.

*Evidence:* remote-for-opencode `PermissionRisk.swift:3-12`, `26-42`, `PermissionSheet.swift:70-97`,
`115-147`, `TurnController.swift:193-205`; openclaude-android `controlSchemas.ts:106-121`,
`permissions.ts:81-130`, `RemoteSessionManager.ts:187-198`, `244-281`; nodeterm answer-file tickets
(`pending-approvals.ts:16-28`, `36-60`).
*Prevents:* a phone tap granting far more authority than the user believed it did.
*Effort:* M. *Blast radius:* the approval path — security-sensitive. *Home:* new phase.

**R-06 · Say what the agent is doing, derived from the newest meaningful part.**

A closed tool-to-verb mapping — reading files, editing files, running a command, searching the
project — with copy that escalates over time. Not a static spinner. Nodeterm caps the activity string
at 80 characters and drives its mobile live cards from it with no transcript streaming to the phone
at all, which is exactly the content-free posture this app already requires.

Two mechanics come with it. Upstream snapshots are not token streams, so accumulate deltas per part
id, throttle forwarding to roughly ten updates a second, and flush the final text on idle. And use a
heartbeat-like liveness cue so "working" is distinguishable from "stalled".

*Evidence:* remote-for-opencode `WorkingIndicator.swift:72-107`, `protocol-v1.md:167-193`; nodeterm
`mobile-usage-inbox.md:91-96`, `agent-status-mirror.ts:537-587`.
*Prevents:* the phone looking hung through a long silent tool run.
*Effort:* S–M. *Blast radius:* transcript UI only. *Home:* 011-ux-affordances.

**R-07 · A notification is a wake-up hint. It is never state.**

Carry an opaque record or deep-link id and nothing else. Refetch pending approvals over the
authenticated channel, and poll on wake. If an in-place answer cannot be confirmed, open the app and
say plainly that nothing was decided. The payload carries title, body, session ids, type and priority
derived from normalized wait state — never terminal content.

Ask for permission after pairing or another clear value moment, not on first load. Keep registration
installation-scoped: validate token shape, replace the prior token for that credential and
installation, cap the number per credential, and prune revoked ones before sending. Deliver off the
stream loop so notification I/O never blocks streaming. And re-read before you send: a quick approve
confirms the ask is still unresolved, or reports "already handled".

*Evidence:* remote-for-opencode `PushManager.swift:48-60`, `72-106`, `protocol-v1.md:124-137`;
mobilecli `daemon.rs:1459-1498`, `3350-3412`, `4578-4622`, `5279-5311`; nodeterm
`mobile-usage-inbox.md:135-140`, `push-notify.ts` (2s batch window, 5s per-node throttle,
presence-aware hold queue).
*Prevents:* acting on a stale or spoofed payload, and leaking transcript content into the OS
notification layer — which the security posture already forbids.
*Effort:* M. *Blast radius:* push path. *Home:* new phase.

**R-08 · Treat attachment metadata as hostile.**

Validate the shape. Sanitize to a basename. Prefix stored names with a UUID so two uploads cannot
collide. Quote every injected path so a home directory with a space survives. Make each attachment
best-effort, so one bad file still delivers the message. Normalize mobile payload variants —
image-metadata casing especially — before anything reaches the model.

On the way out: downscale and re-encode images, keep non-image attachments intact, use a smaller
transit copy on constrained paths, and enforce size caps on *both* client and server. Underneath it
all, a real jail: absolute paths only, no parent traversal, canonical jail and denied globs checked
after canonicalization, symlinks rejected by default, explicit byte and listing caps.

*Evidence:* openclaude-android `inboundAttachments.ts:31-57`, `98-133`, `inboundMessages.ts:42-80`;
remote-for-opencode `ImageShaping.swift:6-27`, `55-85`, `RemoteServer.swift:525-528`; mobilecli
`filesystem/security.rs:32-189`.
*Prevents:* a filename from the composer escaping its directory or overwriting another upload.
*Effort:* M. *Blast radius:* attachment pipeline — security-sensitive. *Home:* new phase.

**R-09 · Keep disclosure state outside the row, keyed by stable id.**

Reasoning and tool activity are first-class collapsible rows, and their expansion lives in a map
keyed by turn or tool-call id, held outside the row component. The reason is mechanical: the
streaming row's key changes at finalization, so in-component state is destroyed at exactly the moment
the user is reading it.

Render reasoning in three states — live and capped with auto-scroll, collapsed once settled, and
preserved when the user deliberately expanded it. Parse think-tags chunk-safely; a tag can and does
split across chunk boundaries.

*Evidence:* ogam `accordionStore.ts:4-53`, `ToolMessages.tsx:179-229`; remote-for-opencode
`ReasoningBlock.swift:6-17`, `48-125`.
*Prevents:* an expanded reasoning block snapping shut the instant the turn completes.
*Effort:* S–M. *Blast radius:* transcript UI. *Home:* 011-ux-affordances.

### Tier C — Single-repo, high value.

**R-10 · Budget the context explicitly, and treat the transcript as data.**

Keep a ledger, not a vibe. OGAM reserves 55% for the prompt and 12% for the summary; recent messages
fill the remainder; generation and overhead sit outside the allocation entirely. Compaction is
deterministic and durable: walk backward to retain recent messages, truncate an oversized last
message, summarize what remains under a hard cap, persist both the summary and the cutoff, and
reapply that cutoff on every context build. If summarization fails, fall back to trim-only rather
than failing the turn.

The summarizer's system prompt states that transcript instructions are data, not commands. Role
prefixes are escaped. Input and output are capped. On a context-full error: stop engines, compact,
retry once — and refuse that retry if the generation's owner aborted while summarization was running.

*Evidence:* ogam `contextCompaction.ts:9-36`, `38-40`, `78-168`, `174-215`,
`useChatGenerationActions.ts:505-544`.
*Prevents:* prompt injection through transcript content, and unbounded context growth in long
sessions.
*Effort:* L (needs host-side work). *Blast radius:* prompt construction. *Home:* new phase.

**R-11 · Define the phone's contract yourself. Keep upstream skew in an adapter.**

A small typed vocabulary — hello, capabilities, prompt, resume, permission, question, diff,
transcript, pending — owned by you. Upstream HTTP and SSE event names live in a server-side adapter:
detect name skew once from the schema, cache it, and subscribe to both variants during compatibility
windows. Negotiate capabilities on connect and render only the controls those capabilities support.

Never send command templates to the browser. Send a name and arguments; let the adapter expand them.
Otherwise upstream template syntax and multi-kilobyte prompt bodies become client coupling. Keep live
and durable diff state distinct — live answers "what is changing now", durable supports review after
the session settles. And normalize roles before parts reach the UI: upstream sends user and agent
parts over one stream, so build a message-id-to-role map first or the user's own prompt renders twice.

*Evidence:* remote-for-opencode `protocol-v1.md:7-10`, `24-49`, `26-30`, `66-83`, `140-150`,
`152-165`, `215-224`.
*Prevents:* every upstream rename becoming a phone release.
*Effort:* L. *Blast radius:* the wire contract. *Home:* new phase; pairs naturally with R-01.

**R-12 · Harness the production components. Never lookalikes.**

Feed canned transcript, permission, patch and planning states into the real components, so what the
harness exercises is what ships.

Largely already true here: Storybook renders the real Svelte components against real `demo.ts`
fixtures across 74 story files. The extension is permission and planning states. Worth pairing with
the known blind spot — the CDP smoke gate treats an empty frame as a pass by design, and 009's
render test, which composes the real decorator pipeline and asserts roles, is what actually closes it.

*Evidence:* remote-for-opencode `docs/development.md:52-65`, `HarnessApp.swift:48-124`; locally,
006 `checklist.md` CHK-TEST-05 and 009 ADR-002.
*Effort:* S. *Home:* 009, as a follow-up.

**R-13 · Put `prompt_hash` and `approval_model` on the wire from the start.**

MobileCLI dedupes waits on the pair (prompt hash, wait type) — the hash taken over a 300-character
prompt suffix — and picks approval controls from a per-CLI approval model of numbered, yes/no, arrow
or none. Neither field is on its own wire event, so a reconnecting client can reproduce neither the
dedupe nor the controls. If this app adopts the wait-state model, put both on the wire on day one.

The rest of the state machine transfers as-is. Clear a wait only on at least ten non-whitespace
characters of non-prompt output, or immediately on user input. The server owns the CLI-specific
keystroke mapping; the phone renders normalized intent — yes, yes-always, no — and shows no approve
control at all when the model is none. On connect the server replays every currently-waiting session,
so reconcile from that snapshot rather than from local memory.

*Evidence:* mobilecli `detection.rs:23-43`, `54-70`, `208-243`, `347-384`, `protocol.rs:374-386`,
`daemon.rs:1457-1519`, `3414-3450`, `4682-4703`.
*Prevents:* duplicate notifications after reconnect, and an approve button on a CLI that has no
approve affordance.
*Effort:* S, if done alongside R-05. *Blast radius:* wire contract. *Home:* new phase with R-05.

---

## 3. ALREADY SATISFIED — no action proposed

Recorded so the sweep's conclusions are complete, and so these do not get re-proposed later.

- **Near-bottom-gated autoscroll with a jump-to-bottom affordance.** OGAM E1 recommends a 100px
  threshold; `TranscriptList.svelte` ships 96px with an unread badge. Independent arrival at the same
  design is corroboration, not a gap. Its glass restyle is 011/R1.
- **Send/stop/voice as one exclusive precedence state.** ogam E2 — the composer already derives a
  single action state rather than three independent buttons.
- **A token vocabulary that separates theme-dependent from invariant values.** ogam F1–F3 describes
  the `--pi-*` cascade this app already has. This app is stricter: a machine gate enforces it, where
  OGAM records its own enforcement as checklist-only and notes the docs have drifted from the runtime
  (F4–F5).
- **Loopback-only exposure until a credential exists.** mobilecli `daemon.rs:537-575` — already the
  security posture here.

Two OGAM ergonomics findings are **flagged, not proposed**, because they were not verified against
this composer: deferring overlay measurement roughly 300ms after the keyboard hides (E3), and failure
copy that separates repairable failures from impossible ones (E4). Verify before deciding.

---

## 4. EXPLICITLY RULED OUT BY THE RESEARCH

Do not adopt these. Each was tried and rejected in a source repo, with the reason.

- **Delta replay from a remembered cursor.** No source repo implements it honestly; it needs a bounded
  event log none of them has. Full snapshot plus boundary plus queue is the alternative (R-01).
- **A post-replay ready sequence used as a client discard barrier.** It is read after replay, so it
  masks bytes produced during replay (mobilecli iteration 2).
- **Minting durable message identity at finalization.** Breaks preview-to-record matching and risks
  duplicates. Mint at stream start (ogam §7.1).
- **Content-based preview matching as primary identity.** Keep it as a same-origin guard only;
  stable-id matching is authoritative (ogam A8).
- **Optimistic answer replacement — clear the bubble and start again.** Superseded by
  tombstone-before-discard ordering, which defeats late writes (ogam A9).
- **Retrying a failed request under the same turn identity once output has streamed.** Duplicates
  visible output. Retry only before first output, and classify by whether the consumer saw output —
  not by HTTP status (ogam B4).
- **Restoring in-flight streams from persistence after a crash.** Forming fields are excluded from
  persistence by design. Recover from finalized records; never resurrect a live bubble (ogam A6).
- **Client-side re-classification of wait state from the raw transcript.** Adopt the server's
  normalized event as the single source, or client and server will disagree (mobilecli iteration 10).
- **Treating HTTP 200 on the prompt endpoint as "running".** Acknowledgement is not health; the
  asynchronous turn can still fail. Wait for lifecycle events
  (remote-for-opencode `protocol-v1.md:16-20`).
- **Assuming theme tests mechanically enforce no-hardcoding.** OGAM's cover elevation structure and
  blur only (ogam iteration 3).
- **Treating a copy operation as safe.** In mobilecli it bypasses the destructive opt-in gate
  (`daemon.rs:3899-3930`). Treat copy-overwrite as destructive until a server contract says otherwise.
- **Copying nodeterm's reconnect delay table.** It is dead code with no call site; reconnection there
  is caller-owned via a fresh token mint (`relay-socket.ts:501-535`).

---

## 5. DECISION

Recommended grouping, if you want phases rather than item-by-item:

| Proposed phase | Bundles | Rationale |
|---|---|---|
| **Transport correctness** | R-01, R-02, R-03, R-11 | One coherent wire-contract change; splitting them means touching the protocol repeatedly. |
| **Authority & safety** | R-05, R-07, R-08, R-13 | All security-sensitive, all want the same review discipline. |
| **Chat UX** | R-06, R-09 | Small, self-contained, no protocol change — fits 011 as it stands. |
| **Deferred** | R-04, R-10, R-12 | R-04 is a refactor better sequenced after 007-EXT; R-10 needs host-side work; R-12 is a small 009 follow-up. |

**No phase folder, plan edit, or task will be created until you say which of these to take.**
