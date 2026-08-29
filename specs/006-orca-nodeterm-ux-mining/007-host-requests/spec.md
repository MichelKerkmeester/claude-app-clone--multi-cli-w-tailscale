---
title: "Phase 7 — Host protocol request spec: the ⚠️ new-field/RPC set for the orca UX wins"
description: "A cross-team request to the relay/host team for the read-only fields and RPCs the ⚠️ orca recommendations need: the minimum home-card bundle (title, lastMessagePreview, agent, attention), the optional/product-gated fields (queued/subagent counts or resumable, redacted projectLabel/cwd/branch, pinned + pin RPC, capped previewMessages[], hasMore page token), and the chat RPCs (@-file-search, image-paste upload lease, dictation/STT, typed approval envelope). Each entry gives the wire shape, the exact UI it unlocks in a named consuming phase, the fail-closed fallback until it lands, and its orca wire-compat note. Implements no client code; it is the buildable-when-the-host-ships contract."
trigger_phrases:
  - "host requests spec requirements"
  - "host requests packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added nodeterm net-new host requests (contextPercent/activity/prompt/attn-ext/read-ack)."
    next_safe_action: "Hand orca+nodeterm request to relay team; consuming phases build each field on ship."
    blockers:
      - "Host dependency: every requested field/RPC is relay-authored; this phase implements nothing and unblocks only when the relay publishes the fields."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 — Host protocol request spec

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Source: [`../research/research.md`](../research/research.md) "Needs host support" · Prev: `006-navigation` (last phase)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Kind | Cross-team request spec — implements NO client code |
| Writer | Claude (inventory the ⚠️ set, define each field/RPC contract, name the consuming phase + fallback + wire-compat) |
| Barrier | every requested field/RPC → a rec number + a consuming phase + a fail-closed fallback + a wire-compat note; client never owns session truth; no code under `app-mobile/` touched; `validate.sh --strict` exit 0 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The verified synthesis (`../research/research.md`, "Needs host support") splits into a ✅ set the other
phases ship now and a ⚠️ set that is worthwhile but blocked on the relay publishing a new read-only field
or RPC. This phase turns that ⚠️ set into a precise, buildable request to the relay/host team.

The home card the client renders today is exactly `SessionCardDto = { id, status, updatedAt, messageCount }`
(`packages/pi-rpc-protocol/src/types.ts:428`; rendered at `app-mobile/src/pages/home/screen-home.svelte:97`).
It carries no human title, no preview, no agent label, and no attention signal — which is why the home is
"thin". Every enrichment that would fix that is host truth, not client truth: the client is host-authoritative
and fail-closed, so it must not invent a title, slice one from a prompt, or badge a card from a heuristic. The
only correct path is to ask the host to publish these as read-only fields, then let a consuming phase render
them with a fail-closed fallback for the interval before they land.

This spec is therefore a contract, not an implementation. For each field and RPC it states the wire shape, the
exact UI it unlocks and which phase consumes it, the fail-closed fallback until it ships, and the orca
wire-compat note ("a new optional field is safe" for mixed client/host versions — with the client-guard caveat
this codebase actually has). It also carries the three operator/product questions the research could not answer
from orca, one of which is answered here against our own protocol.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** authoring the host-protocol request as a cross-team spec — (a) the minimum home-card bundle
(`title`, `lastMessagePreview`, `agent`, `attention`), (b) the optional/product-gated fields
(`queuedMessageCount`/`subagentTranscriptCount` or `resumable`; redacted `projectLabel`/`cwd`/`branch`;
`pinned` + a pin RPC; capped `previewMessages[]`; `hasMore`/transcript page token), (c) the chat RPCs
(`@`-file-search, image-paste upload lease, host-backed dictation/STT, a typed approval envelope), and (d) the
three open operator/product questions. Each field/RPC entry defines its wire shape, its consuming phase's UI,
its fail-closed fallback, and its wire-compat note. All citations trace to a numbered rec in
`../research/research.md`.

Also in scope: the **net-new host requests mined from nodeterm** (`../research-nodeterm/`, deduped against the
orca set) — `contextPercent`, `activity` (+ raw `tool`), `prompt`, an approval-vs-question sub-kind + end-reason
extension of the already-requested `attention`, a cross-surface read-ack RPC, and an optional `stateEnteredAt`
transition-clock. Each carries the same four facets and cites its `ND-x.y` id; the orca fields nodeterm merely
reinforces (`title`, `agent`/`model`, the base `attention` enum) are noted, NOT re-requested.

**Out of scope:** implementing, editing, or creating any client code — this phase writes no code under
`app-mobile/`, invents no field on the client, and renders no UI (each consuming phase owns its own
implementation, verification, and a11y/token-identity gates). Also out of scope: the host's own implementation
of these fields; a new-session **create** RPC (rec 1.13) and an authorized artifact-open ref (rec 6.6), which
are noted as related ⚠️ items owned elsewhere but not formally requested here; and any change that would make
the client own or edit mutable session truth (that is ❌, not a request).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The **minimum home-card bundle** is documented: `title` (string; host may send
  `"Untitled session"`), `lastMessagePreview` (short redacted string), `agent` (a label the host already
  knows; `model` optional), and `attention` (enum `none | blocked | waiting | completed` — **unread ≠
  working**). Each entry states its shape, the exact UI it unlocks and the consuming phase, the fail-closed
  fallback, and the wire-compat note. Covers recs 2.2, 2.3, 1.6.
- **REQ-002** — The **optional / product-gated** fields are documented with the same four facets:
  `queuedMessageCount`/`subagentTranscriptCount` or a `resumable` flag (rec 2.4); redacted
  `projectLabel`/`cwd`/`branch` (recs 1.3, 1.4, 2.6); `pinned` + a pin RPC (rec 1.14); capped
  `previewMessages[]` (rec 2.5); `hasMore`/transcript page token (rec 6.4).
- **REQ-003** — The **chat RPCs** are documented (distinct from the card DTO), each with shape + consuming
  phase + fallback + wire-compat: `@`-file-search (query in → relative paths out; never a device FS walk,
  rec 4.2); image-paste upload lease (rec 4.5); host-backed dictation/STT (rec 4.6); a typed approval envelope
  (rec 5.6 — requested only if the existing Review ticket does not already cover it).
- **REQ-004** — The **three open operator/product questions** from the research are carried, and question #1
  ("does our Inbox payload already carry `sessionId`?") is answered against our own protocol with evidence and
  marked as the MUST-CONFIRM-FIRST decision that gates the attention badge's design.
- **REQ-005** — Every requested field/RPC traces to a rec number and names its consuming phase; the request
  never has the client own or edit session truth (fail-closed); and each field is marked additive-safe or its
  client-guard coordination is stated, per the actual `pi-rpc-protocol` guards.
- **REQ-006** — The **nodeterm net-new card-content fields** are documented with the same four facets, each
  citing its `ND-x.y` id (tasks T2.14–T2.16): `contextPercent` (0–100, optional on `SessionCardDto` — the
  context-window fill meter; the `model` label rides the same usage payload, so bundle it with the
  already-requested `agent`/`model`; fail-closed: no meter when absent; additive-safe; ND-3.1); `activity`
  (+ raw `tool`) (the live present-tense action line that upgrades "Working…"; fail-closed: plain working state;
  ND-3.2); and `prompt` (the current turn's opening "You:" user line, host-clipped; fail-closed: omit; ND-3.3).
  Consuming phase for all three: `002-home-selection/003-card-polish`.
- **REQ-007** — The **nodeterm net-new presence extensions** are documented with the same four facets, each
  citing its `ND-x.y` id (tasks T2.17–T2.19): an approval-vs-question **sub-kind** (+ `options[]`) and an
  **end-reason** extending the already-requested `attention` — referencing the `NodeStateChange` shape — so a
  presumed-*stale* end is not mistaken for a natural finish (fail-closed: base three-value attention; ND-2.2,
  ND-2.9); a cross-surface **read-ack RPC** with a loop-guard (fail-closed: local-only dismissal; LOW/optional;
  ND-2.10); and an optional **`stateEnteredAt`** transition-clock for accurate in-state age (fail-closed: age
  off `updatedAt`; LOW/optional/candidate-drop; ND-2.8, ND-1.5). The base `attention` enum, `title`, and
  `agent`/`model` are reinforced by nodeterm but NOT re-requested.
- **REQ-008** — A **reusable-prompt / skills catalog RPC** is requested, citing rec `CI-5`. Shape: a
  session-scoped payload mirroring the existing host command catalog (`hostEpoch`, `sessionId`,
  `sessionRevision`, `catalogRevision`, `fetchedAt`, plus `entries[]` of `{ name, source, body }`, where
  `source` names the pack or extension offering the entry) — the client needs `source` to badge a name
  offered by more than one place, and `body` is the canned text inserted into the composer as an editable
  draft that is never auto-sent. Consuming phase: `008-uiux-features-mining/001-composer-send`. Fail-closed
  fallback: with the field absent the intake renders nothing, invents no rows, and stays unreachable — the
  client half already ships this way. Wire-compat: additive — a new optional catalog lane beside the command
  catalog, so an older host that omits it simply leaves the surface inert.
- **REQ-009** — An **inbox event stream** is requested, citing recs `CE-1`, `CE-2`, `CE-3`, `CE-4`. Today's
  `AttentionItemDto` is snapshot-only and carries no `sessionId`, so a cross-session timeline cannot be
  joined client-side at all. Shape: an ordered event lane of
  `{ eventId, sessionId, title, kind, occurredAt, resolved, supersedesEventId }`, with the host owning three
  semantics the client must not synthesise — dedup (repeat of the same title from the same session inside a
  ten-minute window is one event), supersede (an answered or content-changed ask replaces its predecessor
  rather than sitting beside it), and retention (the newest done plus the newest unresolved per node).
  Consuming phase: `008-uiux-features-mining/005-host-inbox-notifications`. Fail-closed fallback: with the
  lane absent the timeline renders nothing — the client already computes these rules as pure functions over
  an explicitly host-shaped input and returns empty for an empty list, inventing no card and resurrecting
  nothing from local cache. Wire-compat: additive — a new optional lane beside the existing attention
  snapshot, so an older host simply leaves the timeline empty.
- **REQ-010** — The **inbox action and acknowledgement surface** is requested, citing recs `CE-6`, `CE-7`,
  `HP-3`. Three parts: an `ackDone` re-broadcast so a finished-unseen card clears on every surface after one
  view rather than once per device; a list-level ticket payload carrying enough of an approval to answer it
  inline, alongside a re-check-still-blocked guard so acting on a stale ticket is refused rather than
  applied; and a bulk read-ack RPC for multi-select. Consuming phase:
  `008-uiux-features-mining/005-host-inbox-notifications`. Fail-closed fallback: without the re-broadcast a
  view clears only locally; without the ticket payload the card offers no inline action and defers to the
  existing Review route; without the bulk RPC the multi-select bar stays inert and never fakes a batch ack.
  Wire-compat: additive on all three; `HP-3` is explicitly low priority and may be dropped.
- **REQ-011** — **Delivery integrity for catch-up** is requested, citing rec `AN-1`. Shape: a monotonic
  `{ seq, epoch }` on the event lane plus a `getMissedSince(seq, epoch)` RPC that reports whether the reply
  is complete. The `epoch` is what makes a host restart safe: a client that saw a lower `seq` under a new
  epoch must not treat the gap as already-delivered. Consuming phase:
  `008-uiux-features-mining/005-host-inbox-notifications`. Fail-closed fallback: the client persists the
  pair atomically and QUARANTINES an incomplete catch-up rather than advancing past a gap, so with the RPC
  absent nothing advances and nothing is silently skipped. Wire-compat: additive.
- **REQ-012** — **Notification policy and presence** is requested, citing recs `AN-2`, `AN-3`. Two parts:
  a presence signal so an alert arriving while the person is already looking at the app can be held rather
  than shown over what they are reading, then flushed on background and dropped if it resolved while held;
  and independent server-side per-kind gates evaluated BEFORE any throttle, so a muted kind cannot consume
  throttle budget and silently suppress a kind the person actually wants. Consuming phase:
  `008-uiux-features-mining/005-host-inbox-notifications`. Fail-closed fallback: without presence the queue
  holds nothing and behaviour is today's; without the server gate the client-side kind-before-throttle
  ordering still applies locally but cannot stop the send. Wire-compat: additive; the per-kind gate extends
  the existing `PushPreferences` rather than replacing it.
- **REQ-013** — A **typed notification tap payload and a dismissal event** are requested, citing recs
  `AN-4`, `AN-5`. Shape: a tap payload of `{ hostId, sessionId, recoveryHint? }`, and a
  `DismissNotificationEvent` so a question answered on another device retracts this device's banner.
  Consuming phase: `008-uiux-features-mining/005-host-inbox-notifications`. Fail-closed fallback: the client
  REFUSES an unknown host and a malformed payload outright — it never falls back to whichever host happens
  to be paired, because opening the wrong host from a notification is a cross-host leak; without the
  dismissal event a banner simply stays until dismissed locally, and the show-then-dismiss race guard
  ensures a late dismissal never produces a visible flash. Wire-compat: additive on both.
- **REQ-014** — **Account usage windows** are requested, citing recs `UQ-1` through `UQ-8`. Shape: per-window
  entries carrying used and remaining figures, a reset timestamp, a per-window availability state, and a
  host-flagged `isActive`/`primary` marker naming WHICH window is currently gating — the client must not pick
  the fullest bar and call it the limit, because the fullest window is frequently not the one that will stop
  the next request. Also requested: a stale marker plus a grace signal after a rate-limited read, and a
  documented poll cadence gated on a remote reader so the client cannot be the thing that exhausts the quota
  it is displaying. Consuming phase: `008-uiux-features-mining/006-host-usage-search-review`. Fail-closed
  fallback: with the payload absent the usage card and its detail sheet render nothing at all; a failed poll
  keeps the last good value and marks it stale rather than showing a zero. Wire-compat: additive.
- **REQ-015** — A **`sessions.search` RPC** is requested, citing rec `SH-1`. Shape: a query in, and out a
  capped list of `{ sessionId, title, snippet, updatedAt }`, with the host owning the match and the snippet
  so the client never scans transcripts it does not hold. Consuming phase:
  `008-uiux-features-mining/006-host-usage-search-review`. Fail-closed fallback: the client half already
  ships as a debounced harness with a two-character minimum that issues no query and returns no results
  without the capability. Wire-compat: additive.
- **REQ-016** — A **source-control review bundle** is requested, citing recs `CR-1` through `CR-9`. Shape, as
  host-pre-resolved tokens the client only renders: a PR summary with a state pill, a worst-of rollup and a
  comment count; a provider-neutral CLASSIFIED check summary plus per-check rows with host-supplied URLs;
  a committed-on-branch changed-files list whose patches the client renders through its existing unified-diff
  parser; commit history with per-commit files; `upstreamStatus` for ahead/behind and branch identity;
  a conflict state that keeps provider-reported and locally-confirmed separate; and reviewer rows. The client
  computes no verdict and mutates no repository state. Consuming phase:
  `008-uiux-features-mining/006-host-usage-search-review`. Fail-closed fallback: every surface renders
  nothing without its field; an UNKNOWN check classification renders muted-unresolved and never as passing;
  an absent `upstreamStatus` shows no sync label rather than a guessed one. Wire-compat: additive.
- **REQ-017** — **Host path resolution for prose file paths** is requested, citing rec `TE-3`. Shape: given a
  path string appearing in model output, the host resolves it to a real artifact reference, or declines.
  The client must never resolve a path itself and never walk a device filesystem. Consuming phase:
  `008-uiux-features-mining/006-host-usage-search-review`. Fail-closed fallback: an unresolved path stays
  INERT exactly as it renders today — no tap target and no navigation — which is what the sanitization
  boundary already enforces. Wire-compat: additive.
- **REQ-018** — A **branch/fork RPC returning a new resumable session** is requested, citing rec `MI-3`.
  Shape: a request naming the session and the point to branch from, returning the host's own new session id.
  Consuming phase: `008-uiux-features-mining/006-host-usage-search-review`. Fail-closed fallback: the branch
  entry renders nothing until the RPC lands and never fabricates a session id or implies a branch was
  created. Wire-compat: additive.
- **REQ-019** — A **typed edge-versus-tick push contract with an end reason** is requested, citing recs
  `LA-4`, `LA-6`. Shape: every pushed update is typed as an EDGE (a real state change) or a TICK (progress on
  an unchanged state), so edges can be delivered immediately at high priority while ticks coalesce at low
  priority — a tick delivered immediately for every progress report would wake the device constantly for
  information that has not meaningfully changed. Alongside it, an explicit END-REASON flag on the done edge,
  because the alternative is matching message text, where a message that merely mentions finishing produces a
  false done and any wording change silently breaks the rule. Consuming phase:
  `008-uiux-features-mining/007-host-liveactivity-fields`. Fail-closed fallback: without the typing every
  update is treated as today; without the flag nothing is given the done treatment at all, and the client
  never falls back to reading the text. Wire-compat: additive.
- **REQ-020** — A **host-parked unsent input draft** is requested, citing rec `CI-3`. Shape: read-only
  `unsentInputDraft` plus `unsentInputDraftAt` on the session, so a draft typed elsewhere and never sent can
  be adopted here. Consuming phase: `008-uiux-features-mining/007-host-liveactivity-fields`. Fail-closed
  fallback: with the fields absent nothing is adopted; when present the client adopts ONCE and only into an
  EMPTY composer, so it can neither resurrect text the person deleted nor overwrite what they are typing.
  Wire-compat: additive and read-only — the client never writes these back.
- **REQ-021** — A **media preview kind with object-URL delivery** is requested, citing rec `MA-3`. Shape: a
  video/audio preview kind on an artifact plus a delivery path the client can turn into a scoped object URL.
  Consuming phase: `008-uiux-features-mining/007-host-liveactivity-fields`. Fail-closed fallback: an artifact
  the host does not mark playable keeps today's unsupported notice rather than rendering an empty player; the
  client revokes any object URL it creates on teardown so a long-lived chat cannot accumulate blobs.
  Wire-compat: additive.
- **REQ-022** — **Working-session telemetry** is requested, citing recs `SC-1`, `SC-3`, `SP-3`. Three
  independent fields: `cacheExpiresAt` for a prompt-cache countdown; token and tool-call counts on a working
  session; and a subagent/task activity stream. They are requested together because they all decorate the
  same working state, but each must be independently optional — the elapsed tick already ships and must keep
  rendering when any of them is absent. Consuming phase:
  `008-uiux-features-mining/007-host-liveactivity-fields`. Fail-closed fallback: each segment renders only
  with its own field present; the subagent tail is entirely absent without its stream rather than an empty
  expander that implies there is something to see. Wire-compat: additive.
- **Cross-reference** — `HP-6` (grouping the home by project) needs the redacted `projectLabel` ALREADY
  requested under REQ-002; it is not re-requested here. Its consuming phase extends to
  `008-uiux-features-mining/007-host-liveactivity-fields`, and with the field absent the roster renders
  ungrouped exactly as it does today.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The four-field card bundle, five optional fields, and four chat RPCs each carry a shape, a consuming phase, a fail-closed fallback, and a wire-compat note.
2. Every entry cites a rec number in `../research/research.md`; no entry proposes the client owning session truth.
3. Open Question #1 is answered from `packages/pi-rpc-protocol` with `file:line` evidence; #2 and #3 are carried with our observed state attached.
4. The spec implements nothing — no file under `app-mobile/` is created or edited — and `validate.sh --strict` exits 0.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Host dependency (the blocker).** Every entry here is relay-authored and client-read-only. Nothing in this
  phase is buildable until the relay ships the field/RPC; the consuming phases stay on their fail-closed
  fallback until then. This is the phase's declared blocker.
- **The two attention approaches are NOT equally wire-safe (confirmed).** `isSessionCardDto`
  (`packages/pi-rpc-protocol/src/guards.ts:1244`) is permissive — it checks the four required keys and ignores
  extras — so adding an optional `attention` to `SessionCardDto` is additive-safe for old clients. But
  `isAttentionItemDto` (`guards.ts:364`) uses a strict `hasOnlyKeys(['lookupId','attentionClass','generation','nonce'])`
  allowlist, so adding `sessionId` to the Inbox item would make every un-updated client reject the whole
  Attention payload. **Recommendation: request `attention` on `SessionCardDto`, not `sessionId` on
  `AttentionItemDto`.**
- **Attention taxonomy mismatch.** The host's existing `AttentionClass` is `'needs_input' | 'finished' |
  'error'` (`types.ts:1054`) — three values, no `working`. The requested card enum is `none | blocked |
  waiting | completed`. The request must state the mapping (or ask the host to widen `AttentionClass`) so the
  badge does not silently drop a state; the "never `working`" rule already holds because no such value exists.
- **The `projectLabel` product rule.** Home enforces "Opaque identifiers only. No prompts, paths, or host
  context" (`app-mobile/src/pages/home/screen-home.svelte:86`). A raw `cwd` would violate it; only a redacted
  `projectLabel` survives the rule — and only if product lifts the ban for a redacted label (Open Question #2).
- **`test:web` / `token-identity` are not this phase's gate.** This request spec changes no CSS or behaviour,
  so those gates belong to each consuming phase when it renders the unlocked UI; naming them here would be a
  false completion signal.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

The three operator/product questions carried from `../research/research.md` "Needs host support":

1. **Does our Inbox payload already carry `sessionId`? — ANSWERED: no (MUST-CONFIRM-FIRST, now confirmed).**
   `AttentionItemDto = { lookupId, attentionClass, generation, nonce, occurredAt }` (`types.ts:1068`), guarded
   by a strict `hasOnlyKeys` allowlist (`guards.ts:364`); `sessionId` appears only on `AttentionResolutionDto`
   (`types.ts:1076`, `guards.ts:396`) after a per-item `openAttentionHint(lookupId)` round-trip
   (`app-mobile/src/shared/format/attention.ts:47`). So the "attention badge as a free view-join" path is NOT
   available today — the badge needs a new host field, and the additive-safe choice is `attention` on
   `SessionCardDto` (see Risks). **Operator confirm requested** before the host commits to the enum vs. a
   `sessionId`-on-item join.
2. **Will product lift the "no paths on home" rule for a redacted `projectLabel`?** Needed before the host
   invests in `projectLabel`/`cwd`/`branch` on the card (recs 1.3, 1.4, 2.6). Open for product.
3. **Do paste-image / file-search RPCs already exist on the Pi relay?** Observed state: no `@`-file-search,
   paste-upload-lease, or dictation RPC was found in `app-relay/src` or `packages/pi-rpc-protocol/src`; the
   composer already has a photo-attachment path (`RuntimeMediaCapabilityDto` + `attachment-rail.svelte` at
   `app-mobile/src/pages/chat/chrome/session-composer.svelte:14,79`), so an image **attach** may already be
   covered while a **paste-upload lease** and `@`-search are not. Confirm with the relay team.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../research/research.md` — the verified synthesis; the "Needs host support" section and recs 1.3–1.6, 2.2–2.6, 1.14, 4.2, 4.5, 4.6, 5.6, 6.4.
- `../research-nodeterm/research.md` + `.../findings/angle-2.md`, `.../findings/angle-3.md` — the nodeterm mining; the net-new "Needs host support" set ND-3.1, ND-3.2, ND-3.3, ND-2.2, ND-2.9, ND-2.10, ND-2.8/1.5 (REQ-006/007).
- `../spec.md` — the phase parent (§3 map: this is Phase 7; the consuming phases are 002–006).
- `../002-home-selection/` — consumes `title`/`lastMessagePreview`/`agent`/`attention`/`projectLabel`/`pinned`/`previewMessages[]`.
- `../004-composer/` — consumes the `@`-file-search and paste-upload-lease and dictation RPCs.
- `../005-streaming-ask/` — consumes the typed approval envelope (or confirms the Review ticket already covers it).
<!-- /ANCHOR:cross-refs -->
