---
title: "Home card polish checklist — barrier for the ✅ presentation set and the ⚠️ card-content bundle"
description: "Barrier sign-off for relabel + datetime, stale-decay, drop resting-done dot, accordion chrome, and the field-gated card-content bundle: fail-closed (never write status, never badge a running session, never client-slice a title, no client-cache preview), optional-field gate proven both ways, token-identity 0-diff, test:web green, and a11y-parity. Every barrier open — nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added ND barriers: fail-closed ⚠️ fields, 20-min no-status decay, traceability."
    next_safe_action: "Fill each ND barrier with evidence during implementation on operator go."
    blockers:
      - "The ⚠️ bundle barriers (1.6/2.2/2.3/2.4/2.5-body) stay open pending host fields in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Every barrier is OPEN —
no implementation exists yet. The authoritative proofs are the `decayedLook` boundary test (no `status`
write), the relabel/datetime render test, the optional-field gate both-ways tests, the never-badge-running
and no-client-title tests, `token-identity` for the card CSS, `test:web`, and an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
- [ ] **CHK-PRE-02** [P0] The optional-field card projection is typed with every enrichment field optional,
  so an old host (no fields) and a new host (fields present) are both valid inputs before any card edit.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] Stale-decay is a pure `look` over `updatedAt` and NEVER writes `status`; the
  30-minute threshold lives in one helper.
- [ ] **CHK-CQ-02** [P0] The ⚠️ enrichments read only optional host-published fields; none is invented on
  the client, and no preview is synthesized from a client transcript cache.
- [ ] **CHK-CQ-03** [P0] The compacted `id` stays the fallback title; no title is ever client-sliced from a
  prompt preamble.
- [ ] **CHK-CQ-04** [P0] (ND-3.9, ND-3.7) `hueFromId(id)` is a pure deterministic derivation over the opaque
  `id`; the "changed since you looked" dot is device-local over `lastSeenUpdatedAt`, fail-closed to no dot
  when the store is unreadable — neither leaks the `id` nor invents a host field.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] `decayedLook` boundary test passes at the 30-minute edge and asserts no `status`
  write; the relabel/datetime render test asserts "messages", a valid `<time datetime>` = `updatedAt`, and
  absolute-on-tap.
- [ ] **CHK-TEST-02** [P0] The optional-field gate is tested both ways: each enrichment absent renders
  today's card; present renders the enrichment.
- [ ] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for the card CSS, and
  `test:web` passes from the final state.
- [ ] **CHK-TEST-04** [P0] The ND both-ways gate tests pass (`contextPercent` / `activity`+`tool` / `prompt` /
  `model` absent → today's card; present → meter / activity line / "You:" line / model chip), the 20-minute
  stale/unknown decay boundary test asserts no `status` write, and the `hueFromId` determinism and seen-dot
  tests pass — all from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] No card badges a `running` session — the never-badge-running rule holds in the
  projection independent of whether the `attention` field has arrived.
- [ ] **CHK-FIX-02** [P0] Hide-empty applies ONLY over a host `resumable`/`queuedMessageCount` field; with
  the field absent, zero-turn sessions stay visible (no lossy client hide); the accordion body is inert
  without host `previewMessages[]`.
- [ ] **CHK-FIX-03** [P0] (ND-1.6/2.1, SUPERSEDES orca 1.8) The stale-decay is retuned to 20 minutes and
  decays a running card to a stale/unknown *look* — never idle, never a `status` write.
- [ ] **CHK-FIX-04** [P0] Each ND ⚠️ field degrades to today's card when absent: no meter without
  `contextPercent`, the plain working state without `activity`, no "You:" line without `prompt`, no model
  chip without the usage payload.
- [ ] **CHK-FIX-05** [P0] (ND-3.8, ND-1.7/3.6) The enriched detail row is always-inline (the peek-accordion
  is dropped), and the live-state RUNNING badge stays orthogonal to the read-state glyph — a running session
  is never badged as unread.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed: no `status` write, no invented host field, no client-sliced title,
  no client-cache preview; every ⚠️ enrichment degrades to today's card until the host ships.
- [ ] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**`, `shared/chrome/session-state-icon.svelte`, and the cited `shared/format/**`
  helpers (and their tests) changes.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
- [ ] **CHK-DOC-02** [P1] The full card-content bundle (`attention`, `title`, `lastMessagePreview`,
  `agent`, `queuedMessageCount`/`resumable`, `previewMessages[]`) and the Inbox-`sessionId` question are
  recorded in `007-host-requests`, each with the UI it unlocks and the fail-closed fallback; the
  title-is-a-projection policy note (2.6) is written; no spec path or artifact id is in any code comment.
- [ ] **CHK-DOC-03** [P1] Every folded ND ⚠️ field (`contextPercent`, `activity`+`tool`, `prompt`) is logged
  in `007-host-requests` with its UI and fail-closed fallback; ND-3.4/3.5 are recorded reinforce-not-re-request
  and ND-3.10 as a backlog exclusion; each ND row traces to its rec.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] The `decayedLook` and datetime helpers sit beside `relativeTime` in
  `shared/format/view-helpers.ts`; the optional-field projection stays a single seam, not scattered branches.
- [ ] **CHK-ORG-02** [P2] The card's a11y contract (badge as labelled status, accordion as an expandable
  region, `<time>` semantics) is preserved — proven by the a11y-parity check.
- [ ] **CHK-ORG-03** [P2] The context meter, the always-inline detail row, and the hue / seen-dot marks
  preserve the card's a11y contract (meter as a labelled progress affordance, no role/label regression) —
  proven by the a11y-parity check.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned, not yet verified. When implemented, the ✅ set (2.1, 1.8, 1.7, 2.5-chrome) closes with the decay
boundary test, the relabel/datetime render test, `token-identity` at 0-diff, `test:web` green, and
a11y-parity — all from the final state. The ⚠️ bundle (1.6, 2.2, 2.3, 2.4, 2.5-body) is wired behind the
optional-field gate, proven to degrade to today's card, and logged to `007-host-requests`; no `running`
session is ever badged and no client-sliced title is ever shown.
<!-- /ANCHOR:summary -->
