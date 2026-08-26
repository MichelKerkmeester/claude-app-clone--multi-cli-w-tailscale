---
title: "Home list behaviour — recency-sort, pull-to-refresh, list states, resume slot, single-flight open, haptics"
description: "Plan the home session list's interaction and state machine from the verified orca synthesis: recency-sort the roster by updatedAt (1.1), pull-to-refresh that keeps the last-good snapshot on failure (1.2), a four-kind list state machine — loading · error+retry · host-too-old · ready — that keeps old data on refetch (1.9), a reserved resume slot filled from cache and inert until live (1.10), single-flight Open that disables every open while one launch is in flight (1.11), and the five-way haptics taxonomy (1.12). Every item reads existing SessionCardDto fields or is pure interaction — all ✅ drop-in, blocked on no host field. Behaviour-preserving where CSS is touched, proven by token-identity 0-diff, test:web green, and a11y-parity. Plan only."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned the six ✅ list-behaviour recs (1.1/1.2/1.9/1.10/1.11/1.12); no code."
    next_safe_action: "Implement recency-sort + pull-to-refresh + list states when the operator says go."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Siblings: `002-list-organization`, `003-card-polish`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says "go" |
| Recs | 1.1 recency-sort · 1.2 pull-to-refresh · 1.9 four-kind list states · 1.10 resume slot · 1.11 single-flight Open · 1.12 haptics |
| Host dependency | None — all six are ✅ drop-in |
| Barrier | list-order + keep-last-good + keep-old-on-refetch behaviour proven · single-flight proven · token-identity 0-diff · test:web green · a11y-parity preserved |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The home roster renders `sessions.items` in host order, flashes the empty state on any refetch, offers no
way to re-request the list, gives no reserved highlight for the last-opened session, lets a user fire
several Opens at once, and has no haptic feedback. The verified orca synthesis (Angle 1) closes exactly
these gaps with six recommendations that need nothing from the host: they read existing `SessionCardDto`
fields (`status`, `updatedAt`, `messageCount`) or are pure interaction.

This sub-phase plans that behaviour. It is the first to ship because nothing blocks it, and it establishes
the list surface the later sub-phases decorate. Where it touches the card CSS (the resume slot, the
skeleton state), the change stays behaviour-preserving and is proven by `token-identity` and `test:web`.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **1.1 Recency-sort.** Order `sessions.items` most-recent-first by `updatedAt` before render, as a pure
  sort over the existing DTO field. Touches `pages/home/screen-home.svelte` (the `{#each sessions.items}`)
  and, per the cross-cutting guardrail, a pure sort helper the phase can differential-test.
- **1.2 Pull-to-refresh, keep-last-good.** A pull gesture on the roster re-requests the host list; on
  failure the previous snapshot stays on screen and the existing Live/Stale readout
  (`pages/home/freshness.svelte`) flips to Stale. Never blank the list on a failed refresh.
- **1.9 Four-kind list state machine.** Model the roster as `loading | error+retry | host-too-old | ready`
  and keep the previous data visible while refetching. "host-too-old" (a capability/version gap) is a
  distinct state from "no sessions" — do not collapse the two. Extends `pages/home/empty-state.svelte`
  (which today only distinguishes loading vs. empty/error) and reads `sessions.phase`/`sessions.error`
  from `shared/state/state.ts` (`SessionListState`).
- **1.10 Reserved resume slot.** A last-opened highlight populated immediately from `cache`, rendered
  inert (non-actionable) until `connection === 'live'` — never hidden during reconnect. Reads the existing
  `cache` prop and `connection` phase already threaded into `pages/home/screen-home.svelte`.
- **1.11 Single-flight Open.** While one Open/select is in flight, disable every card's Open, show a
  spinner on the chosen row, and `stopPropagation` so the tap does not also toggle a future peek. Pure
  local interaction state around the existing `onSelect(session.id)` route; navigation still goes through
  the host.
- **1.12 Haptics taxonomy.** Five intents — selection (picker ticks) · success (open/refresh) · error
  (fail-closed) · edge-bump (overscroll) — behind a `navigator.vibrate` wrapper that no-ops when the API
  is absent. Pure interaction.

**Out of scope:** any host-field-dependent enrichment (title/preview/agent/attention → `003-card-polish`
and `007-host-requests`); time-bucket sectioning, filter chips, search, favorite, new-session chrome
(→ `002-list-organization`); any change that writes `status` or invents session truth; app-relay, the
protocol package, and every file outside `app-mobile/src/pages/home/**` and the cited `shared/**` helpers.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** (1.1) — The roster renders most-recent-first by `updatedAt`; the sort is a pure function
  over the existing DTO field and is differential-tested against a canonical sort. Ties break stably.
- **REQ-002** (1.2) — Pull-to-refresh re-requests the host list; on failure the last-good snapshot remains
  rendered and the freshness readout shows Stale. The list is never blanked by a failed refresh.
- **REQ-003** (1.9) — The roster distinguishes four states — `loading`, `error+retry`, `host-too-old`,
  `ready` — keeps previously loaded items visible during a refetch, and never shows "no sessions" when the
  cause is a failed or capability-gated request.
- **REQ-004** (1.10) — A reserved resume slot is filled from `cache` on first paint and stays visible but
  inert until `connection === 'live'`; it is not hidden during `connecting`/`reconnecting`.
- **REQ-005** (1.11) — Opening a session is single-flight: all Opens disable while one launch is in
  flight, the chosen row shows a spinner, and the tap does not propagate to any peek toggle.
- **REQ-006** (1.12) — Haptic feedback fires for selection, success, error, and edge-bump intents through
  a wrapper that degrades to a silent no-op where `navigator.vibrate` is unavailable (Safari/PWA).
- **REQ-007** — No requirement writes `status` or any session field; every read is of an existing
  `SessionCardDto` field or client-local interaction state. `token-identity` resolves 0-diff and
  `test:web` stays green from the final state; the a11y contract of the roster is preserved.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The roster is ordered most-recent-first by `updatedAt`, proven by a differential test of the sort helper.
2. A failed pull-to-refresh keeps the last-good snapshot and flips freshness to Stale; a refetch never
   flashes the empty state.
3. The four list states are distinct and observable, with `host-too-old` separated from `no sessions`.
4. The resume slot paints from cache and is inert until live; single-flight Open disables sibling Opens.
5. `token-identity` is 0-diff, `test:web` is green, and a11y-parity holds from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Refetch flashes empty.** The naïve fix (render the empty state whenever `items.length === 0`) blanks
  the list mid-refresh. Mitigation: the four-kind state machine gates the empty state on `ready` only and
  keeps prior items during `loading`.
- **`host-too-old` has no explicit signal.** The four-kind machine needs a capability/version marker to
  tell "host too old" from a generic error. If the relay exposes no such signal today, fail closed: fold
  the unknown case into `error+retry` rather than mislabel it "no sessions". A dedicated capability field,
  if wanted, is an `007-host-requests` item — not invented here.
- **`navigator.vibrate` is weak/absent on Safari-PWA.** The haptics wrapper must no-op silently, never
  throw; haptics are an enhancement, never a gate on any action.
- **Single-flight vs. a lost launch.** If a launch never resolves, the disabled state must time out or
  clear on navigation so the roster cannot wedge; the disable is presentation only and never blocks the
  host route.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Does the relay already publish a capability/protocol-version signal the `host-too-old` state can read?
  If not, `host-too-old` folds into `error+retry` until such a signal is requested (see Risks).
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the home-selection phase parent.
- `../../research/research.md` — the verified synthesis; recs 1.1, 1.2, 1.9, 1.10, 1.11, 1.12 (Angle 1).
- `plan.md`, `tasks.md`, `checklist.md` — the how, the ledger, and the barrier.
<!-- /ANCHOR:cross-refs -->
