---
title: "Home card polish — relabel + datetime, stale-decay, drop resting-done dot, peek accordion, and the ⚠️ card-content bundle"
description: "Plan the per-card presentation and content from the verified orca synthesis. The ✅ set ships now: relabel 'blocks'→'messages' + a real ISO datetime + absolute-time-on-tap (2.1), stale-decay a running card to a dimmed/idle look after 30 min via updatedAt without ever writing status (1.8), drop the resting-done dot reserving a live glyph for attention (1.7), and the peek-before-open accordion chrome (2.5 chrome). The ⚠️ card-content bundle is planned UI-plus-fallback and requested in 007-host-requests: the needs-you attention badge (1.6), human title / last-message preview / agent chip (2.2), host-derived titles never client-sliced (2.3), recoverable-empty preservation (2.4), and the accordion body (2.5 body). The title-is-a-projection policy note (2.6) frames the request. Fail-closed throughout; proven by token-identity 0-diff, test:web green, and a11y-parity. Plan only."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned card polish: ✅ relabel/decay/dot/accordion-chrome + ⚠️ card-content bundle."
    next_safe_action: "Implement the ✅ set; the ⚠️ bundle waits on host fields in 007-host-requests."
    blockers:
      - "Attention badge (1.6), title/preview/agent (2.2), host titles (2.3), recoverable-empty (2.4), accordion body (2.5) need new host read-only fields — requested in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Siblings: `001-list-behavior`, `002-list-organization`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says "go" |
| Recs ✅ | 2.1 relabel + datetime · 1.8 stale-decay · 1.7 drop resting-done dot · 2.5 accordion chrome |
| Recs ⚠️ | 1.6 attention badge · 2.2 title/preview/agent · 2.3 host titles · 2.4 recoverable-empty · 2.5 accordion body |
| Recs (policy) | 2.6 title-is-a-projection |
| Host dependency | Heavy — the card-content bundle needs new host read-only fields (`007-host-requests`) |
| Barrier | relabel/decay/dot/accordion behaviour proven · never writes status · never badges running · no client-invented title · token-identity 0-diff · test:web green · a11y-parity |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The home card (`pages/home/screen-home.svelte`) shows the compacted opaque `id` as its title, the raw word
"blocks" for `messageCount`, and a coarse `relativeTime(updatedAt)` with no machine datetime. There is no
attention signal, no way to tell a crashed "running" card from a live one, no preview, no peek. The
verified orca synthesis (Angle 2, plus 1.6–1.8) closes these — but the card is a *host-scanned projection*
in orca, and most of the enrichments need host fields our `SessionCardDto` (`id`, `status`, `updatedAt`,
`messageCount`) does not carry.

This sub-phase splits cleanly. The **✅ set** is cheap and ships now: relabel "blocks"→"messages" and add a
real ISO `datetime` with absolute-time-on-tap (2.1); stale-decay a "running" card to a dimmed/idle look
after 30 min of silence via `updatedAt`, without ever writing `status` (1.8); drop the resting-"done" dot,
reserving a live glyph for genuine attention (1.7); and the peek-before-open accordion *chrome* (2.5).

The **⚠️ card-content bundle** is planned here as UI-plus-fail-closed-fallback and requested in
`007-host-requests`: the needs-you attention badge (1.6), the human title / last-message preview / agent
chip (2.2), host-derived titles that are never client-sliced (2.3), recoverable-empty preservation (2.4),
and the accordion *body* (2.5). None invents a field on the client; each degrades to the current card until
the field lands. The title-is-a-projection policy note (2.6) frames why a redacted host `title` survives
the "opaque ids only" home rule.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — ✅ (ships now):**
- **2.1 Relabel + datetime.** Change the card meta "blocks" → "messages"; render the time inside a
  `<time datetime=...>` with the ISO `updatedAt`; reveal the absolute timestamp on tap. Reads existing
  `messageCount`/`updatedAt`. `pages/home/screen-home.svelte`; the datetime/absolute helper sits beside
  `relativeTime` in `shared/format/view-helpers.ts`.
- **1.8 Stale-decay.** When `status === 'running'` and `now − updatedAt > 30 min`, render the card with a
  dimmed/idle *look* — a pure presentation derivation over `updatedAt`. It NEVER writes `status`; it pairs
  with the existing Live/Stale freshness readout. `pages/home/screen-home.svelte` + a pure decay helper.
- **1.7 Drop resting-done dot.** Remove the resting glyph for settled/done sessions; reserve a live glyph
  for genuine attention (which arrives with 1.6). Presentation over the existing status pill in
  `pages/home/screen-home.svelte` / `shared/chrome/session-state-icon.svelte`.
- **2.5 Peek accordion — chrome only.** An expand-in-place accordion with a separate Open control and
  `stopPropagation` so peek does not navigate. The chrome (toggle, region, Open split) is ✅.

**In scope — ⚠️ (planned UI + fail-closed fallback; host field requested in `007-host-requests`):**
- **1.6 Needs-you attention badge.** Badge a card that needs the user — orca unread = `done | blocked |
  waiting`, **never `working`**. Needs a host `attention` field on the card, OR an Inbox-join *only if the
  Inbox item carries a `sessionId`* — which it does NOT today (`AttentionItemDto` keys on `lookupId`, and
  only `AttentionResolutionDto` maps an item to `sessionId`), so the join is not free. Fail-closed
  fallback: no badge when attention is unknown; never badge a `running` card.
- **2.2 Title / preview / agent chip.** Needs host `title`, `lastMessagePreview`/`previewMessages[]`,
  `agent`. Fail-closed fallback: the compacted `id` stays the title; no preview/chip render until the
  fields land.
- **2.3 Host-derived titles.** Titles must come from the host (conversation name / task preview), never be
  client-sliced from a prompt preamble. Informs the 2.2 request; a client-side title is ❌.
- **2.4 Recoverable-empty preservation.** Faithful hide-empty needs a host `queuedMessageCount` /
  `subagentTranscriptCount` / `resumable` flag. Fail-closed fallback: keep showing zero-turn sessions (the
  current behaviour), because hiding `messageCount === 0` is lossy.
- **2.5 Accordion body.** The peek body needs host `previewMessages[]`. Fail-closed fallback: an empty
  accordion / disabled peek — do NOT synthesize previews from a client transcript cache (a second source
  of truth).

**In scope — policy:**
- **2.6 Title-is-a-projection policy note.** A documented note: the `id` stays opaque; a redacted host
  `title`/`projectLabel` is a *projection*, not an id, and survives the "opaque ids, no paths" home rule;
  raw `cwd` on home would violate it. No code — it frames the `007-host-requests` bundle.

**Out of scope:** any list-behaviour rec (→ `001`); any sectioning/filter/search/favorite chrome (→ `002`);
inventing any host field on the client; writing `status`; every file outside `app-mobile/src/pages/home/**`,
`shared/chrome/session-state-icon.svelte`, and the cited `shared/format/**` helpers.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** (2.1) — The card meta reads "messages" (not "blocks"); the time renders in a `<time
  datetime>` with the ISO `updatedAt` and reveals the absolute timestamp on tap.
- **REQ-002** (1.8) — A `running` card older than 30 min renders a dimmed/idle *look* derived purely from
  `updatedAt`; no code path writes `status`.
- **REQ-003** (1.7) — The resting-done glyph is removed; a live glyph is reserved for genuine attention
  (delivered by 1.6 when its field lands).
- **REQ-004** (2.5 chrome) — The peek accordion expands in place with a separate Open control and
  `stopPropagation`; with no host preview the body is empty/disabled and never synthesizes previews from a
  client cache.
- **REQ-005** (1.6, ⚠️) — When a host `attention` field (or a verified Inbox `sessionId` join) exists, the
  card badges `done | blocked | waiting` and NEVER `working`. Until then, no badge renders. Requested in
  `007-host-requests`.
- **REQ-006** (2.2/2.3, ⚠️) — When host `title`/`lastMessagePreview`/`agent` exist, the card shows a human
  title, preview line, and agent chip; the `id` stays a *fallback*, never overwritten by a client-sliced
  title. Until then, the compacted `id` is the title. Requested in `007-host-requests`.
- **REQ-007** (2.4, ⚠️) — Hide-empty is applied ONLY over a host `queuedMessageCount`/`resumable` flag;
  until then zero-turn sessions stay visible (no lossy client hide). Requested in `007-host-requests`.
- **REQ-008** (2.6) — A policy note records that a redacted host `title` is a projection (not an id) and is
  compatible with the "opaque ids only" home rule; raw `cwd` is not.
- **REQ-009** — `token-identity` resolves 0-diff, `test:web` stays green, and the card's a11y contract
  (the badge as a labelled status, the accordion as an expandable region, the `<time>` semantics) is
  preserved from the final state.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The card reads "messages" with a real `<time datetime>` and absolute-on-tap; a stale running card dims
   without any `status` write; the resting-done dot is gone.
2. The peek accordion chrome expands in place with a separate Open; with no host preview the body is inert
   and no client-cache preview is synthesized.
3. Every ⚠️ item (1.6, 2.2, 2.3, 2.4, 2.5-body) is planned with a fail-closed fallback and logged to
   `007-host-requests`; the card degrades to today's card until the fields land.
4. No card ever badges a `running` session; no client-invented title is ever shown.
5. `token-identity` is 0-diff, `test:web` is green, and a11y-parity holds from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The Inbox-join for the attention badge is not free.** The research *inferred* the Inbox might carry a
  `sessionId`; the protocol shows `AttentionItemDto` keys on `lookupId`, and only `AttentionResolutionDto`
  maps an item to a `sessionId` (via a resolve step) — so a client-side card↔attention join needs either a
  new host `attention` field on the card or a resolution RPC per item. Both are `007-host-requests` items;
  the fail-closed fallback is no badge. **Never badge a `running` session** regardless.
- **Client-sliced titles.** Deriving a title from a prompt preamble is ❌ — it violates fail-closed and the
  "opaque ids only" rule. The `id` stays the fallback title; the human title is host-only.
- **Lossy hide-empty.** Hiding `messageCount === 0` today silently drops recoverable zero-turn sessions
  (queued prompts / subagent transcripts). Fail-closed fallback: keep them visible until a host
  `queuedMessageCount`/`resumable` flag exists.
- **Accordion body from a client cache.** Synthesizing peek previews from a client transcript cache creates
  a second source of truth that can disagree with the host. Fail-closed fallback: empty/disabled body until
  host `previewMessages[]`.
- **Stale-decay must not write status.** The decay is a *look* over `updatedAt`; flipping a local `status`
  store would make the client own session truth. It never does.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- **Does our Inbox payload map to `sessionId` without a resolve RPC?** The protocol says no (`lookupId`
  only on `AttentionItemDto`). Confirm before choosing the Inbox-join over a host `attention` field —
  tracked in `007-host-requests`. Until confirmed, the badge is host-`attention`-field-gated.
- Does the accordion peek stay collapsed by default with a single-open policy, or allow multiple open?
  Assumed single-open to keep the roster scannable, pending the operator.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the home-selection phase parent.
- `../../research/research.md` — the verified synthesis; recs 1.6, 1.7, 1.8 (Angle 1) and 2.1–2.6 (Angle 2).
- `../../007-host-requests/` — the card-content bundle (`title`, `lastMessagePreview`, `agent`,
  `attention`, `queuedMessageCount`, `previewMessages[]`) and the Inbox-`sessionId` question.
- `plan.md`, `tasks.md`, `checklist.md` — the how, the ledger, and the barrier.
<!-- /ANCHOR:cross-refs -->
