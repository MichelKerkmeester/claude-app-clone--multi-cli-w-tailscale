---
title: "Phase 7 — Host protocol request spec: the ⚠️ new-field/RPC set for the orca UX wins"
description: "A cross-team request to the relay/host team for the read-only fields and RPCs the ⚠️ orca recommendations need: the minimum home-card bundle (title, lastMessagePreview, agent, attention), the optional/product-gated fields (queued/subagent counts or resumable, redacted projectLabel/cwd/branch, pinned + pin RPC, capped previewMessages[], hasMore page token), and the chat RPCs (@-file-search, image-paste upload lease, dictation/STT, typed approval envelope). Each entry gives the wire shape, the exact UI it unlocks in a named consuming phase, the fail-closed fallback until it lands, and its orca wire-compat note. Implements no client code; it is the buildable-when-the-host-ships contract."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/007-host-requests"
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
| Parent | `007-orca-nodeterm-ux-mining` |
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
