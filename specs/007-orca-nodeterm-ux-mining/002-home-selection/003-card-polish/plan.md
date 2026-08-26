---
title: "Home card polish plan — ship the ✅ presentation set, wire the ⚠️ bundle behind a fail-closed field gate"
description: "How card polish is built and proven: the ✅ set (relabel + datetime 2.1, stale-decay 1.8, drop resting-done dot 1.7, accordion chrome 2.5) as presentation over existing fields with pure decay/format helpers; the ⚠️ card-content bundle (attention badge 1.6, title/preview/agent 2.2/2.3, recoverable-empty 2.4, accordion body 2.5) built behind an optional-field gate that renders the enrichment when the host field is present and degrades to today's card when it is absent — each field requested in 007-host-requests. Proven by token-identity 0-diff, test:web green, and a11y-parity, with a barrier that the card never writes status and never badges a running session."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned ✅ presentation set + an optional-field gate for the ⚠️ card-content bundle."
    next_safe_action: "Build the relabel/datetime/decay/dot ✅ set with pure helpers when the operator says go."
    blockers:
      - "The ⚠️ bundle (1.6/2.2/2.3/2.4/2.5-body) renders only once host fields land via 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Ship the ✅ presentation set now as pure-helper-backed view changes over existing `SessionCardDto` fields:
relabel + `<time datetime>` + absolute-on-tap (2.1), a pure stale-decay *look* over `updatedAt` that never
writes `status` (1.8), the dropped resting-done dot (1.7), and the peek accordion chrome (2.5). Build the
⚠️ card-content bundle behind a single OPTIONAL-FIELD GATE: the enrichment (attention badge, title,
preview, agent chip, recoverable-empty, accordion body) renders only when the corresponding host field is
present on the DTO, and degrades to today's card when it is absent. Each field is requested in
`007-host-requests`. Prove it with `token-identity`, `test:web`, and a11y-parity, plus a barrier that no
card writes `status` and no card ever badges a `running` session.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The stale-decay derivation is a pure function, boundary-tested at the 30-minute edge and proven never to
emit a `status` write. The relabel/datetime is proven by render assertions ("messages", a valid `<time
datetime>` equal to `updatedAt`, absolute-on-tap). The optional-field gate is boundary-tested both ways:
field-absent renders today's card (compacted `id` title, no badge, zero-turn sessions still visible,
inert/empty accordion body), field-present renders the enrichment. A dedicated test asserts NO badge on a
`running` session and NO client-sliced title. `token-identity` resolves 0-diff across light/dark/system for
the card CSS, `test:web` is green, and the card's a11y contract (badge as labelled status, accordion as an
expandable region, `<time>` semantics) is preserved — all from the final state.
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
