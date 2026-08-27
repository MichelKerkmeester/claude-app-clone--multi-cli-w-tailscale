---
title: "Phase 7 implementation summary — host card enrichment (IMPLEMENTED, in progress)"
description: "Relay + protocol implementation of the host-request set: the SessionCardDto shape gained twelve optional read-only fields (additive-safe), and the relay now emits eight of them (model, attention, and six host-redacted content/derived fields) at GET /api/sessions. Three card fields need the external Pi CLI; the chat RPCs + presence extensions remain."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Relay emits 8 of 12 card fields; protocol + model/attention + redacted content shipped."
    next_safe_action: "Record the 3 external-Pi fields; scope the chat RPCs + presence extensions."
    blockers:
      - "agent/resumable/queuedMessageCount + @-file-search + host STT need the external Pi CLI (out of this repo)."
    completion_pct: 45
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | In progress — card enrichment implemented; chat RPCs + external-Pi fields remaining |
| Surface | `packages/pi-rpc-protocol/` + `app-relay/` (the external Pi CLI is out of this repo) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The host protocol request became a host implementation. `SessionCardDto` gained twelve optional read-only fields
and the relay now emits eight of them; the client's fail-closed fallbacks light up when a field is present.

**Protocol foundation** (`bc76844`): `SessionCardDto` (`packages/pi-rpc-protocol/src/types.ts:428`) gained the
twelve optional fields the client reads — `title`, `lastMessagePreview`, `agent`, `model`, `attention`
(`done|blocked|waiting`, reconciled from the request spec's `completed`), `contextPercent`, `activity`, `tool`,
`prompt`, `previewMessages`, `resumable`, `queuedMessageCount`. `isSessionCardDto` validates each when present and
stays permissive to unknown extras, so a bare four-field card from an older host still validates (additive-safe).

**Relay emits model + attention** (`444c267`): merged live at `GET /api/sessions` — the runtime model label and
the session's latest attention, mapped from the host `AttentionClass` (`finished→done`, `needs_input→waiting`,
`error→blocked`). Absent source omits the field.

**Relay emits six host-redacted content/derived fields** (`5ffe38b`): an in-memory `SessionEnrichmentService`
derives `title`, `prompt`, `lastMessagePreview`, `previewMessages`, `tool`, and `contextPercent` from Pi's
existing transcript/prompt stream. Every text field routes through `safeDisplayString` (rejects paths, URLs,
prefixed secrets; caps to the protocol-guard limits) plus a conservative card-boundary `looksLikeSecret` reject
for un-prefixed token shapes; a rejected value omits the field. The merged card is re-validated against
`isSessionCardDto` and falls back to the bare card on any mismatch.

Not built — `agent`, `resumable`, `queuedMessageCount` have no relay source (the external Pi does not emit them);
`activity` has no clean per-turn label. These, plus the chat RPCs and presence extensions, are recorded in
LIMITATIONS.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Protocol-first, then relay, in additive-safe batches. The DTO shape landed first with wire-compat tests (a bare
card still validates; each invalid new field is rejected). The relay then emitted fields at the `GET /api/sessions`
projection — a read-time merge for live state (`model`/`attention`), and an in-memory accumulator hooked to the
transcript/prompt ingest for the derived content fields, so nothing is persisted and an absent summary omits the
field. Redaction is the load-bearing invariant for the content fields: the same safe-display sanitizer the
protocol guard uses, applied at capture, with a second full-card re-validation before the response. Every field
was proven end-to-end against the client's `card-projection` reader and reviewed by an independent agent with a
negative control on each constraint (the attention map, the redaction gate, the secret reject).
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**`attention` on `SessionCardDto`, mapped from `AttentionClass`.** Added to the permissive card guard (additive-safe),
never `sessionId` on the strict `AttentionItemDto`. The host `needs_input|finished|error` maps to the client
`done|blocked|waiting` at the projection; no state is dropped.

**The Pi CLI is external — most content is derived in the relay.** Only `pi-rpc-protocol` and `app-relay` live in
this repo; the Pi agent is a separate process the relay proxies over RPC. So the redacted content fields are
derived from Pi's existing transcript/prompt stream at the relay ingest, not sourced from a new Pi field.

**Prompt-derived text is allowed on the card, host-redacted (operator-approved).** The relay historically kept
prompt/path/label content off the card; the operator lifted that for host-redacted `title`/`preview`/`prompt`.
Every such value passes the safe-display sanitizer plus the card-boundary secret reject, or the field is omitted.

**Fields with no relay source are not faked.** `agent`, `resumable`, `queuedMessageCount` (and a clean `activity`
label) do not exist in the relay's view of the external Pi, so they are omitted, not fabricated.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Protocol | `pi-rpc-protocol` typecheck 0; tests 60 (8 wire-compat: bare card valid, each invalid field rejected) |
| Relay | `app-relay` typecheck 0; tests 47 files/324 (25 enrichment: enum map, redaction/secret omission, no usage double-count, fail-closed both ways) |
| Client lights-up | `app-mobile` `card-projection.test.ts` 20 passed — the wire shapes agree |
| Redaction proof | a path/URL/secret and an un-prefixed `sk-` token are omitted; raw text never in the card JSON |
| Negative controls | attention map, redaction gate, and secret reject each fail their test when broken, then restored |
| Independent review | Sonnet-xhigh accepted the enrichment (no P0); its two P1s fixed before commit |
| Evidence commits | `bc76844` (protocol), `444c267` (model/attention), `5ffe38b` (redacted content) |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Three card fields need the external Pi CLI (out of this repo) and are not built: `agent` (no agent label distinct
from the model), `resumable` (no resume-state flag), `queuedMessageCount` (no per-session queue count); `activity`
has no clean per-turn label either. The remaining host-request surface is also unbuilt: the chat RPCs
(`@`-file-search and host STT need the external Pi; a paste-upload lease, read-ack, and pin RPC are
relay-feasible; the typed approval envelope is likely already covered by the existing Review path) and the
presence extensions (attention sub-kind + end-reason, `stateEnteredAt`, `hasMore` page token). One residual
privacy note: the shared safe-display sanitizer's secret detector is prefix-based; the card adds a conservative
un-prefixed-token reject on top, but a general high-entropy secret scanner is a worthwhile follow-up now that
conversational text reaches the card.
<!-- /ANCHOR:limitations -->
