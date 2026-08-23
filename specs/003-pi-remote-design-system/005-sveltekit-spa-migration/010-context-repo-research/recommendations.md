---
title: "Context-repo research — consolidated recommendations for operator decision"
description: "Every adoptable recommendation surfaced by the five-repo context research sweep, consolidated by theme with evidence, the concrete failure each one prevents, effort, blast radius, and a proposed home. NOTHING here is scaffolded: this document exists so the operator can approve or decline each item individually, per the standing research-approval rule in the program goal."
trigger_phrases:
  - "research recommendations"
  - "context repo findings decision"
  - "adopt research patterns"
importance_tier: "important"
contextType: "research"
---

# Consolidated research recommendations

**Status: AWAITING OPERATOR DECISION. Nothing below has been scaffolded.**

Per the program goal's standing rule — *"findings may create new phases or update existing phases,
but every research-surfaced recommendation is presented to the operator first; nothing is scaffolded
without explicit approval"* — this document is the presentation step. Approve, decline, or defer each
item by ID.

---

## 1. WHAT WAS MINED

| Repo | What it is | Iterations | Stop |
|---|---|---|---|
| `OGAM-main` | React Native offline-AI chat app | 10 | iteration cap (still productive) |
| `mobilecli-main` | Rust daemon: phone remote for AI coding CLIs — closest product analog | 10 | iteration cap |
| `nodeterm-main` | Desktop/server/mobile trio for remote agent control | 9 | iteration cap |
| `openclaude-android-main` | Agent CLI + phone remote-control layer | 5 | converged (0.03) |
| `remote-for-opencode-master` | iOS client for OpenCode with a documented v1 protocol | 5 | converged (0.04) |

Every finding is cited to `specs/context/<repo>/<file>:<line>`. No target repo was modified.

**The most valuable property of this sweep is convergence.** Where four independent codebases solved
the same problem the same way, that is a much stronger signal than any single repo's opinion. The
recommendations below are ordered by how strongly the evidence converges.

---

## 2. RECOMMENDATIONS

Effort is rough implementation size. Blast radius names what breaks if it goes wrong.

### Tier A — Converged across 4–5 repos. Strongest evidence.

**R-01 · Make reconnect a deterministic replace, never a silent continuation**
Every repo that streams to a phone hit the same bug class: a client that resumes from a remembered
cursor can silently miss bytes produced *during* the handoff. MobileCLI's own server has a proven
loss window — `last_seen_seq` is only a label, and `AttachReady.last_live_seq` is read *after*
replay, so it masks anything produced mid-replay. The fix all five converge on: capture a snapshot
boundary atomically, queue post-snapshot frames server-side, apply only contiguous sequences, and on
any gap force an explicit resync rather than continuing.
*Evidence:* mobilecli A1–A5 (`daemon.rs:1396-1437`, `2371-2424`); remote-for-opencode
(`TurnController.swift:118-188`); openclaude-android (`SessionsWebSocket.ts:234-287`); ogam A8–A9.
*Prevents:* a transcript that is silently missing output after every reconnect — the worst kind of
bug, because it looks fine.
*Effort:* L (protocol + relay + client). *Blast radius:* the relay wire contract. *Home:* new phase.

**R-02 · Answer every control request, including ones you don't understand**
OpenClaude's server kills the socket after ~10–14s if a control request goes unanswered, so an
unknown subtype must still return an explicit error rather than being ignored. Nodeterm reaches the
same conclusion from the other side with `E_UNSUPPORTED` typed refusals.
*Evidence:* openclaude-android (`bridgeMessaging.ts:234-242`); nodeterm KQ1 (`stubs.ts`).
*Prevents:* the phone silently dropping its session whenever the host gains a new capability.
*Effort:* S. *Blast radius:* control-channel handling. *Home:* new phase, alongside R-01.

**R-03 · Classify close codes by recovery semantics**
Permanent (unauthorized) versus transient (session-not-found during compaction, small retry budget)
versus ordinary drop (bounded backoff). Plus a transport-owned ping loop cleared on close.
*Evidence:* openclaude-android (`SessionsWebSocket.ts:17-36`, `301-323`); nodeterm KQ7 heartbeat/reap
(`server/ws.ts:24-33`).
*Prevents:* infinite reconnect against a permanent rejection, and giving up on a recoverable one.
*Effort:* S–M. *Blast radius:* connection layer. *Home:* new phase, alongside R-01.

**R-04 · One service owns the state machine; stores are read-only projections**
OGAM writes this down as doctrine and demonstrates the concrete race it prevents: a shared abort flag
reset by a concurrent turn repaints a stopped turn as a fresh empty response. Remote-for-opencode
reaches the same place via pure policy modules with I/O pushed to adapters.
*Evidence:* ogam C1–C4 (`rules.md:166-175`, `generationToolLoop.ts:1235-1244`); remote-for-opencode
(`docs/development.md:30-38`).
*Prevents:* two owners of the same truth — the defect class this migration already hit seven times
as `$effect` self-invalidation.
*Effort:* M–L (refactor). *Blast radius:* chat state. *Home:* would update 007-EXT's architecture
dimension, or its own phase.

### Tier B — Converged across 2–3 repos.

**R-05 · Approval risk is computed in pure code, and "always allow" carries its scope**
Low-risk reads can be quiet; destruction, privilege escalation, network access and out-of-project
paths are high risk; unknown actions must never silently become low risk. "Always" must state what it
applies to and confirm in a second step, and blanket grants should be withheld for high-risk asks.
*Evidence:* remote-for-opencode (`PermissionRisk.swift:3-12`, `PermissionSheet.swift:115-147`);
openclaude-android (`controlSchemas.ts:106-121`); nodeterm KQ5 answer-file tickets.
*Prevents:* a phone tap granting far more authority than the user believed.
*Effort:* M. *Blast radius:* the approval path — security-sensitive. *Home:* new phase.

**R-06 · Tell the user what the agent is doing, from the newest meaningful part**
Derive an activity label ("Reading files", "Running a command") rather than showing a static spinner,
and escalate the copy over time. Nodeterm feeds mobile live cards this way with zero transcript
streaming to the phone.
*Evidence:* remote-for-opencode (`WorkingIndicator.swift:72-107`); nodeterm KQ4
(`mobile-usage-inbox.md:91-96`).
*Prevents:* the phone looking hung during a long silent tool run.
*Effort:* S–M. *Blast radius:* transcript UI only. *Home:* 011-ux-affordances.

**R-07 · Notifications are wake-up hints, never trusted state**
Carry only an opaque ID, refetch over the authenticated channel, fall back to polling on wake, and if
an in-place answer cannot be confirmed, open the app and say nothing was decided. Push payloads carry
no terminal content. Ask for notification permission after pairing, not on first load.
*Evidence:* remote-for-opencode (`PushManager.swift:72-106`, `protocol-v1.md:124-137`); mobilecli F1–F3
(`daemon.rs:5279-5311`); nodeterm KQ8.
*Prevents:* acting on a stale or spoofed notification payload — and leaking transcript content into
the OS notification layer, which the security posture already forbids.
*Effort:* M. *Blast radius:* push path. *Home:* new phase.

**R-08 · Treat attachment metadata as hostile**
Validate shape, sanitize to a basename, prefix with a UUID to avoid collisions, quote injected paths
so home directories with spaces survive, and make each attachment best-effort so one failure still
delivers the message. Shape and downscale images before upload, and enforce size caps on both ends.
*Evidence:* openclaude-android (`inboundAttachments.ts:31-57`, `98-133`); remote-for-opencode
(`ImageShaping.swift:6-27`); mobilecli E2 path jail (`filesystem/security.rs:32-189`).
*Prevents:* a filename from the composer escaping its directory or colliding with another upload.
*Effort:* M. *Blast radius:* attachment pipeline — security-sensitive. *Home:* new phase.

**R-09 · Keep disclosure state outside the row, keyed by stable ID**
Reasoning and tool activity are first-class collapsible rows whose expansion lives in a separate map
keyed by turn or tool-call ID — because the streaming row's key changes at finalization, so
in-component state is lost exactly when the user is reading it.
*Evidence:* ogam D2–D3 (`accordionStore.ts:4-53`, `ToolMessages.tsx:179-229`); remote-for-opencode
(`ReasoningBlock.swift:48-125`).
*Prevents:* an expanded reasoning block snapping shut the moment the turn completes.
*Effort:* S–M. *Blast radius:* transcript UI. *Home:* 011-ux-affordances.

### Tier C — Single-repo, high value.

**R-10 · Budgeted, injection-aware context compaction**
An explicit ledger (OGAM reserves 55% prompt / 12% summary), summarize-older-keep-recent with a
persisted cutoff, a summarizer prompt that declares transcript content to be data rather than
commands with role prefixes escaped, and trim-only fallback when summarization fails.
*Evidence:* ogam G1–G4 (`contextCompaction.ts:9-36`, `38-40`, `174-215`).
*Prevents:* prompt injection via transcript content, and unbounded context growth in long sessions.
*Effort:* L (needs host-side work). *Blast radius:* prompt construction. *Home:* new phase.

**R-11 · A capability-negotiated, adapter-isolated protocol**
Define the phone's contract as a small typed vocabulary and keep upstream event-name skew inside a
server-side adapter. Render only controls the negotiated capabilities support. Never send command
templates to the browser — send a name and arguments and let the adapter expand them.
*Evidence:* remote-for-opencode (`protocol-v1.md:7-10`, `26-30`, `66-83`).
*Prevents:* every upstream rename becoming a phone release, and multi-kilobyte prompt bodies becoming
client coupling.
*Effort:* L. *Blast radius:* the wire contract. *Home:* new phase; pairs naturally with R-01.

**R-12 · Build the visual harness around production components**
Feed canned transcript, permission and planning states into the real components rather than lookalike
mock screens, so what is exercised is what ships.
*Evidence:* remote-for-opencode (`docs/development.md:52-65`, `HarnessApp.swift:48-124`).
*Prevents:* a catalog that stays green while the shipped screen breaks.
*Effort:* S — **this is largely already true.** Storybook renders the real components with real demo
fixtures, and coverage is 74/74. This would be a small extension for permission and planning states.
*Home:* 009, as a follow-up.

**R-13 · Add `prompt_hash` and `approval_model` to the wait event**
MobileCLI dedupes waits on `(prompt_hash, wait_type)` and picks approval controls from a per-CLI
approval model — but neither field is on its own wire event, so a reconnecting client cannot
reproduce either. If Pi Remote adopts the wait-state model, put them on the wire from the start.
*Evidence:* mobilecli B4–B5 (`detection.rs:347-384`, `protocol.rs:374-386`).
*Prevents:* duplicate notifications after reconnect, and showing an approve control for a CLI that has
no approval affordance.
*Effort:* S, if done alongside R-05. *Blast radius:* wire contract. *Home:* new phase with R-05.

---

## 3. ALREADY SATISFIED — no action proposed

Recorded so the sweep's conclusions are complete, and so these are not re-proposed later.

- **Near-bottom-gated autoscroll with a jump-to-bottom affordance.** OGAM E1 recommends exactly the
  control this app already ships (`TranscriptList.svelte`, 96px threshold, unread badge). The
  independent arrival at the same design is corroboration, not a gap. Its glass restyle is 011/R1.
- **Send/stop precedence as an exclusive state machine.** ogam E2 — the composer already does this.
- **Token vocabulary with theme-dependent and invariant tokens separated.** ogam F1–F3 — this is the
  existing `--pi-*` cascade, and the app is stricter (a machine gate enforces it, where OGAM notes its
  own compliance is checklist-only and has drifted).
- **Loopback-only exposure until a credential exists.** mobilecli D2 — already the security posture.

---

## 4. EXPLICITLY RULED OUT BY THE RESEARCH

Do not adopt these; each was tried and rejected in the source repos, with the reason.

- **Delta replay from a remembered cursor.** No source repo implements it honestly; it needs a bounded
  event log that none of them has. Full snapshot plus boundary plus queue is the alternative (R-01).
- **Minting durable message identity at finalization.** Breaks preview-to-record matching and risks
  duplicates; mint at stream start (ogam §8.1).
- **Retrying a failed request under the same turn identity after output has streamed.** Duplicates
  visible output; retry only before first output (ogam B4).
- **Restoring in-flight streams from persistence after a crash.** Recover finalized records only;
  never resurrect a live bubble (ogam A6).
- **Client-side re-classification of wait state from the raw transcript.** Adopt the server's
  normalized event as the single source (mobilecli, iteration 10).
- **Treating an HTTP 200 on the prompt endpoint as "running".** Acknowledgement is not health; wait for
  lifecycle events (remote-for-opencode `protocol-v1.md:16-20`).

---

## 5. DECISION

Recommended grouping if you want phases rather than item-by-item:

| Proposed phase | Bundles | Rationale |
|---|---|---|
| **Transport correctness** | R-01, R-02, R-03, R-11 | One coherent wire-contract change; splitting them means touching the protocol repeatedly. |
| **Authority & safety** | R-05, R-07, R-08, R-13 | All security-sensitive, all want the same review discipline. |
| **Chat UX** | R-06, R-09 | Small, self-contained, no protocol change — fits 011 as-is. |
| **Deferred** | R-04, R-10, R-12 | R-04 is a refactor better sequenced after 007-EXT; R-10 needs host-side work; R-12 is a small 009 follow-up. |

**No phase folder, plan edit, or task will be created until you say which of these to take.**
