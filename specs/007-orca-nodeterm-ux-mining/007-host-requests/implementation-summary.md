---
title: "Phase 7 implementation summary — host protocol request spec (PLANNED)"
description: "Planned stub for the ⚠️ host-request spec: it will deliver the minimum home-card bundle (title, lastMessagePreview, agent, attention), the optional/product-gated fields, and the chat RPCs as a cross-team request, each with a wire shape, its consuming-phase UI, a fail-closed fallback, and a wire-compat note grounded in the real pi-rpc-protocol guards. Open Question #1 is answered from the protocol (the Inbox item carries no sessionId). Implementation deferred until the operator says go; this phase writes no client code."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned stub written; request-spec scope + Open-Q#1 resolution recorded; nothing built."
    next_safe_action: "On operator go, hand the request to the relay team; build in the consuming phases."
    blockers:
      - "Host dependency: every requested field/RPC is relay-authored; this phase implements nothing."
    completion_pct: 0
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
| Status | Planned — implementation deferred until the operator says go |
| Requirements planned | REQ-001 … REQ-005 (none shipped) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing is built yet. When authored, this phase will deliver the ⚠️ "Needs host support" set from
`../research/research.md` as a buildable cross-team request to the relay/host team:

- **Minimum home-card bundle** (extends `SessionCardDto`, `packages/pi-rpc-protocol/src/types.ts:428`):
  `title`, `lastMessagePreview`, `agent` (+ optional `model`), `attention` (`none|blocked|waiting|completed`,
  unread ≠ working). [recs 2.2, 2.3, 1.6]
- **Optional / product-gated:** `queuedMessageCount`/`subagentTranscriptCount` or `resumable`; redacted
  `projectLabel`/`cwd`/`branch`; `pinned` + a pin RPC; capped `previewMessages[]`; `hasMore`/page token.
  [recs 2.4, 1.3, 1.4, 2.6, 1.14, 6.4]
- **Chat RPCs:** `@`-file-search, image-paste upload lease, host-backed dictation/STT, a typed approval
  envelope (only if the Review ticket doesn't already cover it). [recs 4.2, 4.5, 4.6, 5.6]

Each entry will carry a wire shape, the exact UI it unlocks and its consuming phase, the fail-closed fallback,
and the wire-compat note. This phase writes no client code — the UI is built later in the consuming phases.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The request will be authored as three tables (card bundle, optional fields, chat RPCs), each row a four-facet
contract, grounded in the real current shapes so the host can diff against them directly: `SessionCardDto`
(`types.ts:428`), `AttentionItemDto`/`AttentionClass` (`types.ts:1068,1054`), and the guard strictness
(`isSessionCardDto` permissive at `guards.ts:1244` vs `isAttentionItemDto` strict `hasOnlyKeys` at
`guards.ts:364`). Each fail-closed fallback will equal the client's current behaviour, so a field's absence is
un-enriched, never broken. The request will then be handed to the relay team; when a field ships, its named
consuming phase (`002-home-selection`, `003-chat-message`, `004-composer`, `005-streaming-ask`) builds and
verifies the UI under its own `token-identity`/`test:web`/a11y gates.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Request `attention` on `SessionCardDto`, not `sessionId` on the Inbox item.** Open Question #1 is answered
against our own protocol: `AttentionItemDto = { lookupId, attentionClass, generation, nonce, occurredAt }`
(`types.ts:1068`) carries no `sessionId` — that field appears only on `AttentionResolutionDto` (`types.ts:1076`)
after a per-item open. So the "attention badge as a free view-join" path is unavailable. Of the two host fixes,
adding `attention` to `SessionCardDto` is additive-safe under the permissive `isSessionCardDto` guard, whereas
adding `sessionId` to `AttentionItemDto` would break the strict `hasOnlyKeys` guard for every un-updated
client. The card field wins. This is MUST-CONFIRM-FIRST with the operator before the host commits.

**Reconcile the attention taxonomy.** The host's existing `AttentionClass` is `'needs_input' | 'finished' |
'error'` (three values, no `working`), while the requested card enum is `none|blocked|waiting|completed`. The
request will state the mapping (or ask the host to widen `AttentionClass`) so no state is silently dropped; the
"never badge a running session" rule holds because no `working` value exists.

**Request only a redacted `projectLabel`, gated on product.** Home enforces "opaque identifiers only, no
paths" (`app-mobile/src/pages/home/screen-home.svelte:86`); a raw `cwd` is ❌. Whether product lifts the ban
for a redacted label is Open Question #2 and gates recs 1.3/1.4/2.6.

**Likely no new approval envelope.** The protocol already carries approval types (`ApprovalResultStatus`,
`status: 'pending'`, `types.ts:1013,1019`) and a Review surface exists — so rec 5.6's envelope is probably
already covered; the request marks it confirm-then-drop rather than a new field.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| Four-facet coverage | Every field/RPC (T2.1–T2.13) has shape + consuming phase + fail-closed fallback + wire-compat — pending author |
| Traceability | Every entry cites a rec number and names a consuming phase — pending author |
| Fail-closed coverage | Every field's absent-behaviour equals current client behaviour — pending author |
| Open Question #1 | Answered from `pi-rpc-protocol` (`types.ts:1068,1076`, `guards.ts:364,396`) — recorded |
| No client code touched | `git status` shows changes only under this phase folder — to confirm at close |
| `validate.sh --strict` | exit 0 via realpath — to run at close |
| `token-identity` / `test:web` / a11y | N/A here; inherited by the consuming phases when the fields ship |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Every item here is blocked on the relay: the request is buildable the moment the host ships a field, but not
before, and the consuming phases stay on their fail-closed fallbacks until then. Three items carry residual
uncertainty for the operator/host: the redacted-`projectLabel` product rule (Open Q#2), whether a paste-upload
lease and `@`-search already exist on the Pi relay given the composer's existing photo-attachment path (Open
Q#3), and the final attention taxonomy (map the card enum onto `AttentionClass`, or widen it). This phase
implements no client code and makes no completion claim; it hands the relay team a precise contract and waits
for the operator's go.
<!-- /ANCHOR:limitations -->
