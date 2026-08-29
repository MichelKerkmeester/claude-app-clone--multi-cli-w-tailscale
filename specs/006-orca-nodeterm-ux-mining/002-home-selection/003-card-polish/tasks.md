---
title: "Home card polish tasks — ✅ presentation set + ⚠️ card-content bundle behind a field gate, implemented"
description: "Task ledger for card polish: relabel + datetime, 20-min stale-unknown look, dropped resting-done glyph, always-inline row, hue mark, seen-dot, two channels; ⚠️ enrichments wired behind an optional-field gate. Implemented."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "card polish task ledger"
  - "card polish packet"
  - "task ledger"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T19:25:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped always-inline cards with seen-dot, hue mark, and 20-min stale look"
    next_safe_action: "None — phase implemented; gated host fields stay inert until the relay publishes them"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. ✅ presentation and the ⚠️
optional-field gate are implemented. Accordion chrome and 30-min idle decay stay superseded.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [~] **T1.1** (rec 1.8) Add a pure `decayedLook(status, updatedAt, now)` returning a dimmed/idle
  presentation flag when `status === 'running'` and `now − updatedAt > 30 min` — SUPERSEDED by T1.6
  (`decideStalePresentation` at 20 min → stale-unknown, never idle).
- [x] **T1.2** (rec 2.1) Add a datetime/absolute-time helper (ISO `datetime` + absolute-on-tap string)
  beside `relativeTime` — `shared/format/view-helpers.ts` `absoluteTimeLabel`. Proof: `view-helpers.test.ts`.
- [x] **T1.3** (recs 1.6, 2.2, 2.3, 2.4, 2.5-body) Define the optional-field card projection — every
  enrichment field typed optional — with both-ways render tests. Proof: `card-projection.test.ts` +
  `card-session.svelte.test.ts`.
- [x] **T1.4** (rec ND-3.9) Add a pure `hueFromId(id)` deriving a stable hue from the opaque `id` —
  `shared/format/card-projection.ts`. Proof: `card-projection.test.ts` determinism + no id leak.
- [x] **T1.5** (rec ND-3.7) Add a device-local seen-marker: persist per-session `lastSeenUpdatedAt`,
  fail-closed (unreadable store ⇒ no dot) — `shared/format/seen-marker.ts`. Proof: `seen-marker.test.ts`.
- [x] **T1.6** (recs ND-1.6, ND-2.1) Stale-decay helper at a 20-minute edge returning a stale/unknown
  *look*, never a `status` — `decideStalePresentation` in `shared/format/card-projection.ts`. Proof:
  `card-projection.test.ts` 20-min boundary + no status write. SUPERSEDES T1.1.
- [x] **T1.7** (recs ND-3.1, ND-3.2, ND-3.3, ND-3.5) Extend the optional-field card projection with
  `contextPercent`, `activity`+`tool`, `prompt`, and `model` — each own-property gated. Proof:
  `card-projection.test.ts` both-ways suite.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** (rec 2.1) Relabel the card meta "blocks" → "messages"; wrap the time in `<time
  datetime={updatedAt}>` and reveal the absolute timestamp on tap — `pages/home/card-session.svelte`.
  Proof: `card-session.svelte.test.ts`.
- [~] **T2.2** (rec 1.8) Apply the `decayedLook` dimmed/idle presentation — SUPERSEDED by T2.10
  (20-min stale-unknown look, never idle).
- [x] **T2.3** (rec 1.7) Drop the resting-done glyph on idle cards (omit `SessionStateIcon` when
  presented status is idle) — `pages/home/card-session.svelte`. Proof: `card-session.svelte.test.ts`
  no `✓` on Settled.
- [~] **T2.4** (rec 2.5 chrome) Peek accordion chrome — SUPERSEDED by T2.11 (always-inline row; no
  accordion shipped).
- [x] **T2.5** (rec 1.6) Render the needs-you attention badge through the field gate: badge `done |
  blocked | waiting` only when host `attention` is present AND `status !== 'running'` —
  `card-projection.ts` / `card-session.svelte`. Proof: both-ways + never-badge-running tests.
- [x] **T2.6** (recs 2.2, 2.3) Render human title / last-message preview / agent chip through the
  field gate; `compactId(id)` stays the fallback title — `card-projection.ts` / `card-session.svelte`.
  Proof: both-ways + no-client-sliced-title tests.
- [x] **T2.7** (rec 2.4) Apply hide-empty ONLY when a host `resumable`/`queuedMessageCount` field is
  present; otherwise keep zero-turn sessions visible — `shouldRenderCard`. Proof: `card-projection.test.ts`.
- [x] **T2.8** (rec 2.5 body) Host `previewMessages[]` / `lastMessagePreview` render inline when
  present; never synthesized from a client cache. Accordion body not built (T2.11). Proof:
  `card-session.svelte.test.ts` inline detail, no `details`/`aria-expanded`.
- [x] **T2.9** (rec 2.6) Title-is-a-projection policy note written in `implementation-summary.md`;
  card-content bundle already logged in `007-host-requests` (this phase did not re-request).
- [x] **T2.10** (recs ND-1.6, ND-2.1) Apply the 20-minute stale/unknown *look* to a running card via
  `updatedAt`; never write `status` — `card-session.svelte` `data-stale` + `presentedStatus`. Proof:
  `card-session.svelte.test.ts` host status stays `running`. SUPERSEDES T2.2.
- [x] **T2.11** (rec ND-3.8) Render the enriched detail row ALWAYS-INLINE; reserve tap for Open; no
  peek-accordion — `card-session.svelte`. Proof: `card-session.svelte.test.ts`. SUPERSEDES T2.4/T2.8 chrome.
- [x] **T2.12** (rec ND-3.9) Render a stable hue mark from `hueFromId(id)` — `card-session.svelte`.
  Proof: `card-session.svelte.test.ts` `data-hue` matches helper, style omits the id.
- [x] **T2.13** (rec ND-3.7) Dot a card whose DTO `updatedAt` is newer than persisted
  `lastSeenUpdatedAt`; clear on open; fail-closed to no dot when the store is unreadable —
  `seen-marker.ts` + Home `handleOpen`. Proof: `seen-marker.test.ts`, `card-session.svelte.test.ts`,
  `screen-home.svelte.test.ts` persist-on-open.
- [x] **T2.14** (recs ND-1.7, ND-3.6) Keep two orthogonal card channels: live-STATE badge stays
  separate from the seen-dot; never badge a running session as unread — `card-session.svelte`
  `data-unread` suppressed when `status === 'running'`. Proof: `card-session.svelte.test.ts`.
- [x] **T2.15** (rec ND-3.1) Context-window fill meter through the field gate — only when host
  `contextPercent` is present. Proof: `card-session.svelte.test.ts` both-ways.
- [x] **T2.16** (rec ND-3.2) Live activity line through the field gate — only when host `activity`(+`tool`)
  is present. Proof: `card-session.svelte.test.ts` both-ways.
- [x] **T2.17** (rec ND-3.3) "You:" turn-opening line through the field gate — only when host `prompt`
  is present. Proof: `card-session.svelte.test.ts` both-ways.
- [x] **T2.18** (rec ND-3.5) `model` chip inside the context meter, bundled on the same usage payload;
  never a literal agent-name fallback. Proof: `card-projection.test.ts` model omitted without meter.
- [x] **T2.19** (recs ND-3.4, ND-3.10) Title-is-a-projection note extended; client-authored
  labels/priority/assignee recorded as a backlog exclusion in `implementation-summary.md`. Not built.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** 20-min stale/unknown boundary (no `status` write) and relabel/datetime render
  ("messages" · `<time datetime>` = `updatedAt` · absolute-on-tap). Proof: `card-projection.test.ts`,
  `card-session.svelte.test.ts`.
- [x] **T3.2** Optional-field gate both-ways plus never-badge-running and no-client-sliced-title.
  Proof: `card-projection.test.ts`, `card-session.svelte.test.ts`.
- [x] **T3.3** `token-identity` 0-diff (light/dark/system) vs HEAD card corpus; `test:web` from the
  final state: svelte 72 files / 577 passed + 3 skipped; logic 29 files / 308 passed.
- [x] **T3.4** a11y-parity: live badge labelled, seen-dot `role="img"` + aria-label, meter labelled,
  `<time datetime>` preserved; ⚠️ fields already in `007-host-requests` (not re-requested).
- [x] **T3.5** 20-minute stale/unknown decay, `hueFromId` determinism, seen-dot newer/`updatedAt` +
  unreadable-store fail-closed. Proof: listed tests above.
- [x] **T3.6** Optional-field gate both-ways for `contextPercent` / `activity`+`tool` / `prompt` /
  `model`. Proof: `card-projection.test.ts`, `card-session.svelte.test.ts`.
- [x] **T3.7** Detail row always-inline (no accordion); live badge orthogonal to seen-dot; running
  never unread-badged; token-identity 0/0/0; `test:web` green.
- [x] **T3.8** Folded ND ⚠️ fields already logged in `007-host-requests`; ND-3.4/3.5 reinforce-not-re-request;
  ND-3.10 backlog exclusion in `implementation-summary.md`. This phase did not edit `007-host-requests`.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The ✅ set landed: the card reads "messages" with a real `<time datetime>` and absolute-on-tap, a stale
running card shows an unknown look via `updatedAt` without a `status` write, the resting-done glyph is
gone on idle cards, and the detail row is always-inline with a single tap for Open — token-identity
0-diff, `test:web` green, a11y-parity from the final state. The ⚠️ bundle is wired behind the
optional-field gate, degrades to today's card, and stays inert until the host publishes the keys; no
`running` session is ever badged and no client-sliced title is ever shown.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the ✅ presentation set and the optional-field gate for the ⚠️ bundle.
- `checklist.md` — barrier sign-off.
- `../../research/research.md` — recs 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6.
- `../../007-host-requests/` — the card-content bundle and the Inbox-`sessionId` question.
<!-- /ANCHOR:cross-refs -->
