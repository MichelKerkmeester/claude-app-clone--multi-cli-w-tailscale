---
title: "Home list organization checklist — barrier for the sectioning/filter/search/favorite/new-session chrome"
description: "Barrier sign-off for time buckets, status chips, search chrome + two empty states, device-local favorite, and new-session chrome: fail-closed (no client create, no invented title, favorite unreadable-store fails closed), composed-pipeline differential tests, token-identity 0-diff, test:web green, and a11y-parity."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T18:40:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Marked barriers against the implemented list-organization chrome"
    next_safe_action: "None — phase implemented; sibling card-polish can decorate the cards"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. The authoritative proofs
are the composed-pipeline differential/boundary tests (bucket × filter × favorite), the fail-closed favorite
test, the two-empty-state and inert-create tests, `token-identity` for the new chrome CSS, `test:web`, and
an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
  Evidence: `/tmp/ti-list-org-baseline.json` 65 resolved / theme, unresolved 0, taken before `.svelte`
  edits; starting `test:web` svelte 70 / 553 + 3 skipped, logic 27 / 270.
- [x] **CHK-PRE-02** [P0] The `organize(...)` pipeline has a canonical reference implementation to
  differential-test against before it is wired into the roster.
  Evidence: `canonicalOrganize` in `session-list-seams.test.ts` matches `organize` on filter × favorite.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Buckets, filter, and favorite are one composed pure function over the immutable
  snapshot (the cross-cutting guardrail), not inline `.svelte` render logic.
  Evidence: `organize` / `filterRoster` / `buildTimeList` / `floatFavorites` in `session-list-seams.ts`;
  Home calls them from `$derived`.
- [x] **CHK-CQ-02** [P0] No rec reads a field absent from `SessionCardDto`; buckets read `updatedAt`/
  `status`, the filter reads `status`, the favorite is a client preference. No `status` is written.
  Evidence: `sessionTimeBucket` reads `status` + `updatedAt` only; favorite helper stores ids in
  `localStorage`; no `status` assignment in the phase diff.
- [x] **CHK-CQ-03** [P0] The search input matches only client-held data; no client-side `title`/`preview`
  is synthesized. The useful query is gated on a host field requested in `007-host-requests`.
  Evidence: `matchesClientHeldQuery` uses `id`, `compactId`, optional device-local labels; organize test
  rejects a synthesized title string.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] The composed pipeline is differential-tested vs. canonical and boundary-tested
  (empty · one · all-filtered · favorite-in-section) with no double-count or lost float.
  Evidence: `session-list-seams.test.ts` organize suite.
- [x] **CHK-TEST-02** [P0] The two search empty states are distinguished ("no sessions match" vs. "no
  sessions here").
  Evidence: `empty-state.svelte.test.ts` + `screen-home.svelte.test.ts`.
- [x] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for the new chrome,
  and `test:web` passes from the final state.
  Evidence: token-identity 0/0/0 light/dark/system vs `/tmp/ti-list-org-baseline.json`; `test:web` svelte
  71 / 563 + 3 skipped, logic 28 / 288.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] The device-local favorite fails closed: an unreadable preference store surfaces
  "favorites unavailable", never a silent host-order default; the favorite is never treated as session truth.
  Evidence: `favorite-preference.test.ts`; Home shows "Favorites unavailable" and disables Pin.
- [x] **CHK-FIX-02** [P0] The "New session" control is inert-until-live and never calls a client-owned
  create; the session-create RPC dependency is logged in `007-host-requests`.
  Evidence: `screen-home.svelte.test.ts` disabled while connecting, live click does not call `onSelect`;
  `007-host-requests/spec.md` already notes the create RPC as a related ⚠️ item.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed: no client-owned create, no invented title/preview, no `status`
  write; the ⚠️ paths stay inert until the host ships.
  Evidence: `handleNewSession` is a no-op; search matches client-held data only; no `status` writes.
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**` + the cited `shared/**` helpers (and their tests) changes.
  Evidence: phase diff is home + `view-helpers.ts` + `favorite-preference.ts` + tests + this packet's docs.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
  Evidence: run at closeout via realpath of this packet.
- [x] **CHK-DOC-02** [P1] The two host dependencies (useful search field, session-create RPC) are recorded
  in `007-host-requests` with the UI they unlock and the fail-closed fallback; no spec path or artifact id
  is introduced into any code comment.
  Evidence: title / `lastMessagePreview` already requested there; create noted as related ⚠️; code comments
  carry durable WHY only.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The bucket helper sits in `shared/format/view-helpers.ts` next to `relativeTime`;
  the favorite preference helper follows the existing `shared/state/` preference pattern.
  Evidence: `timeBucket` in `view-helpers.ts`; `favorite-preference.ts` beside `unread-overlay.ts`.
- [x] **CHK-ORG-02** [P2] The chrome's a11y contract (chip group, labelled search input, section headings)
  is preserved — proven by the a11y-parity check.
  Evidence: `role="group"` Status filter; labelled searchbox; `h3` time/status headings with
  `aria-labelledby` in `screen-home.svelte.test.ts`.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Implemented. The ✅ chrome (recs 1.3, 1.4, 1.14, and the 1.5/1.13 chrome) closes with the composed-pipeline
differential tests, the fail-closed favorite and two-empty-state tests, the inert-create test,
`token-identity` at 0-diff, `test:web` green (svelte 71 / 563 + 3 skipped; logic 28 / 288), and a11y-parity
from the final state. The 1.5 useful query and 1.13 create stay host-blocked and fail-closed.
<!-- /ANCHOR:summary -->
