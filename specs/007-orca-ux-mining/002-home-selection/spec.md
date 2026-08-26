---
title: "Home session-selection UX — orca-mined recency, organization, and card-polish recommendations"
description: "Nested phase parent for the biggest-leverage orca-mining area: the home session list. Groups the 15 home-selection recommendations from research/research.md into three verification-distinct sub-phases — 001-list-behavior (recency-sort, pull-to-refresh, four-kind list states, resume slot, single-flight open, haptics; all ✅ drop-in), 002-list-organization (time-bucket sections, status filter chips, search-box chrome, device-local favorite, new-session chrome; ✅ chrome with the useful-query and create paths deferred to the host), and 003-card-polish (relabel blocks→messages, real datetime + absolute-on-tap, stale-decay, drop resting-done dot, peek accordion, plus the ⚠️ card-content bundle — title/preview/agent/attention/recoverable — that needs new host fields). Every affordance stays host-authoritative and fail-closed; nothing implements until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Home-selection area scoped into three planned sub-phases; docs authored."
    next_safe_action: "Implement 001 (all ✅) first; 002/003 ⚠️ items wait on 007-host-requests."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Home session-selection UX — phase parent

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Research: [`../research/research.md`](../research/research.md) · Prev: `001-tested-seams` · Next: `003-chat-message`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-ux-mining` |
| Mode | Phase parent (nested) |
| Children | `001-list-behavior`, `002-list-organization`, `003-card-polish` |
| Status | Planning (no implementation until the operator says "go") |
| Source of truth | `../research/research.md` Angle 1 (recs 1.1–1.14) + Angle 2 (recs 2.1–2.6) |
| Constraint | Host-authoritative, fail-closed — the client owns no editable session metadata |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The home surface (`app-mobile/src/pages/home/screen-home.svelte`) is a thin flat grid of session cards
keyed on the opaque `id`, with a coarse relative time and a "blocks" count. The verified orca synthesis
(`../research/research.md`) names the home session list as the single biggest-leverage area — 15 distinct
recommendations that turn a flat grid into a triaged, refresh-able, self-describing list.

The 15 recommendations split three ways against THE CONSTRAINT and, more usefully for sequencing, split
three ways by **verification surface and host-dependency**:

- **`001-list-behavior`** — the interaction and state machine: recency-sort, pull-to-refresh with
  keep-last-good, the four-kind list state machine, the reserved resume slot, single-flight Open, and the
  haptics taxonomy. Every item reads existing `SessionCardDto` fields (`status`, `updatedAt`,
  `messageCount`) or is pure interaction; the whole sub-phase is ✅ drop-in and blocked on nothing.
- **`002-list-organization`** — the sectioning and filtering chrome: time-bucket sections, status filter
  chips, the search-box chrome with two empty states, the device-local favorite, and the "New session"
  chrome. The chrome is ✅; the two paths that need the host — a *useful* search query (over `title`/
  `preview`) and the actual session-create RPC — are deferred to `007-host-requests` and fail closed.
- **`003-card-polish`** — the per-card presentation and content: relabel "blocks"→"messages", a real ISO
  datetime + absolute-time-on-tap, stale-decay-to-idle, dropping the resting-done dot, and the
  peek-before-open accordion (all ✅), plus the ⚠️ **card-content bundle** — human title, last-message
  preview, agent chip, needs-you attention badge, and recoverable-empty preservation — that needs new
  host-published read-only fields and is planned UI-plus-fallback here, requested there.

Each concern is a separate sub-phase because each has a different verification surface (interaction tests
vs. `token-identity`/`test:web` for the card chrome vs. an a11y-parity check for the badge/accordion AT
tree) and a different host-dependency profile, which is why they are sequenced rather than shipped as one
diff. 001 ships first (nothing blocks it); 003's ⚠️ items ship the moment `007-host-requests` lands.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope | Recs | Level |
|---|---|---|---|---|
| 1 | `001-list-behavior` | Recency-sort by `updatedAt`; pull-to-refresh keeping the last-good snapshot on failure; the four-kind list state machine (loading · error+retry · host-too-old · ready) that keeps old data on refetch; the reserved resume slot (cache-filled, inert until live); single-flight Open; the haptics taxonomy. All ✅ drop-in; blocked on nothing. | 1.1, 1.2, 1.9, 1.10, 1.11, 1.12 | 2 |
| 2 | `002-list-organization` | Time-bucket sections with counts (Active/Today/Yesterday/Older) from `updatedAt`; status filter chips over existing `status`; the search-box chrome with two distinct empty states; the device-local favorite as pure view-state; the "New session" chrome disabled-until-live. ✅ chrome; the useful-query and create-RPC paths are ⚠️ and deferred. | 1.3, 1.4, 1.5, 1.13, 1.14 | 2 |
| 3 | `003-card-polish` | Relabel "blocks"→"messages" + ISO `datetime` + absolute-on-tap; stale-decay-to-idle after 30 min via `updatedAt` (never writing status); drop the resting-done dot; the peek-before-open accordion chrome (all ✅), plus the ⚠️ card-content bundle: needs-you attention badge, human title, last-message preview, agent chip, recoverable-empty preservation, and the title-is-a-projection policy note. | 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | 2 |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every sub-phase:

- **Fail-closed, host-authoritative.** No sub-phase makes the client own or edit session truth. A ✅ task
  reads existing `SessionCardDto` fields (`id`, `status`, `updatedAt`, `messageCount`) or is pure
  interaction/layout. A ⚠️ task reads a NEW host-published read-only field — never invented on the client —
  and is requested in `007-host-requests` with a fail-closed fallback that keeps the affordance absent or
  inert until the field lands. Stale/unknown/mismatched data stays visibly unresolved, never promoted to
  success.
- **Never write `status`.** Stale-decay and every presentation nuance derive a *look* from `updatedAt`;
  none of them flip `status` in a local store.
- **Never badge a running session as unread.** The attention badge (rec 1.6) is `blocked | waiting |
  done`, never `working`.
- **Traceability.** Every task traces to a numbered recommendation (1.1–1.14, 2.1–2.6) in
  `../research/research.md`.
- **No rendered-value regressions.** `token-identity` resolves 0-diff and `test:web` stays green from the
  final state of any sub-phase that touches CSS or behaviour; the a11y contract is preserved.
- **Comment hygiene.** No spec path or artifact id in any code comment.
- **Plan-only until "go".** These packets are a plan; no sub-phase implements code until the operator says so.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- `../spec.md` — the `007-orca-ux-mining` implementation phase parent.
- `../research/research.md` — the verified synthesis; Angle 1 and Angle 2 are the source for this area.
- `../007-host-requests/` — the host-protocol request spec that unblocks the ⚠️ items in `002` and `003`.
- `../../005-sveltekit-spa-migration/020-source-structure/` — the source/comment/CSS conventions any new code follows.
<!-- /ANCHOR:cross-refs -->
