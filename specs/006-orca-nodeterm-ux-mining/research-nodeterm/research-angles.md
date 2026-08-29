# nodeterm UX mining — research angles

## Objective
Copy as much as possible of nodeterm's best UI/UX and chat-feature logic (where relevant) into our SvelteKit **mobile** client, prioritising (1) user chat UX and (2) home-screen session-selection UX.

## Target
`specs/context/nodeterm-main` — nodeterm (`node-terminal`, eneskirca, BUSL-1.1, Electron/macOS+Linux). "A node-based terminal manager — terminals and agents on an infinite canvas; **every project doubles as a Trello-style board of live Claude Code sessions**." Stack: Electron + xterm + monaco + zustand + ws + node-pty + smart-whisper (STT) + tweetnacl + qrcode.

Investigate especially: `src/renderer/session/`, `src/shared/agents/` + `src/core/agents/` (the Claude-Code session board), `src/core/presence/` (live status), `src/core/speech/` (dictation), `src/core/handoff/` + `src/main/remote-ssh/` + `src/renderer/remote/` (resume / handoff / remote), `src/renderer/state/` (zustand stores), and any filter/sort/group/display logic deliberately lifted into `src/shared/` for reuse.

## THE CONSTRAINT (frames every idea)
Our client is **host-authoritative and fail-closed** — it owns no editable session metadata. Each ported idea must be either:
- **(a)** a client-side view affordance over existing DTO fields (`status`, `messageCount`, `updatedAt`, `epoch`), or
- **(b)** a pure interaction / layout pattern, or
- **(c)** an explicit new host-provided read-only field/RPC to request.

Reject anything that needs the client to own mutable session truth. nodeterm is a **desktop** app that owns local PTYs and spawns worktrees/sessions; its spatial canvas (draggable nodes, pan/zoom), local process ownership, and session-creation flows are largely **❌ not portable** to our host-authoritative mobile surface — but its **session-board display logic, presence/status derivation, card content model, dictation, and handoff/resume patterns** are the prize.

## Our current state (avoid re-proposing what we already have)
Host-authoritative SvelteKit mobile client. Home shows thin session cards over `{id, status, messageCount, updatedAt, epoch}` (opaque id; no host title/preview/agent today). We ALREADY have (from the orca pass, now planned in phases 001–007): recency-sort, pull-to-refresh, time buckets, status filter, virtualized transcript with live-edge follow + jump-to-latest + unread, "Working…"/stall detect, an ask-question ticketed card, provider-grouped model/effort sheet, per-answer copy, rich a11y live regions. Target nodeterm's **documented gaps** and anything it does better; do not re-promote orca-covered wins unless nodeterm materially improves them.

## Angles (ranked; weight to 1–4)
1. **Session board / parallel-session surfacing (HEADLINE).** nodeterm's Trello-style board of live Claude Code sessions — columns/lanes, grouping, ordering, live-status glyphs, board-vs-list. Map its board *logic* onto our home session list over existing DTO fields; note board layouts that need new host fields.
2. **Live presence & status derivation.** `src/core/presence/` + agent-state: how nodeterm decides running / idle / needs-you / stale, and reconciles it live. Map onto our `status`/`updatedAt`/`epoch`; flag any derived state that needs a host signal.
3. **Session-card content model.** What nodeterm renders per session (title, task/summary, last activity, agent/model identity, progress). Our DTO fields vs. new host fields (`title`, `lastMessagePreview`, `agent`, `attention`) — reconcile with the orca `007-host-requests` set (dedupe, don't re-request).
4. **Chat / message interactions.** Terminal/agent output rendering, copy-code (marked + dompurify + monaco), selection, per-message nav, tool/command output folding → our transcript interactions.
5. **Composer / input.** `src/core/speech/` (smart-whisper dictation), command input, history, attachments → our composer; dictation is a direct hit (both apps have it) — extract the fail-closed setup/permission + streaming-partial UX.
6. **Session lifecycle: resume / handoff / navigation.** `src/core/handoff/`, `remote-ssh/`, session→terminal transition, QR/remote pairing → our session→chat navigation, resume marker, and fail-closed re-validation.

## Per-finding output
nodeterm file/pattern · the concrete UX or logic to copy · how it maps onto our constraint (a / b / c) · portability verdict (✅ drop-in view affordance / ⚠️ needs a new host field / ❌ not portable). Dedupe against the orca findings and the `007-host-requests` host set; call out where nodeterm reinforces or supersedes an orca rec.

## Loop
10 iterations, no early convergence. One lineage: Luna 5.6 at highest thinking (`gpt-5.6-luna-max`) via cli-cursor. Synthesize `research.md` + a resource map at the end.
