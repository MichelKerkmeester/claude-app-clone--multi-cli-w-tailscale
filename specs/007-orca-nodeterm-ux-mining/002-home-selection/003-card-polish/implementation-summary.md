---
title: "Home card polish implementation summary — PLANNED"
description: "Planned stub for card polish: the ✅ set (relabel + datetime 2.1, stale-decay 1.8, drop resting-done dot 1.7, accordion chrome 2.5) plus the ⚠️ card-content bundle behind an optional-field gate (attention badge 1.6, title/preview/agent 2.2/2.3, recoverable-empty 2.4, accordion body 2.5) and the title-is-a-projection policy note 2.6. Status Planned; implementation deferred until the operator says go. No completion claims. The bundle's host fields are requested in 007-host-requests, never invented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the PLANNED stub with the folded ND card recs, still no code and no gate run."
    next_safe_action: "Implement the ✅ ND set on operator go while ⚠️ fields wait on 007-host-requests."
    blockers:
      - "The ⚠️ card-content bundle (1.6/2.2/2.3/2.4/2.5-body) needs new host read-only fields in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says "go" |
| Requirements planned | REQ-001 … REQ-009 |
| Host dependency | Heavy — the card-content bundle needs new host read-only fields (`007-host-requests`) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing is built yet. The plan splits the card work in two. The **✅ set** ships over existing fields:
relabel "blocks"→"messages" with a real ISO `<time datetime>` and absolute-time-on-tap (2.1), a stale-decay
that dims a running card after 30 min of silence via `updatedAt` without ever writing `status` (1.8), the
dropped resting-done dot reserving a live glyph for attention (1.7), and the peek-before-open accordion
*chrome* (2.5). The **⚠️ card-content bundle** — needs-you attention badge (1.6), human title / last-message
preview / agent chip (2.2/2.3), recoverable-empty preservation (2.4), and the accordion *body* (2.5) — is
wired behind an optional-field gate and requested in `007-host-requests`; each degrades to today's card
until its host field lands. The title-is-a-projection policy note (2.6) frames the request.

The **nodeterm pass folds in** more card recs (deduped against orca). ✅ ship-now over existing fields or
device-local state: a device-local "changed since you looked" dot (ND-3.7), an always-inline detail row that
drops the peek-accordion (ND-3.8, **SUPERSEDES orca 2.5**), a deterministic hue from the opaque `id` (ND-3.9),
a stale-decay retuned to a 20-minute stale/unknown *look* that never writes `status` (ND-1.6/2.1,
**SUPERSEDES orca 1.8**), and two orthogonal card channels — a live RUNNING badge separate from the
read-state glyph (ND-1.7/3.6). ⚠️ new host read-only fields (planned UI + fail-closed fallback, requested in
`007-host-requests`): a context-window fill meter (`contextPercent`, ND-3.1), a live "activity" line
(`activity`+`tool`, ND-3.2), and the "You:" turn-opening line (`prompt`, ND-3.3). ND-3.4 (`title` projection)
and ND-3.5 (`agent`+`model`, model bundled with `contextPercent`) reinforce orca and are NOT re-requested;
ND-3.10 (client-authored labels/priority/assignee) is a backlog exclusion.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The ✅ set will be presentation over existing `SessionCardDto` fields, with the 30-minute stale-decay
isolated in a pure `decayedLook` helper that returns a *look* and never a `status`. The ⚠️ bundle will sit
behind a single optional-field card projection: `title ?? compactId(id)`, preview/agent/attention/hide-empty/
accordion-body each render only when their optional host field is present, so the card is correct on both an
old host (today's card) and a new host (enriched) per the wire-compat "a new optional field is safe" rule.
Verification will run the decay boundary test (no `status` write), the relabel/datetime render test, the
optional-field gate both-ways tests, explicit never-badge-running and no-client-title tests, `token-identity`
(0-diff), `test:web`, and an a11y-parity check — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**One optional-field gate, not five branches.** Every enrichment field is typed optional and read through a
single projection, so the ⚠️ bundle becomes buildable the moment the fields land — only the DTO type widens.

**The attention-badge Inbox-join is not free.** The protocol shows `AttentionItemDto` keys on `lookupId`,
and only `AttentionResolutionDto` maps an item to a `sessionId`; a client-side card↔attention join therefore
needs a host `attention` field on the card or a per-item resolution RPC. Planned decision: read a host
`attention` field when present, no badge otherwise — and never badge a `running` session, enforced in the
projection independent of the field's arrival. The Inbox-`sessionId` question is logged to
`007-host-requests`.

**Never write `status`; never client-slice a title; never cache-synthesize a preview.** Stale-decay is a
look; the `id` stays the fallback title; the accordion body and any preview come from host fields only —
the three fail-closed guardrails that keep the client from owning session truth.

**Keep zero-turn sessions visible until a host flag exists.** Hiding `messageCount === 0` today is lossy
(it drops recoverable sessions), so hide-empty waits on a host `resumable`/`queuedMessageCount` field.

**nodeterm supersedes two orca card recs.** The peek-accordion (orca 2.5) is replaced by an always-inline
detail row — nodeterm removed the expand step, which sidesteps the empty-accordion trap (ND-3.8). The
stale-decay (orca 1.8) is retuned from 30-min→idle to a 20-min→stale/unknown *look*, since a lost agent is
unknown, not idle — still a pure derivation over `updatedAt` that never writes `status` (ND-1.6/2.1). The ND
⚠️ fields (`contextPercent`, `activity`+`tool`, `prompt`) ride the same optional-field gate and join the
`007-host-requests` bundle; ND-3.10's client-authored metadata stays a backlog exclusion.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| `decayedLook` boundary (30-min edge) | Pending — dims a stale running card; asserts no `status` write |
| Relabel / datetime render | Pending — "messages" · valid `<time datetime>` = `updatedAt` · absolute-on-tap |
| Optional-field gate (both ways) | Pending — absent → today's card; present → enriched |
| Never-badge-running / no-client-title | Pending — running never badged; `id` stays the fallback title |
| Token identity | Pending — 0-diff across light/dark/system for the card CSS |
| `test:web` | Pending — green from the final state |
| a11y-parity | Pending — badge / accordion / `<time>` semantics preserved |
| 20-min stale/unknown decay (ND-1.6/2.1) | Pending — decays a running card to unknown; no `status` write |
| ND optional-field gate (contextPercent/activity/prompt/model) | Pending — absent → today's card; present → enriched |
| Always-inline row + two channels (ND-3.8, ND-1.7/3.6) | Pending — no accordion; running never badged unread |
| hueFromId + device-local seen-dot (ND-3.9, ND-3.7) | Pending — deterministic hue; newer `updatedAt` → dot, fail-closed |
| `validate.sh --strict` | Pending — exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This is a planning stub; no code exists and no gate has run. The card-content bundle is the ⚠️-heavy part of
the whole home-selection area: the attention badge (1.6), title/preview/agent (2.2/2.3), recoverable-empty
(2.4), and accordion body (2.5) all need new host read-only fields and stay behind the optional-field gate,
degrading to today's card until `007-host-requests` ships them. The Inbox-`sessionId` assumption is
contradicted by the protocol (`lookupId`-keyed), so the badge is host-`attention`-field-gated rather than a
free join. The ✅ set (2.1, 1.8, 1.7, 2.5-chrome) is blocked on nothing.
<!-- /ANCHOR:limitations -->
