---
title: "Home card polish implementation summary — IMPLEMENTED"
description: "Shipped the ✅ card presentation set (messages + datetime, 20-min stale-unknown look, dropped resting-done glyph, always-inline row, hue mark, seen-dot, two channels) and wired the ⚠️ card-content bundle behind an optional-field gate. Status Implemented."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "card polish implementation summary"
  - "card polish packet"
  - "implementation summary"
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
| Status | Implemented |
| Requirements planned | REQ-001 … REQ-009 |
| Host dependency | Partial — the ⚠️ card-content bundle is gated; it renders only when host keys are present |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Shipped the per-card presentation over existing `SessionCardDto` fields plus a device-local seen
clock. The card meta now reads "messages" with a real `<time datetime={updatedAt}>` and reveals that
absolute stamp on a tap of the time (the card tap still Opens). A `running` card whose `updatedAt` is
20 minutes old or older presents as unknown via `decideStalePresentation` without writing `status`.
Idle cards omit the resting-done checkmark. A stable hue mark comes from `hueFromId(id)`. A
changed-since-looked dot persists `lastSeenUpdatedAt` per session, dots when the DTO clock is newer,
and shows no dot when the store is unreadable. The live-state badge and the read-state glyph stay on
separate channels; a running session is never unread-badged.

The ⚠️ card-content bundle is wired behind one optional-field gate (`hasHostField` /
`Object.prototype.hasOwnProperty`): `attention`, `title`, `lastMessagePreview`, `agent`,
`contextPercent`, `activity`+`tool`, `prompt`, `model`, `resumable`/`queuedMessageCount`, and
`previewMessages[]`. An old host still renders today's card (`compactId` title, no meter, no "You:"
line, zero-turn sessions visible). A new host renders the enrichment inline — never an accordion.

**Title is a projection.** A redacted host `title` is a projection of the session's own name, not an
id, and is compatible with the opaque-id home rule. Raw `cwd` is not. `compactId(id)` stays the
fallback. The client never slices a title from `prompt`.

**Backlog exclusion.** Client-authored card metadata (labels / priority / due / assignee) was not
built. It is portable only as a device-local preference, never host truth.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Presentation lives in `pages/home/card-session.svelte` with per-id `$derived` selectors. Stale decay,
hue, and the optional-field projection sit in `shared/format/card-projection.ts`. Absolute time sits
beside `relativeTimeAt` in `view-helpers.ts`. Last-seen clocks sit in `shared/format/seen-marker.ts`;
Home stamps them on Open. Idle cards omit `SessionStateIcon` so the shared glyph mapping stays frozen.
Verification ran the 20-minute decay boundary test (no `status` write), the relabel/datetime render
test, the optional-field gate both-ways tests, never-badge-running and no-client-title tests,
`hueFromId` determinism, seen-dot fail-closed tests, `token-identity` (0-diff vs HEAD card corpus),
`test:web`, lint on the changed files, and an a11y-parity check — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**One optional-field gate, not scattered branches.** Every enrichment key is read only when it is an
own property. Wrong types fail closed to today's card. The ⚠️ bundle is correct on an old host and an
enriched host.

**Always-inline, not accordion.** nodeterm dropped expand-to-peek. A single tap Opens. Host preview /
activity / prompt / meter render in-flow when present, which sidesteps an empty accordion.

**Stale is unknown, not idle.** A silent `running` card decays to an unknown *look* at 20 minutes.
Writing `idle` would celebrate a lost agent as finished. `status` stays the host's word.

**Never badge running as needs-you or unread.** Attention and `data-unread` are suppressed while
`status === 'running'`. The seen-dot is a separate read-state glyph.

**Title is a host projection; compactId is the fallback.** Present non-empty `title` wins. Absent
`title` never falls through to `prompt`. Client-authored labels/priority/assignee stay excluded.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `decideStalePresentation` 20-min edge | Passed — stale-unknown; source `status` still `running` |
| Relabel / datetime render | Passed — "messages" · `<time datetime>` = `updatedAt` · absolute-on-tap |
| Optional-field gate (both ways) | Passed — absent → today's card; present → enriched |
| Never-badge-running / no-client-title | Passed — running + `attention` has no badge; `prompt` never becomes title |
| Token identity | Passed — 0/0/0 light/dark/system vs HEAD card corpus (`app.css` + home card/screen) |
| `test:web` | Passed — svelte 72 files / 577 passed + 3 skipped; logic 29 files / 308 passed |
| `typecheck` | Passed — 0 errors (`svelte-check` COMPLETED 1134 FILES 0 ERRORS) |
| scoped lint | Passed — eslint on the files this phase changed exits 0 |
| a11y-parity | Passed — labelled live badge, seen-dot name, labelled meter, `<time datetime>` |
| hueFromId + seen-dot | Passed — deterministic hue; newer `updatedAt` → dot; unreadable store ⇒ no dot |
| Always-inline + two channels | Passed — no accordion; running never `data-unread` |
| `validate.sh --strict` | Passed — exit 0 from realpath; `description.json` / `graph-metadata.json` left unedited |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The ⚠️ card-content bundle stays inert until the host publishes the keys (`attention`, `title`,
`lastMessagePreview`, `agent`, `contextPercent`, `activity`+`tool`, `prompt`, `model`,
`resumable`/`queuedMessageCount`, `previewMessages[]`). Those fields are already requested in
`007-host-requests`; this phase did not re-request them and did not invent them. Client-authored
labels/priority/due/assignee remain a backlog exclusion. The shared session-state-icon mapping is
unchanged; idle home cards omit the icon instead of editing the frozen glyph fence.
<!-- /ANCHOR:limitations -->
