---
title: "Home card polish plan — ship the ✅ presentation set, wire the ⚠️ bundle behind a fail-closed field gate"
description: "How card polish is built and proven: the ✅ set (relabel + datetime, 20-min stale-unknown look, dropped resting-done glyph, always-inline row, hue, seen-dot, two channels) as presentation over existing fields; the ⚠️ card-content bundle behind an optional-field gate that renders the enrichment when the host field is present and degrades to today's card when it is absent. Proven by token-identity 0-diff, test:web green, and a11y-parity."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T19:25:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped always-inline cards with seen-dot, hue mark, and 20-min stale look"
    next_safe_action: "None — phase implemented; gated host fields stay inert until the relay publishes them"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Ship the ✅ presentation set now as pure-helper-backed view changes over existing `SessionCardDto` fields:
relabel + `<time datetime>` + absolute-on-tap (2.1), a 20-minute stale/unknown *look* over `updatedAt` that
never writes `status` (ND-1.6/2.1), the dropped resting-done glyph (1.7), an always-inline detail row
(ND-3.8), hue mark, seen-dot, and two channels. Build the ⚠️ card-content bundle behind a single
OPTIONAL-FIELD GATE: the enrichment renders only when the corresponding host field is present on the DTO,
and degrades to today's card when it is absent. Each field is requested in `007-host-requests`. Prove it
with `token-identity`, `test:web`, and a11y-parity, plus a barrier that no card writes `status` and no card
ever badges a `running` session.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The stale-decay derivation is a pure function, boundary-tested at the 20-minute edge and proven never to
emit a `status` write. The relabel/datetime is proven by render assertions ("messages", a valid `<time
datetime>` equal to `updatedAt`, absolute-on-tap). The optional-field gate is boundary-tested both ways:
field-absent renders today's card (compacted `id` title, no badge, zero-turn sessions still visible, no
inline enrichment), field-present renders the enrichment. A dedicated test asserts NO badge on a
`running` session and NO client-sliced title. `token-identity` resolves 0-diff across light/dark/system for
the card CSS, `test:web` is green, and the card's a11y contract (badge as labelled status, no accordion
region, `<time>` semantics) is preserved — all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**✅ set as presentation over existing fields.** The relabel and datetime are a small change to the card
meta in `screen-home.svelte` plus a datetime/absolute helper beside `relativeTime` in
`shared/format/view-helpers.ts`. Stale-decay is a pure `decayedLook(status, updatedAt, now)` returning a
presentation flag (dimmed/idle) — it reads `updatedAt`, returns a *look*, and is the one place the 30-min
threshold lives; it never returns or writes a `status`. Dropping the resting-done dot is an edit to the
status-glyph rule (`session-state-icon.svelte`) that reserves the live glyph for attention.

**⚠️ bundle behind one optional-field gate.** Rather than five separate branches, the card reads the DTO
through a single projection that treats every enrichment field as optional: `title ?? compactId(id)`,
`preview` renders only when present, `agent` chip only when present, the attention badge only when an
`attention` value is present AND `status !== 'running'`, hide-empty applies only when a `resumable`/
`queuedMessageCount` field is present, and the accordion body renders host `previewMessages[]` only when
present (else inert). Because the fields are optional and read-only, the card is correct on both an old host
(today's card) and a new host (enriched) — matching the host's wire-compat "a new optional field is safe"
rule. The gate is the seam that makes the ⚠️ set buildable the moment the fields land, with only the DTO
type widening changing.

**Attention badge — the join reality.** `AttentionItemDto` keys on `lookupId`, not `sessionId`; a
client-side card↔attention join is therefore not free and needs either a host `attention` field on the
card or a per-item resolution RPC. The plan reads a host `attention` field when present; absent it, no
badge. The `never badge running` rule is enforced in the projection, independent of the field's arrival.

**No client cache as a source of truth.** The accordion body and any preview come from host fields only;
synthesizing them from a client transcript cache is explicitly excluded.

**nodeterm fold-in — always-inline detail row (supersedes the accordion).** nodeterm tried the expand-to-peek
step and removed it: a small card shows an ALWAYS-INLINE detail row (title + activity/preview + context%) and
reserves a single tap for open. This **SUPERSEDES the orca 2.5 peek-accordion** above — it sidesteps the
"empty accordion when the host sends no preview" trap, so the ⚠️ preview/activity render inline behind the
same field gate rather than inside an expandable body (ND-3.8).

**nodeterm fold-in — the extended optional-field gate.** The same optional-field seam widens to the ND ⚠️
fields, each rendering ONLY when its host field is present and degrading to today's card when absent:
`contextPercent` draws the fill meter (else nothing), `activity`+`tool` draws the live "activity" line for a
running card (else the plain working state), `prompt` draws the "You:" turn-opening line (else omitted), and
`model` rides the same usage payload as `contextPercent`, so the model chip comes bundled with the meter.
Each is requested in `007-host-requests`; none is invented on the client (ND-3.1/3.2/3.3/3.5).

**nodeterm fold-in — pure presentation wins, no host field.** Three ✅ additions are pure derivations over
existing fields or device-local state: a deterministic `hueFromId(id)` mark for at-a-glance scanning (ND-3.9);
a device-local "changed since you looked" dot that persists `lastSeenUpdatedAt` and dots a card whose
`updatedAt` is newer, fail-closed to no dot when the store is unreadable (ND-3.7); and a stale-decay retuned
to a 20-minute edge that decays a running card to a stale/unknown *look* — **SUPERSEDES orca 1.8's
30-min→idle**, never writes `status` (ND-1.6/2.1). The live-state RUNNING badge stays a separate channel from
this read-state glyph (ND-1.7/3.6), and a running session is never badged as unread.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Add the pure `decayedLook` helper (1.8) and the datetime/absolute helper (2.1) with boundary tests; define
the optional-field card projection (typed with every enrichment optional) and its both-ways tests. Capture
the `token-identity`/`test:web` baselines.

### Phase 2 · implementation
Apply the ✅ set: relabel + `<time datetime>` + absolute-on-tap (2.1), the dimmed stale-decay look (1.8),
the dropped resting-done dot (1.7), and the peek accordion chrome with a separate Open (2.5). Wire the ⚠️
bundle through the optional-field gate so each enrichment renders when its host field is present and
degrades otherwise (1.6, 2.2, 2.3, 2.4, 2.5-body). Write the title-is-a-projection policy note (2.6). Log
every host field into `007-host-requests`.

### Phase 3 · verification
Run the decay boundary test (30-min edge, no `status` write), the relabel/datetime render test, the
optional-field gate both-ways tests, the never-badge-running and no-client-title tests, `token-identity`,
`test:web`, and the a11y-parity check — all from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

New unit tests for `decayedLook` (boundary at 30 min; proves no `status` write) and the datetime helper.
New render tests for the optional-field gate: with each enrichment field absent (today's card: `id` title,
no badge, zero-turn visible, inert accordion body) and present (enriched). Explicit tests that a `running`
session is never badged and that no title is ever client-sliced. Existing `test:web` proves no card
regression; `token-identity` proves the card's rendered values; the a11y-parity check proves the badge,
accordion, and `<time>` semantics. All run from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The existing `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`) and `session-state-icon.svelte`.
- `007-host-requests` for the card-content bundle: `attention`, `title`, `lastMessagePreview`/
  `previewMessages[]`, `agent`, `queuedMessageCount`/`resumable` — all host-authored, client-read-only.
- The `token-identity` resolver, `test:web`, and the a11y-parity check harness.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change touches `app-mobile/src/pages/home/**`, `shared/chrome/session-state-icon.svelte`, and the cited
`shared/format/**` helpers plus their tests. `git checkout -- app-mobile/src` restores the prior card;
because the ⚠️ bundle is behind an optional-field gate that never wired a client-owned field, there is no
host, data, or migration step to unwind.
<!-- /ANCHOR:rollback -->
