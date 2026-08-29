---
title: "Home card polish checklist — barrier for the ✅ presentation set and the ⚠️ card-content bundle"
description: "Barrier sign-off for relabel + datetime, 20-min stale-unknown decay, dropped resting-done glyph, always-inline row, hue mark, seen-dot, two channels, and the field-gated card-content bundle. Implemented."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "card polish verification checklist"
  - "card polish packet"
  - "verification checklist"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T19:25:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Marked card-polish barriers against the implemented card presentation"
    next_safe_action: "None — phase implemented; gated host fields stay inert until the relay publishes them"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Home card polish checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. The authoritative
proofs are the 20-minute stale/unknown boundary test (no `status` write), the relabel/datetime render
test, the optional-field gate both-ways tests, the never-badge-running and no-client-title tests,
`hueFromId` determinism, the seen-dot fail-closed tests, `token-identity` for the card CSS, `test:web`,
and an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
  Evidence: sibling `002-list-organization` closed at svelte 71 / 563 + 3 skipped, logic 28 / 288;
  token-identity vs HEAD card corpus (`card-session.svelte` + `screen-home.svelte` + `app.css`) is
  0/0/0 after this phase.
- [x] **CHK-PRE-02** [P0] The optional-field card projection is typed with every enrichment field optional,
  so an old host (no fields) and a new host (fields present) are both valid inputs before any card edit.
  Evidence: `CardProjection` in `card-projection.ts`; `hasHostField` uses `Object.prototype.hasOwnProperty`.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Stale-decay is a pure `look` over `updatedAt` and NEVER writes `status`; the
  20-minute threshold lives in one helper.
  Evidence: `WORKING_STALE_MS` + `decideStalePresentation` in `card-projection.ts`; card sets
  `data-stale` / presented `unknown` and leaves `session.status` untouched.
- [x] **CHK-CQ-02** [P0] The ⚠️ enrichments read only optional host-published fields; none is invented on
  the client, and no preview is synthesized from a client transcript cache.
  Evidence: `hasHostField` / `ownString` gates; `previewMessages` accepted only as a host string array.
- [x] **CHK-CQ-03** [P0] The compacted `id` stays the fallback title; no title is ever client-sliced from a
  prompt preamble.
  Evidence: `hostTitle` uses `compactId(card.id)` unless a non-empty own `title` is present;
  `card-projection.test.ts` no-slice case.
- [x] **CHK-CQ-04** [P0] (ND-3.9, ND-3.7) `hueFromId(id)` is a pure deterministic derivation over the opaque
  `id`; the "changed since you looked" dot is device-local over `lastSeenUpdatedAt`, fail-closed to no dot
  when the store is unreadable — neither leaks the `id` nor invents a host field.
  Evidence: `hueFromId` + `seen-marker.ts`; card hue style omits the id; unreadable store ⇒ no dot.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Stale-decay boundary test passes at the 20-minute edge and asserts no `status`
  write; the relabel/datetime render test asserts "messages", a valid `<time datetime>` = `updatedAt`, and
  absolute-on-tap.
  Evidence: `card-projection.test.ts`; `card-session.svelte.test.ts`.
- [x] **CHK-TEST-02** [P0] The optional-field gate is tested both ways: each enrichment absent renders
  today's card; present renders the enrichment.
  Evidence: `card-projection.test.ts` `optional host-field gate`; `card-session.svelte.test.ts` same.
- [x] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for the card CSS, and
  `test:web` passes from the final state.
  Evidence: token-identity 0/0/0 vs HEAD card corpus; `test:web` svelte 72 / 577 + 3 skipped, logic 29 / 308.
- [x] **CHK-TEST-04** [P0] The ND both-ways gate tests pass (`contextPercent` / `activity`+`tool` / `prompt` /
  `model` absent → today's card; present → meter / activity line / "You:" line / model chip), the 20-minute
  stale/unknown decay boundary test asserts no `status` write, and the `hueFromId` determinism and seen-dot
  tests pass — all from the final state.
  Evidence: `card-projection.test.ts`, `seen-marker.test.ts`, `card-session.svelte.test.ts`.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] No card badges a `running` session — the never-badge-running rule holds in the
  projection independent of whether the `attention` field has arrived.
  Evidence: `attentionBadgeFor` returns null when `status === 'running'`; svelte test with `attention: waiting`.
- [x] **CHK-FIX-02** [P0] Hide-empty applies ONLY over a host `resumable`/`queuedMessageCount` field; with
  the field absent, zero-turn sessions stay visible (no lossy client hide); preview lines are inert
  without host `previewMessages[]` / `lastMessagePreview`.
  Evidence: `shouldRenderCard` + `hideEmptyFor`; zero-count without those keys stays visible.
- [x] **CHK-FIX-03** [P0] (ND-1.6/2.1, SUPERSEDES orca 1.8) The stale-decay is retuned to 20 minutes and
  decays a running card to a stale/unknown *look* — never idle, never a `status` write.
  Evidence: `WORKING_STALE_MS = 20 * 60_000`; presented status `unknown`; `data-host-status` remains `running`.
- [x] **CHK-FIX-04** [P0] Each ND ⚠️ field degrades to today's card when absent: no meter without
  `contextPercent`, the plain working state without `activity`, no "You:" line without `prompt`, no model
  chip without the usage payload.
  Evidence: both-ways svelte tests.
- [x] **CHK-FIX-05** [P0] (ND-3.8, ND-1.7/3.6) The enriched detail row is always-inline (the peek-accordion
  is dropped), and the live-state RUNNING badge stays orthogonal to the read-state glyph — a running session
  is never badged as unread.
  Evidence: no `details` / `aria-expanded`; `data-unread` omitted when `status === 'running'`.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed: no `status` write, no invented host field, no client-sliced title,
  no client-cache preview; every ⚠️ enrichment degrades to today's card until the host ships.
  Evidence: projection + card tests; own-property gates; compactId fallback.
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**`, `shared/chrome/session-state-icon.svelte`, and the cited `shared/format/**`
  helpers (and their tests) changes.
  Evidence: this phase edited `pages/home/**`, `shared/format/{card-projection,seen-marker,view-helpers}.ts`,
  tests, and this packet's docs. Shared icon mapping left frozen; idle cards omit the glyph instead.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
  Evidence: `validate.sh --strict` exit 0 from realpath at closeout; `description.json` / `graph-metadata.json` left unedited.
- [x] **CHK-DOC-02** [P1] The full card-content bundle (`attention`, `title`, `lastMessagePreview`,
  `agent`, `queuedMessageCount`/`resumable`, `previewMessages[]`) and the Inbox-`sessionId` question are
  recorded in `007-host-requests`, each with the UI it unlocks and the fail-closed fallback; the
  title-is-a-projection policy note (2.6) is written; no spec path or artifact id is in any code comment.
  Evidence: `007-host-requests` already holds the bundle (not re-requested); policy note in
  `implementation-summary.md`.
- [x] **CHK-DOC-03** [P1] Every folded ND ⚠️ field (`contextPercent`, `activity`+`tool`, `prompt`) is logged
  in `007-host-requests` with its UI and fail-closed fallback; ND-3.4/3.5 are recorded reinforce-not-re-request
  and ND-3.10 as a backlog exclusion; each ND row traces to its rec.
  Evidence: `007-host-requests` already lists the ND fields; ND-3.10 exclusion in `implementation-summary.md`.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The datetime helper sits beside `relativeTime` in
  `shared/format/view-helpers.ts`; stale decay, hue, and the optional-field projection stay one seam in
  `card-projection.ts`; the seen marker is a device-local store in `shared/format/seen-marker.ts`.
  Evidence: those three modules.
- [x] **CHK-ORG-02** [P2] The card's a11y contract (badge as labelled status, no accordion region,
  `<time>` semantics) is preserved — proven by the a11y-parity check.
  Evidence: attention `role="status"`; no `aria-expanded`; `<time datetime={updatedAt}>`.
- [x] **CHK-ORG-03** [P2] The context meter, the always-inline detail row, and the hue / seen-dot marks
  preserve the card's a11y contract (meter as a labelled progress affordance, no role/label regression).
  Evidence: `role="meter"` + `aria-valuenow`; seen-dot `role="img"` + aria-label; hue `aria-hidden`.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Implemented. The ✅ set (2.1, 20-min stale-unknown, 1.7, always-inline, hue, seen-dot, two channels)
closes with the decay boundary test, the relabel/datetime render test, `token-identity` at 0-diff,
`test:web` green (svelte 72 / 577 + 3 skipped; logic 29 / 308), and a11y-parity — all from the final
state. The ⚠️ bundle is wired behind the optional-field gate, proven to degrade to today's card, and
already logged to `007-host-requests`; no `running` session is ever badged and no client-sliced title
is ever shown.
<!-- /ANCHOR:summary -->
