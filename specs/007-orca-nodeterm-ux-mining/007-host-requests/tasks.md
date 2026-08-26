---
title: "Phase 7 tasks — host-request contract ledger"
description: "Inventory the ⚠️ recs, then author each requested field/RPC as a four-facet contract (shape · consuming-phase UI · fail-closed fallback · wire-compat), then prove every row traces to a rec and a consuming phase and touches no client code. All tasks OPEN — plan only."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Task ledger drafted; one contract task per ⚠️ field/RPC; all open, nothing built."
    next_safe_action: "On operator go, hand the request to the relay team; build in the consuming phases."
    blockers:
      - "Host dependency: the requested fields/RPCs are relay-authored; tasks define a request, not code."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is OPEN — this is a request
spec, plan only, nothing implemented. Each task cites its rec number in `../research/research.md`, the current
protocol DTO it extends, and the consuming phase that will render the unlocked UI. "Touch" here means the
request references that file; the edit itself happens in the consuming phase, never in this one.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Inventory the ⚠️ "Needs host support" recs from `../research/research.md`: the card bundle (2.2, 2.3, 1.6), the optional fields (2.4, 2.5, 1.3, 1.4, 2.6, 1.14, 6.4), and the chat RPCs (4.2, 4.5, 4.6, 5.6). [will cite: `../research/research.md` "Needs host support"]
- [ ] **T1.2** Read the current shapes the request diffs against: `SessionCardDto` (`packages/pi-rpc-protocol/src/types.ts:428`), `AttentionItemDto`/`AttentionClass` (`types.ts:1068,1054`), and the guard strictness `isSessionCardDto` (`packages/pi-rpc-protocol/src/guards.ts:1244`, permissive) vs `isAttentionItemDto` (`guards.ts:364`, strict `hasOnlyKeys`). [will cite: `pi-rpc-protocol/src/types.ts`, `.../guards.ts`]
- [ ] **T1.3** Answer Open Question #1 against the protocol: confirm `AttentionItemDto` carries no `sessionId` (only `AttentionResolutionDto` does, post-open at `app-mobile/src/shared/format/attention.ts:47`), and record that the attention badge therefore needs a new host field. [will cite: `types.ts:1068,1076`, `guards.ts:364,396`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

> Each task below is "**request the field/RPC + define its UI contract**": the wire shape, the exact UI it
> unlocks and the consuming phase, the fail-closed fallback until it lands, and the wire-compat note. No client
> code is written.

**Minimum home-card bundle (the core request — extends `SessionCardDto`, `types.ts:428`):**

- [ ] **T2.1** Request `title` + define its contract. [rec 2.2, 2.3] Shape: `title: string` (host may send `"Untitled session"`); host-derived only, never client-sliced. UI: the card's primary label replaces the opaque compacted `id` → consuming phase `002-home-selection/003-card-polish`. Fallback: keep today's opaque `id` as the label (`app-mobile/src/pages/home/screen-home.svelte`). Wire-compat: additive-safe — `isSessionCardDto` is permissive (`guards.ts:1244`).
- [ ] **T2.2** Request `lastMessagePreview` + define its contract. [rec 2.2, 2.5] Shape: `lastMessagePreview: string` (short, host-redacted). UI: a last-message line on the card and the peek-before-open body → `002-home-selection/003-card-polish`. Fallback: show no preview line (status + count only, as today); never synthesize a preview from a client transcript cache. Wire-compat: additive-safe optional string.
- [ ] **T2.3** Request `agent` (+ optional `model`) + define its contract. [rec 2.2] Shape: `agent: string` label the host already knows; `model?: string`. UI: an agent/model identity chip on the card → `002-home-selection/003-card-polish`. Fallback: omit the chip. Wire-compat: additive-safe; `model` optional within the optional field.
- [ ] **T2.4** Request `attention` + define its contract, and record the taxonomy reconciliation. [rec 1.6] Shape: `attention: 'none' | 'blocked' | 'waiting' | 'completed'` — **unread ≠ working** (no `working` value; a running session is never badged). Note: the host's existing `AttentionClass` is `'needs_input' | 'finished' | 'error'` (`types.ts:1054`) — request either this card enum with a stated mapping or a widened `AttentionClass`. UI: the "needs-you" badge ON the card + attention-first ordering → badge in `002-home-selection/003-card-polish`, ordering in `002-home-selection/002-list-organization`. Fallback: no card badge; attention stays only in the Inbox surface (`app-mobile/src/pages/inbox/screen-attention-inbox.svelte`), as today. Wire-compat: **request it on `SessionCardDto` (additive-safe), NOT `sessionId` on `AttentionItemDto`** — the latter breaks the strict `isAttentionItemDto` guard (`guards.ts:364`). MUST-CONFIRM-FIRST with the operator (Open Q#1).

**Optional / product-gated:**

- [ ] **T2.5** Request `queuedMessageCount` / `subagentTranscriptCount` (or a `resumable` flag) + define its contract. [rec 2.4] Shape: `queuedMessageCount?: number` / `subagentTranscriptCount?: number` or `resumable?: boolean`. UI: faithful hide-empty that preserves recoverable zero-turn sessions → `002-home-selection/002-list-organization`. Fallback: show all sessions including `messageCount === 0` (do not hide — a lossy hide is worse than an extra row). Wire-compat: additive-safe optional numbers/bool.
- [ ] **T2.6** Request redacted `projectLabel` (and/or `cwd` / `branch`) + define its contract. [rec 1.3, 1.4, 2.6] Shape: `projectLabel?: string` — a **redacted** label, not a filesystem path. UI: folder/project grouping + Workspace/Project scope tabs and useful search (rec 1.5) → `002-home-selection/002-list-organization`. Fallback: time-bucket + status-filter grouping only (the ✅ set); search stays chrome-only. Wire-compat: additive-safe, BUT gated on Open Q#2 (product must lift "no paths on home", `screen-home.svelte:86`); raw `cwd` on home is ❌.
- [ ] **T2.7** Request `pinned` + a pin RPC + define its contract. [rec 1.14] Shape: `pinned?: boolean` + a host pin mutation (a NEW Pi RPC — orca pins worktrees, not sessions; do not copy it as-is). UI: a cross-device authoritative pin that reorders the list → `002-home-selection/002-list-organization`. Fallback: a **device-local favorite** (pure view-state, local reorder) needs no host field and ships in the ✅ set; only the cross-device pin waits on this. Wire-compat: additive field is safe; the mutation is a new endpoint, versioned independently.
- [ ] **T2.8** Request capped `previewMessages[]` + define its contract. [rec 2.5] Shape: `previewMessages?: Turn[]` — a host-capped array (heavier than the single `lastMessagePreview` string). UI: full peek-before-open accordion body → `002-home-selection/003-card-polish`. Fallback: peek accordion stays chrome-only / unshown; never synthesize previews from a client cache (a second source of truth). Wire-compat: additive-safe optional array; host owns the cap.
- [ ] **T2.9** Request `hasMore` / a transcript page token + define its contract. [rec 6.4] Shape: `hasMore?: boolean` + an opaque page token. UI: load-earlier pagination near the transcript top → `003-chat-message`. Fallback: rely on the full redacted snapshot the host already sends (as today); do not invent earlier messages from a stale client cache across epochs (❌). Wire-compat: additive-safe; only needed if we stop sending full snapshots.

**Chat RPCs (distinct from the card DTO):**

- [ ] **T2.10** Request the `@`-file-search RPC + define its contract. [rec 4.2] Shape: query string in → relative paths out (debounced ~120 ms, capped ~16, generation-counter stale-safe); the client must NOT walk the device FS, and must not copy orca's method names (`files.searchPaths` is ❌). UI: `@`-file mention autocomplete in the composer → `004-composer` (`app-mobile/src/pages/chat/chrome/session-composer.svelte`). Fallback: `@foo` is plain text, no autocomplete. Wire-compat: new RPC, versioned; the client feature-detects and hides the affordance when absent.
- [ ] **T2.11** Request the image-paste upload lease RPC + define its contract. [rec 4.5] Shape: a media-lease mutation (paste → host upload lease → stable ref); base64-in-DTO is ❌. UI: pasted-image chips that upload to the host → `004-composer`. Fallback: paste falls back to text; image attach continues via the EXISTING photo path (`RuntimeMediaCapabilityDto` + `attachment-rail.svelte`, `session-composer.svelte:14,79`) — confirm this does not already cover paste (Open Q#3). Wire-compat: new RPC; feature-detected.
- [ ] **T2.12** Request the host-backed dictation/STT RPC + define its contract. [rec 4.6] Shape: a paired-host STT RPC; OR on-device STT permitted ONLY as an editable local draft the user confirms before send (never host truth). UI: dictation hold-vs-toggle chrome + a fail-closed setup sheet → `004-composer`. Fallback: the dictation button opens a fail-closed setup sheet (not a dead toast) when the host can't dictate. Wire-compat: new RPC; feature-detected; on-device path needs no host field.
- [ ] **T2.13** Request a typed approval envelope — ONLY if the Review ticket doesn't already cover it. [rec 5.6] Shape: a typed permission/approval ticket (primary = first option); TUI keystroke sends (`"1"`/Escape) are ❌. UI: approval buttons rendered from the typed ticket → `005-streaming-ask`. Observed: the protocol already carries approval types (`ApprovalResultStatus`, `status: 'pending'`, `types.ts:1013,1019`) and a Review surface exists (`app-mobile/src/pages/review/screen-review.svelte`), so this is likely ALREADY covered — mark as confirm-then-drop rather than a new request. Fallback: render from the existing Review ticket; never scrape approvals from last-assistant prose. Wire-compat: no new field if the Review ticket suffices.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Traceability: every requested field/RPC (T2.1–T2.13) cites a rec number in `../research/research.md` and names a consuming phase under `007-orca-nodeterm-ux-mining`. [will produce: a rec→field→consuming-phase trace table]
- [ ] **T3.2** Fail-closed coverage: every field/RPC has a defined absent-behaviour that equals the current client behaviour (the field's absence is un-enriched, never broken); no row proposes the client owning or editing session truth. [will cite each row's fallback]
- [ ] **T3.3** Wire-compat correctness: each field is marked additive-safe against the real guard, or its guard-coordination caveat is stated; the attention approach is the additive-safe `SessionCardDto` field, not the guard-breaking `AttentionItemDto` join. [will cite `guards.ts:1244,364`]
- [ ] **T3.4** Open questions carried: #1 answered from `pi-rpc-protocol` with `file:line`; #2 and #3 carried with our observed state. No client code created or edited (`git status` shows changes only under this phase folder); `validate.sh <packet> --strict` exit 0 via realpath. [will cite `git status`, `validate.sh`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every requested field/RPC carries a shape, a consuming phase, a fail-closed fallback, and a wire-compat note;
every entry traces to a rec number; Open Question #1 is answered from the protocol with evidence; no file under
`app-mobile/` is created or edited; and `validate.sh --strict` exits 0 — all while the phase implements nothing
and stays blocked on the host until the operator says go.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the request structure and the four-facet contract per row.
- `checklist.md` — barrier sign-off.
- `../research/research.md` — the ⚠️ recs each task requests.
<!-- /ANCHOR:cross-refs -->
