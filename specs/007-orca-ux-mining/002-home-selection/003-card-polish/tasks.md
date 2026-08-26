---
title: "Home card polish tasks — ✅ presentation set + ⚠️ card-content bundle behind a field gate, planned open"
description: "Open task ledger for card polish: relabel + datetime (2.1), stale-decay (1.8), drop resting-done dot (1.7), accordion chrome (2.5) as ✅; and the ⚠️ bundle — attention badge (1.6), title/preview/agent (2.2/2.3), recoverable-empty (2.4), accordion body (2.5) — behind an optional-field gate, plus the title-is-a-projection policy note (2.6). Every task open, each citing its rec number and the real app file it will touch. Host fields logged to 007-host-requests, never invented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/003-card-polish"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the open task ledger for the nine card-polish recs; nothing built."
    next_safe_action: "Start T1.1 (decayedLook helper + boundary test) when the operator says go."
    blockers:
      - "T2.5–T2.8 (attention/title/preview/agent/recoverable/accordion-body) wait on host fields in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home card polish tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is OPEN — this is a plan;
nothing is implemented until the operator says "go". Each task cites its rec number and the file it touches.
The ⚠️ tasks are marked host-blocked: their enrichment renders only when the host field is present.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** (rec 1.8) Add a pure `decayedLook(status, updatedAt, now)` returning a dimmed/idle
  presentation flag when `status === 'running'` and `now − updatedAt > 30 min`, with a boundary test at the
  30-minute edge proving it never emits a `status` — new pure helper beside `shared/format/view-helpers.ts`.
- [ ] **T1.2** (rec 2.1) Add a datetime/absolute-time helper (ISO `datetime` + absolute-on-tap string)
  beside `relativeTime` — `shared/format/view-helpers.ts`.
- [ ] **T1.3** (recs 1.6, 2.2, 2.3, 2.4, 2.5-body) Define the optional-field card projection — every
  enrichment field (`attention`, `title`, `lastMessagePreview`, `agent`, `resumable`/`queuedMessageCount`,
  `previewMessages[]`) typed optional — with both-ways render tests (absent → today's card, present →
  enriched). Capture the `token-identity`/`test:web` baselines.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** (rec 2.1) Relabel the card meta "blocks" → "messages"; wrap the time in `<time
  datetime={updatedAt}>` and reveal the absolute timestamp on tap — `pages/home/screen-home.svelte`.
- [ ] **T2.2** (rec 1.8) Apply the `decayedLook` dimmed/idle presentation to a stale running card, paired
  with the existing freshness readout; never write `status` — `pages/home/screen-home.svelte`.
- [ ] **T2.3** (rec 1.7) Drop the resting-done glyph, reserving a live glyph for genuine attention —
  `pages/home/screen-home.svelte` / `shared/chrome/session-state-icon.svelte`.
- [ ] **T2.4** (rec 2.5 chrome) Add the peek accordion chrome: expand-in-place, separate Open control,
  `stopPropagation` so peek does not navigate — `pages/home/screen-home.svelte`.
- [ ] **T2.5** (rec 1.6) Render the needs-you attention badge through the field gate: badge `done | blocked
  | waiting` only when a host `attention` value is present AND `status !== 'running'`; no badge otherwise —
  `pages/home/screen-home.svelte`.  [host-blocked: needs a host `attention` field; the Inbox `AttentionItemDto`
  keys on `lookupId`, not `sessionId`, so the join is not free — requested in `007-host-requests`]
- [ ] **T2.6** (recs 2.2, 2.3) Render the human title / last-message preview / agent chip through the field
  gate; keep the compacted `id` as the fallback title and never client-slice a title —
  `pages/home/screen-home.svelte`.  [host-blocked: needs host `title`/`lastMessagePreview`/`agent` — requested
  in `007-host-requests`]
- [ ] **T2.7** (rec 2.4) Apply hide-empty ONLY when a host `resumable`/`queuedMessageCount` field is
  present; otherwise keep zero-turn sessions visible — `pages/home/screen-home.svelte`.  [host-blocked:
  needs the host field; hiding `messageCount === 0` today is lossy — requested in `007-host-requests`]
- [ ] **T2.8** (rec 2.5 body) Render the accordion body from host `previewMessages[]` when present;
  otherwise leave it inert/empty and never synthesize previews from a client cache —
  `pages/home/screen-home.svelte`.  [host-blocked: needs host `previewMessages[]` — requested in `007-host-requests`]
- [ ] **T2.9** (rec 2.6) Write the title-is-a-projection policy note (redacted host `title` is a projection,
  not an id; raw `cwd` is not) and log the full card-content bundle to `007-host-requests`.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Run the `decayedLook` boundary test (30-min edge; no `status` write) and the relabel/datetime
  render test ("messages" · valid `<time datetime>` = `updatedAt` · absolute-on-tap).
- [ ] **T3.2** Run the optional-field gate both-ways tests (each enrichment absent → today's card; present →
  enriched) and the explicit never-badge-running and no-client-sliced-title tests.
- [ ] **T3.3** Run `token-identity` (0-diff across light/dark/system) for the card CSS and `test:web` from
  the final state.
- [ ] **T3.4** Run the a11y-parity check (badge as labelled status, accordion as an expandable region,
  `<time>` semantics preserved) and confirm every ⚠️ item is logged in `007-host-requests` with its
  fail-closed fallback.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The ✅ set lands: the card reads "messages" with a real `<time datetime>` and absolute-on-tap, a stale
running card dims via `updatedAt` without a `status` write, the resting-done dot is gone, and the peek
accordion chrome expands with a separate Open — with token-identity 0-diff, `test:web` green, and a11y-parity
from the final state. The ⚠️ bundle (1.6, 2.2, 2.3, 2.4, 2.5-body) is wired behind the optional-field gate,
degrades to today's card, and is logged to `007-host-requests`; no `running` session is ever badged and no
client-sliced title is ever shown.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the ✅ presentation set and the optional-field gate for the ⚠️ bundle.
- `checklist.md` — barrier sign-off.
- `../../research/research.md` — recs 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6.
- `../../007-host-requests/` — the card-content bundle and the Inbox-`sessionId` question.
<!-- /ANCHOR:cross-refs -->
